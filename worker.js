// ============================================================
// LOGIC-LEAF WORKER
// Chat + Vision + Image + PDF + Search + History + API Keys
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

const MAX_HISTORY = 30;

export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods":
        "GET,POST,OPTIONS",
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
          search: !!env.AI_SEARCH,

          endpoints: {
            chat: "/v1/chat",
            vision: "/v1/vision",
            image: "/v1/image",
            pdf: "/v1/pdf",
            search: "/v1/search",
            history: "/v1/history",
            conversation: "/v1/conversation",
            createKey: "/v1/keys/create",
            revokeKey: "/v1/keys/revoke",
            api: "/v1/api/chat"
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
        const body = await request.json();

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

        if (!env.AI_SEARCH) {
          return json({
            ok: false,
            error: "AI Search binding is missing"
          }, cors, 500);
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
          chunks.map((chunk, index) => ({
            id: index + 1,

            text:
              chunk.text ||
              chunk.content ||
              "",

            source:
              chunk.source ||
              chunk.filename ||
              chunk.file_name ||
              chunk.title ||
              "Indexed source",

            score:
              chunk.score ?? null,

            url:
              chunk.url || null
          }));

        return json({
          ok: true,
          query,
          count: sources.length,
          results: sources
        }, cors);
      }

      // ======================================================
      // CHAT
      // ======================================================

      if (
        url.pathname === "/v1/chat" &&
        request.method === "POST"
      ) {
        const body =
          await request.json();

        const message =
          String(
            body.message || ""
          ).trim();

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

        const clientHistory =
          Array.isArray(body.history)
            ? body.history
            : [];

        if (!message) {
          return json({
            ok: false,
            error: "Message required"
          }, cors, 400);
        }

        // ----------------------------------------------------
        // SEARCH
        // ----------------------------------------------------

        let sources = [];
        let searchContext = "";

        if (
          searchEnabled &&
          env.AI_SEARCH
        ) {
          try {
            const instance =
              env.AI_SEARCH.get(
                SEARCH_INSTANCE
              );

            const searchResult =
              await instance.search({
                messages: [
                  {
                    role: "user",
                    content: message
                  }
                ]
              });

            const chunks =
              Array.isArray(
                searchResult?.chunks
              )
                ? searchResult.chunks
                : [];

            sources =
              chunks.map(
                (chunk, index) => ({
                  id: index + 1,

                  text:
                    chunk.text ||
                    chunk.content ||
                    "",

                  source:
                    chunk.source ||
                    chunk.filename ||
                    chunk.file_name ||
                    chunk.title ||
                    "Indexed source",

                  score:
                    chunk.score ?? null,

                  url:
                    chunk.url || null
                })
              );

            searchContext =
              sources
                .map(
                  source =>
                    `[Source ${source.id}]
${source.text}`
                )
                .join("\n\n");

          } catch (error) {
            console.error(
              "SEARCH ERROR",
              error
            );
          }
        }

        // ----------------------------------------------------
        // SYSTEM PROMPT
        // IMPORTANT: LET, NOT CONST
        // ----------------------------------------------------

        let systemPrompt = `
You are LOGIC-LEAF.

You are a general-purpose AI assistant.

Developer:
V.CHENCHUKIRAN
CLOUD SECURITY

Your job is to provide useful, accurate,
clear and context-aware answers.

You can help with:

- General questions
- Reasoning
- Mathematics
- Science
- Education
- Programming
- Coding
- Debugging
- Web development
- Project development
- Writing
- Summaries
- Study assistance
- Technical explanations
- Creative ideas

CONVERSATION RULES:

1. Remember the conversation context supplied
   in the messages.

2. If the user continues a topic, continue that
   topic instead of starting a completely new answer.

3. Do not unnecessarily assume that the user is
   asking about another country.

4. When the user's location or country matters
   and is not known, explain the assumption or
   ask when necessary.

5. Answer the actual question first.

6. Do not claim to be ChatGPT, Gemini, Claude,
   or another company's assistant.

7. You are LOGIC-LEAF.

CODING:

When providing code:
- Use Markdown code blocks.
- Identify the language.
- Give complete usable code when appropriate.
- Do not intentionally leave required sections
  unfinished.

STYLE:

Be natural, helpful and concise unless the user
asks for detailed information.
`;

        if (searchEnabled) {
          systemPrompt += `

SEARCH MODE:

Search results are provided below.

Use them when they are relevant.
Do not invent facts from them.
If the sources do not contain enough information,
say that clearly.

SEARCH RESULTS:
${searchContext || "No useful indexed results found."}
`;
        }

        // ----------------------------------------------------
        // CONVERSATION CONTEXT
        // ----------------------------------------------------

        const cleanHistory =
          clientHistory
            .filter(
              item =>
                item &&
                (item.role === "user" ||
                 item.role === "assistant") &&
                typeof item.content === "string"
            )
            .slice(-MAX_HISTORY);

        const messages = [
          {
            role: "system",
            content: systemPrompt
          }
        ];

        for (
          const item of cleanHistory
        ) {
          messages.push({
            role: item.role,
            content: item.content
          });
        }

        messages.push({
          role: "user",
          content: message
        });

        // ----------------------------------------------------
        // AI
        // ----------------------------------------------------

        const result =
          await env.AI.run(
            CHAT_MODEL,
            {
              messages,
              max_tokens: 4096
            },
            {
              gateway: {
                id: "default",
                skipCache: false,
                collectLog: true
              }
            }
          );

        const answer =
          result?.response ||
          result?.result?.response ||
          "I could not generate a response.";

        // ----------------------------------------------------
        // D1 HISTORY
        // ----------------------------------------------------

        if (env.DB) {
          try {
            await ensureDatabase(env);

            const now =
              new Date().toISOString();

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
                "user",
                message,
                now
              )
              .run();

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
                "assistant",
                answer,
                new Date().toISOString()
              )
              .run();

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

          search_used:
            searchEnabled,

          sources,

          model:
            CHAT_MODEL
        }, cors);
      }

      // ======================================================
      // VISION
      // ======================================================

      if (
        url.pathname === "/v1/vision" &&
        request.method === "POST"
      ) {
        const body =
          await request.json();

        const prompt =
          String(
            body.prompt ||
            "Describe and analyze this image."
          ).trim();

        const image =
          String(
            body.image || ""
          ).trim();

        if (!image) {
          return json({
            ok: false,
            error: "Image data required"
          }, cors, 400);
        }

        if (
          !image.startsWith(
            "data:image/"
          )
        ) {
          return json({
            ok: false,
            error:
              "Image must be a data:image/... URL"
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
                    "You are LOGIC-LEAF vision assistant. Analyze the supplied image accurately and answer the user's request."
                },
                {
                  role: "user",
                  content: prompt
                }
              ],
              image
            }
          );

        const answer =
          result?.response ||
          result?.result ||
          result?.text ||
          "I could not analyze the image.";

        return json({
          ok: true,
          answer,
          model: VISION_MODEL
        }, cors);
      }

      // ======================================================
      // IMAGE GENERATION
      // ======================================================

      if (
        url.pathname === "/v1/image" &&
        request.method === "POST"
      ) {
        const body =
          await request.json();

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

        const image =
          await env.AI.run(
            IMAGE_MODEL,
            {
              prompt
            }
          );

        // Cloudflare can return a stream
        // or image-related response depending
        // on the model/runtime.

        if (
          image instanceof ReadableStream
        ) {
          return new Response(
            image,
            {
              status: 200,
              headers: {
                ...cors,
                "Content-Type":
                  "image/png",
                "Cache-Control":
                  "no-store"
              }
            }
          );
        }

        if (
          image instanceof ArrayBuffer
        ) {
          return new Response(
            image,
            {
              status: 200,
              headers: {
                ...cors,
                "Content-Type":
                  "image/png",
                "Cache-Control":
                  "no-store"
              }
            }
          );
        }

        // Some runtime responses may contain
        // image data inside an object.

        if (
          image &&
          typeof image === "object"
        ) {
          if (
            image.image &&
            typeof image.image === "string"
          ) {
            return json({
              ok: true,
              image: image.image
            }, cors);
          }

          if (
            image.result &&
            typeof image.result === "string"
          ) {
            return json({
              ok: true,
              image: image.result
            }, cors);
          }
        }

        return json({
          ok: true,
          result: image
        }, cors);
      }

      // ======================================================
      // PDF / DOCUMENT GENERATION
      // ======================================================

      if (
        url.pathname === "/v1/pdf" &&
        request.method === "POST"
      ) {
        const body =
          await request.json();

        const prompt =
          String(
            body.prompt || ""
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
                  content: `
You create professional printable documents.

Return ONLY the document body HTML.

Do NOT return:
- Markdown fences
- JavaScript
- <html>
- <head>
- <body>

You may use:
h1, h2, h3, p, ul, ol, li,
table, thead, tbody, tr, th, td,
strong and em.

Make the document clean and readable.
`
                },
                {
                  role: "user",
                  content:
                    `Document title:
${title}

User request:
${prompt}`
                }
              ],
              max_tokens: 6000
            },
            {
              gateway: {
                id: "default"
              }
            }
          );

        let content =
          result?.response || "";

        content =
          String(content)
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

        const document = `
<!doctype html>
<html>
<head>
<meta charset="UTF-8">

<title>${escapeHTML(title)}</title>

<style>

@page {
  size: A4;
  margin: 18mm;
}

* {
  box-sizing: border-box;
}

body {
  font-family:
    Arial,
    Helvetica,
    sans-serif;

  color: #151515;

  line-height: 1.65;

  font-size: 14px;

  margin: 0;
}

.header {
  border-bottom:
    2px solid #151515;

  padding-bottom:
    12px;

  margin-bottom:
    28px;
}

.header strong {
  font-size:
    18px;
}

h1 {
  font-size:
    28px;

  margin:
    0 0 22px;
}

h2 {
  margin-top:
    28px;
}

h3 {
  margin-top:
    22px;
}

table {
  width:
    100%;

  border-collapse:
    collapse;

  margin:
    18px 0;
}

th,
td {
  border:
    1px solid #aaa;

  padding:
    8px;

  vertical-align:
    top;
}

.footer {
  border-top:
    1px solid #aaa;

  margin-top:
    40px;

  padding-top:
    10px;

  font-size:
    10px;

  color:
    #666;
}

@media print {
  .footer {
    position:
      fixed;

    bottom:
      0;
  }
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
</html>
`;

        return new Response(
          document,
          {
            status: 200,
            headers: {
              ...cors,
              "Content-Type":
                "text/html; charset=UTF-8"
            }
          }
        );
      }

      // ======================================================
      // HISTORY
      // ======================================================

      if (
        url.pathname === "/v1/history" &&
        request.method === "POST"
      ) {
        if (!env.DB) {
          return json({
            ok: false,
            error: "D1 unavailable"
          }, cors, 500);
        }

        const body =
          await request.json();

        const userId =
          String(
            body.userId ||
            "anonymous"
          );

        await ensureDatabase(env);

        const result =
          await env.DB.prepare(`
            SELECT
              conversation_id,
              MIN(created_at) AS created_at,
              MAX(created_at) AS updated_at,
              MAX(
                CASE
                  WHEN role = 'user'
                  THEN content
                END
              ) AS title
            FROM messages
            WHERE user_id = ?
            GROUP BY conversation_id
            ORDER BY updated_at DESC
            LIMIT 100
          `)
            .bind(userId)
            .all();

        const chats =
          (result.results || [])
            .map(chat => ({
              conversation_id:
                chat.conversation_id,

              title:
                String(
                  chat.title ||
                  "New conversation"
                ).slice(0, 80),

              created_at:
                chat.created_at,

              updated_at:
                chat.updated_at
            }));

        return json({
          ok: true,
          chats
        }, cors);
      }

      // ======================================================
      // CONVERSATION
      // ======================================================

      if (
        url.pathname === "/v1/conversation" &&
        request.method === "POST"
      ) {
        if (!env.DB) {
          return json({
            ok: false,
            error: "D1 unavailable"
          }, cors, 500);
        }

        const body =
          await request.json();

        const id =
          String(
            body.conversationId ||
            ""
          ).trim();

        const userId =
          String(
            body.userId ||
            ""
          ).trim();

        if (!id) {
          return json({
            ok: false,
            error:
              "Conversation ID required"
          }, cors, 400);
        }

        await ensureDatabase(env);

        let result;

        if (userId) {
          result =
            await env.DB.prepare(`
              SELECT
                role,
                content,
                created_at
              FROM messages
              WHERE conversation_id = ?
              AND user_id = ?
              ORDER BY id ASC
            `)
              .bind(id, userId)
              .all();
        } else {
          result =
            await env.DB.prepare(`
              SELECT
                role,
                content,
                created_at
              FROM messages
              WHERE conversation_id = ?
              ORDER BY id ASC
            `)
              .bind(id)
              .all();
        }

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
            error: "KV unavailable"
          }, cors, 500);
        }

        const rawKey =
          "ll_live_" +
          randomToken(32);

        const hash =
          await sha256(rawKey);

        await env.QTM_KEYS.put(
          `apikey:${hash}`,
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
            "Copy this API key now. It will not be shown again."
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
            error: "KV unavailable"
          }, cors, 500);
        }

        const body =
          await request.json();

        const key =
          String(
            body.apiKey || ""
          ).trim();

        if (!key) {
          return json({
            ok: false,
            error:
              "API key required"
          }, cors, 400);
        }

        const hash =
          await sha256(key);

        const record =
          await env.QTM_KEYS.get(
            `apikey:${hash}`,
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
          `apikey:${hash}`
        );

        return json({
          ok: true
        }, cors);
      }

      // ======================================================
      // PUBLIC API
      // ======================================================

      if (
        url.pathname === "/v1/api/chat" &&
        request.method === "POST"
      ) {
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
          await request.json();

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
                    "You are LOGIC-LEAF API."
                },
                {
                  role: "user",
                  content: message
                }
              ],
              max_tokens: 4096
            },
            {
              gateway: {
                id: "default"
              }
            }
          );

        return json({
          ok: true,
          answer:
            result?.response ||
            result?.result?.response ||
            ""
        }, cors);
      }

      // ======================================================
      // 404
      // ======================================================

      return json({
        ok: false,
        error:
          "Endpoint not found"
      }, cors, 404);

    } catch (error) {
      console.error(
        "WORKER ERROR",
        error
      );

      return json({
        ok: false,
        error:
          error?.message ||
          "Server error"
      }, cors, 500);
    }
  }
};


// ============================================================
// D1
// ============================================================

async function ensureDatabase(env) {
  if (!env.DB) return;

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
        error:
          "Login required"
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
          "Invalid authentication"
      };
    }

    if (!env.FIREBASE_WEB_API_KEY) {
      return {
        ok: false,
        error:
          "Firebase API key is not configured"
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
          "User not found"
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
          "KV unavailable"
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
        `apikey:${hash}`,
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
// SHA-256
// ============================================================

async function sha256(text) {
  const data =
    new TextEncoder()
      .encode(text);

  const hash =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  return Array.from(
    new Uint8Array(hash)
  )
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(2, "0")
    )
    .join("");
}


// ============================================================
// RANDOM TOKEN
// ============================================================

function randomToken(length) {
  const bytes =
    new Uint8Array(
      length
    );

  crypto.getRandomValues(
    bytes
  );

  return Array.from(bytes)
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(2, "0")
    )
    .join("");
}


// ============================================================
// HTML ESCAPE
// ============================================================

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


// ============================================================
// JSON RESPONSE
// ============================================================

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
