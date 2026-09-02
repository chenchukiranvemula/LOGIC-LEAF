// ============================================================
// LOGIC-LEAF
// Complete Cloudflare Worker
// Chat + Memory + Vision + Files + Image + PDF + Search
// History + Firebase Auth + API Keys
// ============================================================

const APP_NAME = "LOGIC-LEAF";

const CHAT_MODEL =
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const VISION_MODEL =
  "@cf/meta/llama-3.2-11b-vision-instruct";

const IMAGE_MODEL =
  "@cf/black-forest-labs/flux-1-schnell";

const SEARCH_INSTANCE =
  "logic-leaf-search";


// ============================================================
// MAIN WORKER
// ============================================================

export default {
  async fetch(request, env) {

    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods":
        "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors
      });
    }

    const url = new URL(request.url);

    try {

      // ======================================================
      // HEALTH
      // ======================================================

      if (
        url.pathname === "/" ||
        url.pathname === "/health"
      ) {
        return json({
          ok: true,
          name: APP_NAME,
          status: "online",

          ai: !!env.AI,
          database: !!env.DB,
          kv: !!env.QTM_KEYS,
          ai_search: !!env.AI_SEARCH,

          endpoints: {
            chat: "/v1/chat",
            vision: "/v1/vision",
            file: "/v1/file",
            image: "/v1/image",
            pdf: "/v1/pdf",
            search: "/v1/search",
            history: "/v1/history",
            conversation: "/v1/conversation",
            createKey: "/v1/keys/create",
            revokeKey: "/v1/keys/revoke",
            apiChat: "/v1/api/chat"
          }
        }, cors);
      }


      // ======================================================
      // SEARCH
      // ======================================================

      if (
        url.pathname === "/v1/search" &&
        request.method === "POST"
      ) {

        if (!env.AI_SEARCH) {
          return json({
            ok: false,
            error: "AI Search binding is not configured"
          }, cors, 500);
        }

        const body = await safeJSON(request);

        const query = String(
          body.query ||
          body.message ||
          ""
        ).trim();

        if (!query) {
          return json({
            ok: false,
            error: "Search query required"
          }, cors, 400);
        }

        const result =
          await performSearch(env, query);

        return json({
          ok: true,
          query,
          count: result.sources.length,
          results: result.sources
        }, cors);
      }


      // ======================================================
      // CHAT
      // ======================================================

      if (
        url.pathname === "/v1/chat" &&
        request.method === "POST"
      ) {

        if (!env.AI) {
          return json({
            ok: false,
            error: "Workers AI binding is missing"
          }, cors, 500);
        }

        const body = await safeJSON(request);

        const message =
          String(body.message || "").trim();

        const userId =
          String(
            body.userId ||
            "anonymous"
          );

        const conversationId =
          String(
            body.conversationId ||
            crypto.randomUUID()
          );

        const searchEnabled =
          body.search === true ||
          body.useSearch === true;

        if (!message) {
          return json({
            ok: false,
            error: "Message required"
          }, cors, 400);
        }

        let sources = [];
        let searchContext = "";

        // ----------------------------------------------------
        // SEARCH
        // ----------------------------------------------------

        if (
          searchEnabled &&
          env.AI_SEARCH
        ) {
          try {

            const search =
              await performSearch(
                env,
                message
              );

            sources =
              search.sources;

            searchContext =
              sources
                .map(function (source) {
                  return (
                    "[Source " +
                    source.id +
                    "]\n" +
                    source.text
                  );
                })
                .join("\n\n");

          } catch (error) {

            console.error(
              "SEARCH ERROR",
              error
            );
          }
        }


        // ----------------------------------------------------
        // LOAD PREVIOUS CONVERSATION
        // ----------------------------------------------------

        let previousMessages = [];

        if (env.DB) {
          try {

            await ensureDatabase(env);

            const history =
              await env.DB.prepare(`
                SELECT role, content
                FROM messages
                WHERE conversation_id = ?
                AND user_id = ?
                ORDER BY id DESC
                LIMIT 20
              `)
                .bind(
                  conversationId,
                  userId
                )
                .all();

            previousMessages =
              (history.results || [])
                .reverse()
                .map(function (row) {
                  return {
                    role: row.role,
                    content: row.content
                  };
                });

          } catch (error) {

            console.error(
              "HISTORY LOAD ERROR",
              error
            );
          }
        }


        // ----------------------------------------------------
        // SYSTEM PROMPT
        // ----------------------------------------------------

        const systemPrompt =
          buildSystemPrompt(searchEnabled);


        // ----------------------------------------------------
        // USER CONTENT
        // ----------------------------------------------------

        let finalUserMessage = message;

        if (
          searchEnabled &&
          searchContext
        ) {
          finalUserMessage =
            "QUESTION:\n" +
            message +
            "\n\n" +
            "SEARCH RESULTS:\n" +
            searchContext +
            "\n\n" +
            "Use the search results when relevant.";
        }


        // ----------------------------------------------------
        // AI MESSAGES
        // ----------------------------------------------------

        const messages = [
          {
            role: "system",
            content: systemPrompt
          }
        ];

        for (
          let i = 0;
          i < previousMessages.length;
          i++
        ) {
          messages.push({
            role:
              previousMessages[i].role,
            content:
              previousMessages[i].content
          });
        }

        messages.push({
          role: "user",
          content: finalUserMessage
        });


        // ----------------------------------------------------
        // RUN AI
        // ----------------------------------------------------

        const result =
          await env.AI.run(
            CHAT_MODEL,
            {
              messages,
              max_tokens: 4096
            }
          );


        const answer =
          extractText(result) ||
          "I could not generate a response.";


        // ----------------------------------------------------
        // SAVE CHAT
        // ----------------------------------------------------

        if (env.DB) {

          try {

            await saveMessage(
              env,
              conversationId,
              userId,
              "user",
              message
            );

            await saveMessage(
              env,
              conversationId,
              userId,
              "assistant",
              answer
            );

          } catch (error) {

            console.error(
              "D1 SAVE ERROR",
              error
            );
          }
        }


        return json({
          ok: true,
          answer,
          conversationId,
          model: CHAT_MODEL,
          search_used:
            searchEnabled,
          sources
        }, cors);
      }


      // ======================================================
      // VISION
      // ======================================================

      if (
        url.pathname === "/v1/vision" &&
        request.method === "POST"
      ) {

        if (!env.AI) {
          return json({
            ok: false,
            error: "Workers AI binding is missing"
          }, cors, 500);
        }

        const body =
          await safeJSON(request);

        const image =
          String(
            body.image ||
            body.imageData ||
            body.fileData ||
            ""
          ).trim();

        const prompt =
          String(
            body.prompt ||
            "Describe and analyze this image carefully."
          ).trim();

        if (!image) {
          return json({
            ok: false,
            error:
              "Image data is required"
          }, cors, 400);
        }

        const result =
          await env.AI.run(
            VISION_MODEL,
            {
              messages: [
                {
                  role: "system",
                  content:
                    "You are LOGIC-LEAF vision assistant. Analyze images accurately. Do not invent details that cannot be seen."
                },
                {
                  role: "user",
                  content: prompt
                }
              ],
              image
            }
          );

        return json({
          ok: true,
          answer:
            extractText(result) ||
            "I could not analyze the image.",
          model: VISION_MODEL
        }, cors);
      }


      // ======================================================
      // FILE / TEXT QUESTIONS
      // ======================================================

      if (
        url.pathname === "/v1/file" &&
        request.method === "POST"
      ) {

        if (!env.AI) {
          return json({
            ok: false,
            error: "Workers AI binding is missing"
          }, cors, 500);
        }

        const body =
          await safeJSON(request);

        const fileName =
          String(
            body.fileName ||
            body.name ||
            "uploaded-file"
          );

        const text =
          String(
            body.text ||
            body.content ||
            body.fileText ||
            ""
          ).trim();

        const question =
          String(
            body.question ||
            body.prompt ||
            "Summarize and explain this file."
          ).trim();

        if (!text) {
          return json({
            ok: false,
            error:
              "File text is required. Extract the text in the browser and send it as 'text'."
          }, cors, 400);
        }

        const limitedText =
          text.slice(0, 90000);

        const result =
          await env.AI.run(
            CHAT_MODEL,
            {
              messages: [
                {
                  role: "system",
                  content:
                    "You are LOGIC-LEAF file assistant. Answer questions using the supplied file content. Do not invent information that is not present in the file."
                },
                {
                  role: "user",
                  content:
                    "FILE NAME:\n" +
                    fileName +
                    "\n\n" +
                    "FILE CONTENT:\n" +
                    limitedText +
                    "\n\n" +
                    "QUESTION:\n" +
                    question
                }
              ],
              max_tokens: 4096
            }
          );

        return json({
          ok: true,
          fileName,
          answer:
            extractText(result) ||
            "I could not analyze the file.",
          model: CHAT_MODEL
        }, cors);
      }


      // ======================================================
      // IMAGE GENERATION
      // ======================================================

      if (
        url.pathname === "/v1/image" &&
        request.method === "POST"
      ) {

        if (!env.AI) {
          return json({
            ok: false,
            error: "Workers AI binding is missing"
          }, cors, 500);
        }

        const body =
          await safeJSON(request);

        const prompt =
          String(
            body.prompt || ""
          ).trim();

        if (!prompt) {
          return json({
            ok: false,
            error:
              "Image prompt required"
          }, cors, 400);
        }

        const result =
          await env.AI.run(
            IMAGE_MODEL,
            {
              prompt: prompt.slice(0, 2048),
              steps: 4,
              seed:
                Math.floor(
                  Math.random() *
                  2147483647
                )
            }
          );

        const image =
          result &&
          (
            result.image ||
            result.result?.image
          );

        if (!image) {
          return json({
            ok: false,
            error:
              "Image model returned no image"
          }, cors, 502);
        }

        return json({
          ok: true,
          image,
          dataURI:
            "data:image/jpeg;base64," +
            image,
          model: IMAGE_MODEL
        }, cors);
      }


      // ======================================================
      // PDF / DOCUMENT GENERATION
      // ======================================================

      if (
        url.pathname === "/v1/pdf" &&
        request.method === "POST"
      ) {

        if (!env.AI) {
          return json({
            ok: false,
            error: "Workers AI binding is missing"
          }, cors, 500);
        }

        const body =
          await safeJSON(request);

        const prompt =
          String(
            body.prompt ||
            body.message ||
            ""
          ).trim();

        const title =
          String(
            body.title ||
            "LOGIC-LEAF Document"
          ).trim();

        if (!prompt) {
          return json({
            ok: false,
            error:
              "PDF request required"
          }, cors, 400);
        }

        const result =
          await env.AI.run(
            CHAT_MODEL,
            {
              messages: [
                {
                  role: "system",
                  content:
                    "Create a professional printable document. Return ONLY the HTML body content. Do not use markdown fences. Do not include JavaScript. Use headings, paragraphs, lists and tables where appropriate."
                },
                {
                  role: "user",
                  content:
                    "TITLE:\n" +
                    title +
                    "\n\nREQUEST:\n" +
                    prompt
                }
              ],
              max_tokens: 4096
            }
          );

        let content =
          extractText(result);

        content =
          cleanHTML(content);

        const html =
          createDocumentHTML(
            title,
            content
          );

        return json({
          ok: true,
          title,
          html
        }, cors);
      }


      // ======================================================
      // CHAT HISTORY
      // ======================================================

      if (
        url.pathname === "/v1/history" &&
        request.method === "POST"
      ) {

        if (!env.DB) {
          return json({
            ok: false,
            error: "D1 binding is missing"
          }, cors, 500);
        }

        const body =
          await safeJSON(request);

        const userId =
          String(
            body.userId ||
            "anonymous"
          );

        await ensureDatabase(env);

        const result =
          await env.DB.prepare(`
            SELECT
              m.conversation_id,
              MAX(m.created_at) AS updated_at,
              (
                SELECT SUBSTR(x.content, 1, 80)
                FROM messages x
                WHERE
                  x.conversation_id =
                    m.conversation_id
                  AND x.user_id = ?
                  AND x.role = 'user'
                ORDER BY x.id ASC
                LIMIT 1
              ) AS title
            FROM messages m
            WHERE m.user_id = ?
            GROUP BY m.conversation_id
            ORDER BY updated_at DESC
            LIMIT 100
          `)
            .bind(
              userId,
              userId
            )
            .all();

        return json({
          ok: true,
          chats:
            result.results || []
        }, cors);
      }


      // ======================================================
      // GET CONVERSATION
      // ======================================================

      if (
        url.pathname === "/v1/conversation" &&
        request.method === "POST"
      ) {

        if (!env.DB) {
          return json({
            ok: false,
            error: "D1 binding is missing"
          }, cors, 500);
        }

        const body =
          await safeJSON(request);

        const conversationId =
          String(
            body.conversationId ||
            ""
          );

        const userId =
          String(
            body.userId ||
            "anonymous"
          );

        if (!conversationId) {
          return json({
            ok: false,
            error:
              "Conversation ID required"
          }, cors, 400);
        }

        await ensureDatabase(env);

        const result =
          await env.DB.prepare(`
            SELECT
              role,
              content,
              created_at
            FROM messages
            WHERE
              conversation_id = ?
              AND user_id = ?
            ORDER BY id ASC
          `)
            .bind(
              conversationId,
              userId
            )
            .all();

        return json({
          ok: true,
          messages:
            result.results || []
        }, cors);
      }


      // ======================================================
      // CREATE API KEY
      // ======================================================

      if (
        url.pathname === "/v1/keys/create" &&
        request.method === "POST"
      ) {

        const auth =
          await authenticateFirebase(
            request,
            env
          );

        if (!auth.ok) {
          return json({
            ok: false,
            error: auth.error
          }, cors, 401);
        }

        if (!env.QTM_KEYS) {
          return json({
            ok: false,
            error: "KV binding is missing"
          }, cors, 500);
        }

        const rawKey =
          "ll_live_" +
          randomToken(32);

        const hash =
          await sha256(rawKey);

        await env.QTM_KEYS.put(
          "apikey:" + hash,
          JSON.stringify({
            uid: auth.uid,
            createdAt:
              new Date().toISOString()
          })
        );

        return json({
          ok: true,
          apiKey: rawKey,
          warning:
            "Save this API key now. It will not be displayed again."
        }, cors);
      }


      // ======================================================
      // REVOKE API KEY
      // ======================================================

      if (
        url.pathname === "/v1/keys/revoke" &&
        request.method === "POST"
      ) {

        const auth =
          await authenticateFirebase(
            request,
            env
          );

        if (!auth.ok) {
          return json({
            ok: false,
            error: auth.error
          }, cors, 401);
        }

        if (!env.QTM_KEYS) {
          return json({
            ok: false,
            error: "KV binding is missing"
          }, cors, 500);
        }

        const body =
          await safeJSON(request);

        const apiKey =
          String(
            body.apiKey || ""
          ).trim();

        if (!apiKey) {
          return json({
            ok: false,
            error:
              "API key required"
          }, cors, 400);
        }

        const hash =
          await sha256(apiKey);

        const record =
          await env.QTM_KEYS.get(
            "apikey:" + hash,
            "json"
          );

        if (
          !record ||
          record.uid !== auth.uid
        ) {
          return json({
            ok: false,
            error:
              "API key not found"
          }, cors, 404);
        }

        await env.QTM_KEYS.delete(
          "apikey:" + hash
        );

        return json({
          ok: true
        }, cors);
      }


      // ======================================================
      // PUBLIC API CHAT
      // ======================================================

      if (
        url.pathname === "/v1/api/chat" &&
        request.method === "POST"
      ) {

        if (!env.AI) {
          return json({
            ok: false,
            error:
              "Workers AI binding is missing"
          }, cors, 500);
        }

        const auth =
          await authenticateApiKey(
            request,
            env
          );

        if (!auth.ok) {
          return json({
            ok: false,
            error: auth.error
          }, cors, 401);
        }

        const body =
          await safeJSON(request);

        const message =
          String(
            body.message || ""
          ).trim();

        if (!message) {
          return json({
            ok: false,
            error:
              "Message required"
          }, cors, 400);
        }

        const result =
          await env.AI.run(
            CHAT_MODEL,
            {
              messages: [
                {
                  role: "system",
                  content:
                    "You are LOGIC-LEAF API, a helpful general AI assistant."
                },
                {
                  role: "user",
                  content: message
                }
              ],
              max_tokens: 4096
            }
          );

        return json({
          ok: true,
          answer:
            extractText(result) || "",
          model: CHAT_MODEL
        }, cors);
      }


      // ======================================================
      // NOT FOUND
      // ======================================================

      return json({
        ok: false,
        error:
          "Endpoint not found",
        path: url.pathname
      }, cors, 404);

    } catch (error) {

      console.error(
        "LOGIC-LEAF WORKER ERROR",
        error
      );

      return json({
        ok: false,
        error:
          error?.message ||
          "Internal server error"
      }, cors, 500);
    }
  }
};


