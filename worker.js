const APP_NAME = "LOGIC-LEAF";

const CHAT_MODEL =
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const VISION_MODEL =
  "@cf/meta/llama-3.2-11b-vision-instruct";

const IMAGE_MODEL =
  "@cf/black-forest-labs/flux-1-schnell";

const SEARCH_INSTANCE =
  "logic-leaf-search";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    try {

      // =========================================
      // HEALTH
      // =========================================

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
          endpoints: [
            "/v1/chat",
            "/v1/search",
            "/v1/image",
            "/v1/pdf",
            "/v1/vision",
            "/v1/history",
            "/v1/conversation",
            "/v1/keys/create",
            "/v1/keys/revoke",
            "/v1/api/chat"
          ]
        });
      }


      // =========================================
      // CHAT
      // =========================================

      if (
        url.pathname === "/v1/chat" &&
        request.method === "POST"
      ) {
        const body = await safeJSON(request);

        const message =
          String(body.message || "").trim();

        if (!message) {
          return json({
            ok: false,
            error: "Message required"
          }, 400);
        }

        const userId =
          String(body.userId || "anonymous");

        const conversationId =
          String(
            body.conversationId ||
            crypto.randomUUID()
          );

        const useSearch =
          body.search === true ||
          body.useSearch === true;

        let sources = [];
        let context = "";

        // -----------------------------------------
        // SEARCH
        // -----------------------------------------

        if (useSearch && env.AI_SEARCH) {
          try {
            const search =
              env.AI_SEARCH.get(
                SEARCH_INSTANCE
              );

            const result =
              await search.search({
                messages: [
                  {
                    role: "user",
                    content: message
                  }
                ]
              });

            const chunks =
              Array.isArray(result?.chunks)
                ? result.chunks
                : [];

            sources =
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
                url:
                  chunk.url || null,
                score:
                  chunk.score ?? null
              }));

            context =
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

        // -----------------------------------------
        // SYSTEM PROMPT
        // -----------------------------------------

        let systemPrompt =
