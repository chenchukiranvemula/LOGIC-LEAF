const APP_NAME = "LOGIC-LEAF";
const SEARCH_INSTANCE = "logic-leaf-search";
const AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
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

      // ======================================
      // HEALTH
      // ======================================

      if (
        url.pathname === "/" ||
        url.pathname === "/health"
      ) {
        return json({
          ok: true,
          name: APP_NAME,
          status: "online",
          ai: !!env.AI,
          ai_gateway: true,
          ai_search: !!env.AI_SEARCH,
          database: !!env.DB,
          kv: !!env.QTM_KEYS,
          endpoint: "/v1/chat",
          search: "/v1/search",
          image: "/v1/image",
          pdf: "/v1/pdf",
          keys: "/v1/keys"
        }, cors);
      }


      // ======================================
      // SEARCH
      // ======================================

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
            error: "AI Search binding missing"
          }, cors, 500);
        }

        const instance =
          env.AI_SEARCH.get(SEARCH_INSTANCE);

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

        const sources = chunks.map(
          (chunk, i) => ({
            id: i + 1,
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
              chunk.url || null
          })
        );

        return json({
          ok: true,
          query,
          count: sources.length,
          results: sources
        }, cors);
      }


      // ======================================
      // CHAT
      // ======================================

      if (
        url.pathname === "/v1/chat" &&
        request.method === "POST"
      ) {
        const body = await request.json();

        const message =
          String(body.message || "").trim();

        const searchEnabled =
          body.search === true ||
          body.useSearch === true;

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

        if (!message) {
          return json({
            ok: false,
            error: "Message required"
          }, cors, 400);
        }

        let sources = [];
        let searchContext = "";

        // ====================================
        // AI SEARCH
        // ====================================

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
                (chunk, i) => ({
                  id: i + 1,
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
                    "Indexed source",
                  url:
                    chunk.url || null
                })
              );

            searchContext =
              sources
                .map(
                  s =>
                    `[Source ${s.id}]
${s.text}`
                )
                .join("\n\n");

          } catch (error) {
            console.error(
              "SEARCH ERROR",
              error
            );
          }
        }


        // ====================================
        // SYSTEM PROMPT
        // ====================================

        let systemPrompt = `
You are LOGIC-LEAF.

Developer:
V.CHENCHUKIRAN
CLOUD SECURITY
ETHICAL HACKER
DEVSECOPS

You are a highly capable general AI assistant.

Help with:
- General questions
- Reasoning
- Mathematics
- Science
- Study
- Coding
- Debugging
- Programming
- Writing
- Technical subjects
- Project development

When generating code:
- Use proper Markdown code blocks.
- Identify the language.
- Make code complete and usable.
- Explain important parts when appropriate.

Never claim to be ChatGPT, Gemini, Claude,
or another company's assistant.

You are LOGIC-LEAF.
`;

        if (searchEnabled) {
          systemPrompt += `

SEARCH MODE IS ENABLED.

Use the provided search results when relevant.
Do not invent information from those results.
If the indexed sources do not contain enough
information, say so.
`;
        }


        let userPrompt = message;

        if (
          searchEnabled &&
          searchContext
        ) {
          userPrompt = `
QUESTION:
${message}

SEARCH RESULTS:
${searchContext}

Answer using the search results when useful.
`;
        }


        // ====================================
        // AI + AI GATEWAY
        // ====================================

        const result =
          await env.AI.run(
            AI_MODEL,
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


        // ====================================
        // SAVE TO D1
        // ====================================

        if (env.DB) {
          try {
            await ensureDatabase(env);

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
                new Date().toISOString()
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

          } catch (dbError) {
            console.error(
              "D1 ERROR",
              dbError
            );
          }
        }


        return json({
          ok: true,
          answer,
          conversationId,
          search_used: searchEnabled,
          sources,
          model: AI_MODEL,
          gateway: "default"
        }, cors);
      }


      // ======================================
      // CHAT HISTORY
      // ======================================

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
              MAX(created_at) AS updated_at,
              SUBSTR(
                MAX(
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
          chats: result.results || []
        }, cors);
      }


      // ======================================
      // GET CONVERSATION
      // ======================================

      if (
        url.pathname === "/v1/conversation" &&
        request.method === "POST"
      ) {
        const body =
          await request.json();

        const id =
          String(
            body.conversationId || ""
          );

        if (!id || !env.DB) {
          return json({
            ok: false,
            error: "Conversation unavailable"
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
            WHERE conversation_id = ?
            ORDER BY id ASC
          `)
            .bind(id)
            .all();

        return json({
          ok: true,
          messages:
            result.results || []
        }, cors);
      }


      // ======================================
      // IMAGE GENERATION
      // ======================================

      if (
        url.pathname === "/v1/image" &&
        request.method === "POST"
      ) {
        const body =
          await request.json();

        const prompt =
          String(body.prompt || "").trim();

        if (!prompt) {
          return json({
            ok: false,
            error: "Image prompt required"
          }, cors, 400);
        }

        /*
          Cloudflare model availability can vary
          by account. This endpoint attempts the
          current FLUX model configured for the app.
        */

        const image =
          await env.AI.run(
            "@cf/black-forest-labs/flux-1-schnell",
            {
              prompt
            }
          );

        return new Response(
          image instanceof ReadableStream
            ? image
            : JSON.stringify(image),
          {
            status: 200,
            headers: {
              ...cors,
              "Content-Type":
                image instanceof ReadableStream
                  ? "image/png"
                  : "application/json"
            }
          }
        );
      }


      // ======================================
      // PDF GENERATION
      // ======================================

      if (
        url.pathname === "/v1/pdf" &&
        request.method === "POST"
      ) {
        const body =
          await request.json();

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
          }, cors, 400);
        }

        const result =
          await env.AI.run(
            AI_MODEL,
            {
              messages: [
                {
                  role: "system",
                  content: `
Create a professional printable document.

Return ONLY HTML content.
Do not use markdown fences.
Do not include JavaScript.
Use headings, paragraphs, lists and tables
where appropriate.
`
                },
                {
                  role: "user",
                  content:
                    `Title: ${title}

Request:
${prompt}`
                }
              ]
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

body {
  font-family:
    Arial,
    Helvetica,
    sans-serif;

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
  margin-bottom: 25px;
  padding-bottom: 12px;
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


      // ======================================
      // CREATE API KEY
      // ======================================

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
            "Copy this key now. It is not shown again."
        }, cors);
      }


      // ======================================
      // REVOKE API KEY
      // ======================================

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

        const body =
          await request.json();

        const key =
          String(body.apiKey || "");

        if (!key) {
          return json({
            ok: false,
            error: "API key required"
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
            error: "API key not found"
          }, cors, 404);
        }

        await env.QTM_KEYS.delete(
          `apikey:${hash}`
        );

        return json({
          ok: true
        }, cors);
      }


      // ======================================
      // PUBLIC API
      // ======================================

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
          String(body.message || "").trim();

        if (!message) {
          return json({
            ok: false,
            error: "Message required"
          }, cors, 400);
        }

        const result =
          await env.AI.run(
            AI_MODEL,
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
              ]
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
            result?.response || ""
        }, cors);
      }


      // ======================================
      // NOT FOUND
      // ======================================

      return json({
        ok: false,
        error: "Endpoint not found"
      }, cors, 404);

    } catch (error) {

      console.error(
        "WORKER ERROR:",
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


// ==========================================
// DATABASE
// ==========================================

async function ensureDatabase(env) {
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


// ==========================================
// FIREBASE AUTH VERIFICATION
// ==========================================

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

    const idToken =
      header.replace(
        /^Bearer\s+/i,
        ""
      ).trim();

    if (!idToken) {
      return {
        ok: false,
        error: "Invalid authentication"
      };
    }

    const response =
      await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            idToken
          })
        }
      );

    if (!response.ok) {
      return {
        ok: false,
        error: "Firebase authentication failed"
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

    return {
      ok: false,
      error:
        "Authentication verification failed"
    };
  }
}


// ==========================================
// API KEY AUTH
// ==========================================

async function authenticateApiKey(
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
        error: "API key required"
      };
    }

    const key =
      header.replace(
        /^Bearer\s+/i,
        ""
      ).trim();

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
        error: "Invalid or revoked API key"
      };
    }

    return {
      ok: true,
      uid: record.uid
    };

  } catch {
    return {
      ok: false,
      error: "API authentication failed"
    };
  }
}


// ==========================================
// CRYPTO
// ==========================================

async function sha256(text) {
  const data =
    new TextEncoder().encode(text);

  const hash =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  return [...new Uint8Array(hash)]
    .map(
      b =>
        b.toString(16)
          .padStart(2, "0")
    )
    .join("");
}


function randomToken(length) {
  const bytes =
    new Uint8Array(length);

  crypto.getRandomValues(bytes);

  return [...bytes]
    .map(
      b =>
        b.toString(16)
          .padStart(2, "0")
    )
    .join("");
}


function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