// ============================================================
// SYSTEM PROMPT
// ============================================================

function buildSystemPrompt(searchEnabled) {

  let prompt =
`You are LOGIC-LEAF, a highly capable general AI assistant.

Developer:
V.CHENCHUKIRAN

Your purpose is to help the user with:
- General questions
- Reasoning
- Mathematics
- Science
- Education
- Coding
- Debugging
- Programming
- Writing
- Technical subjects
- Projects
- Study assistance
- Explanations

Conversation behavior:
- Maintain context from earlier messages.
- Continue the user's topic naturally.
- Do not restart the conversation unnecessarily.
- If the user asks a follow-up question, understand what they are referring to.
- Give direct, useful answers.
- Do not pretend to know information that is unavailable.
- Do not claim to be ChatGPT, Gemini, Claude, or another company's assistant.
- You are LOGIC-LEAF.

Coding behavior:
- Use Markdown code blocks.
- Identify the programming language.
- Give complete usable code when requested.
- Keep explanations clear.

For factual questions:
- Prefer accurate information.
- If information is uncertain, say so.
`;

  if (searchEnabled) {
    prompt =
      prompt +
`
Search mode is enabled.
Use supplied search results when relevant.
Do not invent facts from search results.
If the search results are insufficient, clearly say that they are insufficient.
`;
  }

  return prompt;
}