`You are LOGIC-LEAF, a general-purpose AI assistant.

Developer:
V.CHENCHUKIRAN

You are helpful, accurate, clear and practical.

You can help with:
- General questions
- Mathematics
- Science
- Education
- JEE preparation
- Coding
- Programming
- Debugging
- HTML
- CSS
- JavaScript
- Python
- Projects
- Writing
- Reasoning
- Technical subjects
- Cloud technologies
- Study planning

Maintain conversation context when it is provided.

If the user continues a topic, continue naturally instead of treating it as a completely new question.

When writing code:
- Use Markdown code blocks.
- Specify the language.
- Give complete usable code when requested.
- Do not intentionally leave broken syntax.

Do not claim to be ChatGPT, Gemini, Claude or another company's assistant.

You are LOGIC-LEAF.`;

        if (useSearch) {
          systemPrompt =
            systemPrompt +
`\n\nSearch mode is enabled.
Use supplied search results when relevant.
Do not invent facts from unavailable search results.`;
        }

        let userPrompt = message;

        if (
          useSearch &&
          context
        ) {
          userPrompt =
`User question:
${message}

Relevant indexed search results:
${context}

Answer the user using the search information when useful.`;
        }

        // -----------------------------------------
        // AI
        // -----------------------------------------

        if (!env.AI) {
          return json({
            ok: false,
            error: "Workers AI binding is missing"
          }, 500);
        }

        const result =
          await env.AI.run(
            CHAT_MODEL,
            {
              messages: [
                {
                  role: "system",
                  content: systemPrompt
                },
                {
                  role: "user",
                  content: userPrompt
                }
              ],
              max_tokens: 4096
            }
          );

        const answer =
          result?.response ||
          result?.result?.response ||
          "I could not generate a response.";

        // -----------------------------------------
        // D1
        // -----------------------------------------

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
          search_used: useSearch,
          sources,
          model: CHAT_MODEL
        });
      }


      // =========================================
      // SEARCH
      // =========================================

      if (
        url.pathname === "/v1/search" &&
        request.method === "POST"
      ) {
        if (!env.AI_SEARCH) {
          return json({
            ok: false,
            error: "AI Search binding missing"
          }, 500);
        }

        const body =
          await safeJSON(request);

        const query =
          String(
            body.query ||
            body.message ||
            ""
          ).trim();

        if (!query) {
          return json({
            ok: false,
            error: "Search query required"
          }, 400);
        }

        const search =
          env.AI_SEARCH.get(
            SEARCH_INSTANCE
          );

        const result =
          await search.search({
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

        const results =
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
            url:
              chunk.url || null,
            score:
              chunk.score ?? null
          }));

        return json({
          ok: true,
          query,
          count: results.length,
          results
        });
      }


      // =========================================
      // IMAGE GENERATION
      // =========================================

      if (
        url.pathname === "/v1/image" &&
        request.method === "POST"
      ) {
        const body =
          await safeJSON(request);

        const prompt =
          String(body.prompt || "").trim();

        if (!prompt) {
          return json({
            ok: false,
            error: "Image prompt required"
          }, 400);
        }

        if (!env.AI) {
          return json({
            ok: false,
            error: "Workers AI unavailable"
          }, 500);
        }

        const image =
          await env.AI.run(
            IMAGE_MODEL,
            {
              prompt
            }
          );

        if (
          image instanceof ReadableStream
        ) {
          return new Response(
            image,
            {
              status: 200,
              headers: {
                ...corsHeaders,
                "Content-Type":
                  "image/png"
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
                ...corsHeaders,
                "Content-Type":
                  "image/png"
              }
            }
          );
        }

        if (
          image instanceof Uint8Array
        ) {
          return new Response(
            image,
            {
              status: 200,
              headers: {
                ...corsHeaders,
                "Content-Type":
                  "image/png"
              }
            }
          );
        }

        return json({
          ok: true,
          image
        });
      }


      // =========================================
      // VISION
      // =========================================

      if (
        url.pathname === "/v1/vision" &&
        request.method === "POST"
      ) {
        const body =
          await safeJSON(request);

        const prompt =
          String(
            body.prompt ||
            "Describe this image."
          );

        const image =
          body.image;

        if (!image) {
          return json({
            ok: false,
            error: "Image required"
          }, 400);
        }

        if (!env.AI) {
          return json({
            ok: false,
            error: "Workers AI unavailable"
          }, 500);
        }

        const imageData =
          await imageToBytes(image);

        const result =
          await env.AI.run(
            VISION_MODEL,
            {
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: prompt
                    },
                    {
                      type: "image",
                      image: imageData
                    }
                  ]
                }
              ],
              max_tokens: 2048
            }
          );

        return json({
          ok: true,
          answer:
            result?.response ||
            result?.result?.response ||
            ""
        });
      }


      // =========================================
      // PDF
      // =========================================

      if (
        url.pathname === "/v1/pdf" &&
        request.method === "POST"
      ) {
        const body =
          await safeJSON(request);

        const prompt =
          String(body.prompt || "").trim();

        const title =
          String(
            body.title ||
            "LOGIC-LEAF Document"
          );

        if (!prompt) {
          return json({
            ok: false,
            error: "PDF request required"
          }, 400);
        }

        if (!env.AI) {
          return json({
            ok: false,
            error: "Workers AI unavailable"
          }, 500);
        }

        const result =
          await env.AI.run(
            CHAT_MODEL,
            {
              messages: [
                {
                  role: "system",
                  content:
`Create a professional printable document.

Return ONLY HTML.
Do not use Markdown fences.
Do not include JavaScript.

Use:
- headings
- paragraphs
- lists
- tables
when appropriate.`
                },
                {
                  role: "user",
                  content:
`Title:
${title}

Request:
${prompt}`
                }
              ],
              max_tokens: 4096
            }
          );

        let content =
          result?.response || "";

        content =
          content
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

        const document =
`<!DOCTYPE html>
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
  font-family: Arial, Helvetica, sans-serif;
  color: #111;
  line-height: 1.6;
  font-size: 14px;
}

h1 {
  font-size: 28px;
}

h2 {
  margin-top: 28px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 18px 0;
}

th,
td {
  border: 1px solid #999;
  padding: 8px;
}

.header {
  border-bottom: 2px solid #111;
  padding-bottom: 12px;
  margin-bottom: 25px;
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

        return new Response(
          document,
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type":
                "text/html; charset=UTF-8",
              "Content-Disposition":
                `inline; filename="${safeFilename(title)}.html"`
            }
          }
        );
      }


      // =========================================
      // HISTORY
      // =========================================

      if (
        url.pathname === "/v1/history" &&
        request.method === "POST"
      ) {
        if (!env.DB) {
          return json({
            ok: false,
            error: "D1 unavailable"
          }, 500);
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
              conversation_id,
              MAX(created_at) AS updated_at,
              SUBSTR(
                MIN(
                  CASE
                    WHEN role = 'user'
                    THEN content
                  END
                ),
                1,
                80
              ) AS title
            FROM messages
            WHERE user_id = ?
            GROUP BY conversation_id
            ORDER BY updated_at DESC
            LIMIT 100
          `)
            .bind(userId)
            .all();

        return json({
          ok: true,
          chats:
            result.results || []
        });
      }


      // =========================================
      // CONVERSATION
      // =========================================

      if (
        url.pathname === "/v1/conversation" &&
        request.method === "POST"
      ) {
        if (!env.DB) {
          return json({
            ok: false,
            error: "D1 unavailable"
          }, 500);
        }

        const body =
          await safeJSON(request);

        const conversationId =
          String(
            body.conversationId || ""
          );

        if (!conversationId) {
          return json({
            ok: false,
            error: "Conversation ID required"
          }, 400);
        }

        await ensureDatabase(env);

        const result =
          await env.DB.prepare(`
            SELECT
              role,
              content,
              created_at
            FROM messages
            WHERE conversation_id = ?
            ORDER BY id ASC
          `)
            .bind(conversationId)
            .all();

        return json({
          ok: true,
          messages:
            result.results || []
        });
      }


      // =========================================
      // CREATE API KEY
      // =========================================

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
          }, 401);
        }

        if (!env.QTM_KEYS) {
          return json({
            ok: false,
            error: "KV unavailable"
          }, 500);
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
            "Save this API key. It will not be displayed again."
        });
      }


      // =========================================
      // REVOKE API KEY
      // =========================================

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
          }, 401);
        }

        if (!env.QTM_KEYS) {
          return json({
            ok: false,
            error: "KV unavailable"
          }, 500);
        }

        const body =
          await safeJSON(request);

        const key =
          String(body.apiKey || "");

        if (!key) {
          return json({
            ok: false,
            error: "API key required"
          }, 400);
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
            error: "API key not found"
          }, 404);
        }

        await env.QTM_KEYS.delete(
          `apikey:${hash}`
        );

        return json({
          ok: true
        });
      }


      // =========================================
      // PUBLIC API
      // =========================================

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
          }, 401);
        }

        const body =
          await safeJSON(request);

        const message =
          String(body.message || "").trim();

        if (!message) {
          return json({
            ok: false,
            error: "Message required"
          }, 400);
        }

        const result =
          await env.AI.run(
            CHAT_MODEL,
            {
              messages: [
                {
                  role: "system",
                  content:
                    "You are the LOGIC-LEAF API."
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
            result?.response ||
            result?.result?.response ||
            ""
        });
      }


      // =========================================
      // NOT FOUND
      // =========================================

      return json({
        ok: false,
        error: "Endpoint not found"
      }, 404);

    } catch (error) {

      console.error(
        "WORKER ERROR",
        error
      );

      return json({
        ok: false,
        error:
          error?.message ||
          "Internal server error"
      }, 500);
    }
  }
};


// =============================================
// DATABASE
// =============================================

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


// =============================================
// FIREBASE AUTH
// =============================================

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
        error: "Invalid token"
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
        "https://identitytoolkit.googleapis.com/v1/accounts:lookup" +
        "?key=" +
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
        error: "User not found"
      };
    }

    return {
      ok: true,
      uid: user.localId,
      email: user.email || ""
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


// =============================================
// API KEY AUTH
// =============================================

async function authenticateApiKey(
  request,
  env
) {
  try {

    if (!env.QTM_KEYS) {
      return {
        ok: false,
        error: "KV unavailable"
      };
    }

    const header =
      request.headers.get(
        "Authorization"
      );

    if (!header) {
      return {
        ok: false,
        error: "API key required"
      };
    }

    const key =
      header
        .replace(
          /^Bearer\s+/i,
          ""
        )
        .trim();

    if (!key.startsWith("ll_live_")) {
      return {
        ok: false,
        error: "Invalid API key"
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
      uid: record.uid
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


// =============================================
// IMAGE DATA
// =============================================

async function imageToBytes(value) {

  if (
    Array.isArray(value)
  ) {
    return new Uint8Array(value);
  }

  if (
    typeof value === "string"
  ) {

    let base64 =
      value;

    if (
      base64.includes(",")
    ) {
      base64 =
        base64.split(",")[1];
    }

    const binary =
      atob(base64);

    const bytes =
      new Uint8Array(
        binary.length
      );

    for (
      let i = 0;
      i < binary.length;
      i++
    ) {
      bytes[i] =
        binary.charCodeAt(i);
    }

    return bytes;
  }

  throw new Error(
    "Unsupported image format"
  );
}


// =============================================
// SHA-256
// =============================================

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
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(2, "0")
    )
    .join("");
}


// =============================================
// RANDOM TOKEN
// =============================================

function randomToken(length) {

  const bytes =
    new Uint8Array(length);

  crypto.getRandomValues(
    bytes
  );

  return Array
    .from(bytes)
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(2, "0")
    )
    .join("");
}


// =============================================
// SAFE JSON
// =============================================

async function safeJSON(request) {

  try {
    return await request.json();
  } catch {
    return {};
  }
}


// =============================================
// ESCAPE HTML
// =============================================

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


// =============================================
// SAFE FILENAME
// =============================================

function safeFilename(value) {

  return String(value)
    .replace(
      /[^a-z0-9-_]+/gi,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    )
    .slice(0, 80) ||
    "logic-leaf-document";
}


// =============================================
// JSON RESPONSE
// =============================================

function json(
  data,
  status = 200
) {

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type":
          "application/json; charset=UTF-8"
      }
    }
  );
            }