// ============================================================
// AI SEARCH
// ============================================================

async function performSearch(env, query) {

  if (!env.AI_SEARCH) {
    throw new Error(
      "AI Search binding unavailable"
    );
  }

  const instance =
    env.AI_SEARCH.get(
      SEARCH_INSTANCE
    );

  const result =
    await instance.search({
      messages: [
        {
          role: "user",
          content: query
        }
      ]
    });

  const chunks =
    Array.isArray(result?.chunks)
      ? result.chunks
      : [];

  const sources =
    chunks.map(function (chunk, index) {

      return {
        id: index + 1,

        text:
          chunk.text ||
          chunk.content ||
          "",

        score:
          chunk.score ?? null,

        source:
          chunk.source ||
          chunk.filename ||
          chunk.file_name ||
          chunk.title ||
          "Indexed source",

        url:
          chunk.url ||
          null
      };
    });

  return {
    sources
  };
}


// ============================================================
// DATABASE
// ============================================================

async function ensureDatabase(env) {

  if (!env.DB) {
    return;
  }

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `).run();

  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS
    idx_messages_conversation
    ON messages(conversation_id)
  `).run();

  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS
    idx_messages_user
    ON messages(user_id)
  `).run();
}


async function saveMessage(
  env,
  conversationId,
  userId,
  role,
  content
) {

  await env.DB.prepare(`
    INSERT INTO messages
    (
      conversation_id,
      user_id,
      role,
      content,
      created_at
    )
    VALUES (?, ?, ?, ?, ?)
  `)
    .bind(
      conversationId,
      userId,
      role,
      content,
      new Date().toISOString()
    )
    .run();
}


// ============================================================
// FIREBASE AUTH
// ============================================================

async function authenticateFirebase(
  request,
  env
) {

  try {

    const header =
      request.headers.get(
        "Authorization"
      );

    if (!header) {
      return {
        ok: false,
        error: "Login required"
      };
    }

    const token =
      header
        .replace(
          /^Bearer\s+/i,
          ""
        )
        .trim();

    if (!token) {
      return {
        ok: false,
        error:
          "Invalid authentication token"
      };
    }

    if (!env.FIREBASE_WEB_API_KEY) {
      return {
        ok: false,
        error:
          "Firebase Web API key is not configured"
      };
    }

    const response =
      await fetch(
        "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" +
        encodeURIComponent(
          env.FIREBASE_WEB_API_KEY
        ),
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            idToken: token
          })
        }
      );

    if (!response.ok) {
      return {
        ok: false,
        error:
          "Firebase authentication failed"
      };
    }

    const data =
      await response.json();

    const user =
      data?.users?.[0];

    if (!user) {
      return {
        ok: false,
        error:
          "Firebase user not found"
      };
    }

    return {
      ok: true,
      uid:
        user.localId,
      email:
        user.email || ""
    };

  } catch (error) {

    console.error(
      "FIREBASE AUTH ERROR",
      error
    );

    return {
      ok: false,
      error:
        "Authentication verification failed"
    };
  }
}


// ============================================================
// API KEY AUTH
// ============================================================

async function authenticateApiKey(
  request,
  env
) {

  try {

    if (!env.QTM_KEYS) {
      return {
        ok: false,
        error:
          "KV binding is missing"
      };
    }

    const header =
      request.headers.get(
        "Authorization"
      );

    if (!header) {
      return {
        ok: false,
        error:
          "API key required"
      };
    }

    const key =
      header
        .replace(
          /^Bearer\s+/i,
          ""
        )
        .trim();

    if (
      !key.startsWith(
        "ll_live_"
      )
    ) {
      return {
        ok: false,
        error:
          "Invalid API key"
      };
    }

    const hash =
      await sha256(key);

    const record =
      await env.QTM_KEYS.get(
        "apikey:" + hash,
        "json"
      );

    if (!record) {
      return {
        ok: false,
        error:
          "Invalid or revoked API key"
      };
    }

    return {
      ok: true,
      uid:
        record.uid
    };

  } catch (error) {

    console.error(
      "API KEY ERROR",
      error
    );

    return {
      ok: false,
      error:
        "API authentication failed"
    };
  }
}


// ============================================================
// HELPERS
// ============================================================

async function safeJSON(request) {

  try {
    return await request.json();
  } catch {
    return {};
  }
}


function extractText(result) {

  if (!result) {
    return "";
  }

  if (
    typeof result === "string"
  ) {
    return result;
  }

  if (
    typeof result.response === "string"
  ) {
    return result.response;
  }

  if (
    typeof result.result?.response === "string"
  ) {
    return result.result.response;
  }

  if (
    typeof result.output_text === "string"
  ) {
    return result.output_text;
  }

  if (
    typeof result.result === "string"
  ) {
    return result.result;
  }

  return "";
}


function cleanHTML(text) {

  return String(text || "")
    .replace(
      /^```html\s*/i,
      ""
    )
    .replace(
      /^```\s*/i,
      ""
    )
    .replace(
      /\s*```$/i,
      ""
    )
    .trim();
}


function createDocumentHTML(
  title,
  content
) {

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${escapeHTML(title)}</title>

<style>

@page {
  size: A4;
  margin: 18mm;
}

body {
  font-family:
    Arial,
    Helvetica,
    sans-serif;

  color: #111;
  background: #fff;

  line-height: 1.6;
  font-size: 14px;
}

h1 {
  font-size: 28px;
  margin-bottom: 20px;
}

h2 {
  margin-top: 28px;
}

h3 {
  margin-top: 22px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
}

th,
td {
  border: 1px solid #999;
  padding: 8px;
  text-align: left;
}

.header {
  border-bottom: 2px solid #111;
  padding-bottom: 10px;
  margin-bottom: 24px;
}

.footer {
  border-top: 1px solid #aaa;
  margin-top: 40px;
  padding-top: 10px;
  font-size: 10px;
}

</style>
</head>

<body>

<div class="header">
<strong>LOGIC-LEAF</strong>
</div>

<h1>${escapeHTML(title)}</h1>

${content}

<div class="footer">
Created with LOGIC-LEAF
</div>

</body>
</html>`;
}


function escapeHTML(value) {

  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}


async function sha256(text) {

  const data =
    new TextEncoder()
      .encode(text);

  const hash =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  return Array
    .from(
      new Uint8Array(hash)
    )
    .map(function (byte) {
      return byte
        .toString(16)
        .padStart(2, "0");
    })
    .join("");
}


function randomToken(length) {

  const bytes =
    new Uint8Array(length);

  crypto.getRandomValues(
    bytes
  );

  return Array
    .from(bytes)
    .map(function (byte) {
      return byte
        .toString(16)
        .padStart(2, "0");
    })
    .join("");
}


function json(
  data,
  cors,
  status = 200
) {

  return new Response(
    JSON.stringify(data),
    {
      status,

      headers: {
        ...cors,

        "Content-Type":
          "application/json; charset=UTF-8"
      }
    }
  );
          }
