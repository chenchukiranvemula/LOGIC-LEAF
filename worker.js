const APP_NAME = "LOGIC-LEAF";

const CHAT_MODEL =
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const VISION_MODEL =
  "@cf/meta/llama-3.2-11b-vision-instruct";

const IMAGE_MODEL =
  "@cf/black-forest-labs/flux-1-schnell";

const SEARCH_INSTANCE =
  "logic-leaf-search";

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
          search: !!env.AI_SEARCH,
          endpoints: [
            "/v1/chat",
            "/v1/search",
            "/v1/vision",
            "/v1/image",
            "/v1/pdf",
            "/v1/history",
            "/v1/conversation",
            "/v1/keys/create",
            "/v1/keys/revoke",
            "/v1/api/chat"
          ]
        }, cors);
      }


      // =========================================
      // CHAT
      // =========================================

      if (
        url.pathname === "/v1/chat" &&
        request.method === "POST"
      ) {
        const body = await request.json();

        const message =
          String(body.message || "").trim();

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

        if (!message) {
          return json({
            ok: false,
            error: "Message required"
          }, cors, 400);
        }

        let searchContext = "";
        let sources = [];

        // -----------------------------------------
        // SEARCH
        // -----------------------------------------

        if (
          useSearch &&
          env.AI_SEARCH
        ) {
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
              chunks.map((item, index) => ({
                id: index + 1,
                text:
                  item.text ||
                  item.content ||
                  "",
                source:
                  item.source ||
                  item.filename ||
                  item.title ||
                  "Indexed source",
                url:
                  item.url || null
              }));

            searchContext =
              sources
                .map(
                  item =>
                    `[Source ${item.id}]\n${item.text}`
                )
                .join("\n\n");

          } catch (error) {
            console.error(
              "SEARCH ERROR",
              error
            );
          }
        }


        // =========================================
        // SYSTEM PROMPT
        // =========================================

        let systemPrompt = `
You are LOGIC-LEAF, a general-purpose AI assistant.

Developer:
V.CHENCHUKIRAN

Your job is to provide useful, accurate,
clear and helpful answers.

You can help with:

- General questions
- Mathematics
- Science
- Education
- JEE preparation
- Programming
- Coding
- Debugging
- HTML
- CSS
- JavaScript
- Python
- Java
- C/C++
- Projects
- Writing
- Reasoning
- Problem solving
- Technical explanations

Conversation behavior:

Remember the conversation context provided
to you and continue the user's topic naturally.

Do not assume that the user is asking about
a foreign country.

When the user asks about India, Indian exams,
Indian education, Indian currency, Indian
colleges or Indian services, answer in the
Indian context unless the user requests another
country.

Do not claim to be ChatGPT, Gemini or Claude.

You are LOGIC-LEAF.

When providing code:

- Give complete usable code.
- Use Markdown code blocks.
- Specify the language.
- Do not intentionally leave broken syntax.
- Explain important changes when useful.
`;

        if (useSearch) {
          systemPrompt += `

Search mode is enabled.

Use the supplied search information when useful.
Do not invent facts from search results.
If the search information is insufficient,
say so clearly.
`;
        }

        let userPrompt = message;

        if (
          useSearch &&
          searchContext
        ) {
          userPrompt = `
USER QUESTION:
${message}

SEARCH INFORMATION:
${searchContext}

Answer the user's question using the
information above when relevant.
`;
        }


        // =========================================
        // AI
        // =========================================

        if (!env.AI) {
          return json({
            ok: false,
            error: "Cloudflare AI binding is missing"
          }, cors, 500);
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


        // =========================================
        // SAVE HISTORY
        // =========================================

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

          } catch (error) {
            console.error(
              "D1 ERROR",
              error
            );
          }
        }


        return json({
          ok: true,
          answer,
          conversationId,
          search_used:
            useSearch && sources.length > 0,
          sources,
          model: CHAT_MODEL
        }, cors);
      }


      // =========================================
      // SEARCH ENDPOINT
      // =========================================

      if (
        url.pathname === "/v1/search" &&
        request.method === "POST"
      ) {
        if (!env.AI_SEARCH) {
          return json({
            ok: false,
            error: "AI Search binding missing"
          }, cors, 500);
        }

        const body =
          await request.json();

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
          }, cors, 400);
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
          chunks.map((item, index) => ({
            id: index + 1,
            text:
              item.text ||
              item.content ||
              "",
            source:
              item.source ||
              item.filename ||
              item.title ||
              "Indexed source",
            url:
              item.url || null
          }));

        return json({
          ok: true,
          query,
          count: results.length,
          results
        }, cors);
      }


      // =========================================
      // VISION
      // =========================================

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
          );

        const image =
          body.image ||
          body.imageBase64 ||
          body.data;

        if (!image) {
          return json({
            ok: false,
            error: "Image data required"
          }, cors, 400);
        }

        if (!env.AI) {
          return json({
            ok: false,
            error: "Cloudflare AI binding missing"
          }, cors, 500);
        }

        let imageData = image;

        if (
          typeof imageData === "string" &&
          imageData.includes(",")
        ) {
          imageData =
            imageData.split(",")[1];
        }

        const binary =
          Uint8Array.from(
            atob(imageData),
            char => char.charCodeAt(0)
          );

        const result =
          await env.AI.run(
            VISION_MODEL,
            {
              messages: [
                {
                  role: "system",
                  content:
                    "You are LOGIC-LEAF vision AI. Analyze images accurately and clearly."
                },
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: prompt
                    },
                    {
                      type: "image",
                      image: Array.from(binary)
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
        }, cors);
      }


      // =========================================
      // IMAGE GENERATION
      // =========================================

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
            error: "Image prompt required"
          }, cors, 400);
        }

        if (!env.AI) {
          return json({
            ok: false,
            error: "Cloudflare AI binding missing"
          }, cors, 500);
        }

        try {
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
                  ...cors,
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
                  ...cors,
                  "Content-Type":
                    "image/png"
                }
              }
            );
          }

          if (
            image?.image
          ) {
            const bytes =
              Uint8Array.from(
                atob(image.image),
                c =>
                  c.charCodeAt(0)
              );

            return new Response(
              bytes,
              {
                status: 200,
                headers: {
                  ...cors,
                  "Content-Type":
                    "image/png"
                }
              }
            );
          }

          return json({
            ok: true,
            result: image
          }, cors);

        } catch (error) {
          return json({
            ok: false,
            error:
              "Image generation failed",
            details:
              error?.message || ""
          }, cors, 500);
        }
      }


      // =========================================
      // PDF / DOCUMENT GENERATION
      // =========================================

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
          );

        if (!prompt) {
          return json({
            ok: false,
            error: "PDF request required"
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
Create a professional printable document.

Return ONLY HTML.

Do not use Markdown fences.
Do not include JavaScript.

Use:
headings,
paragraphs,
lists,
tables,
sections.

Make the document clean and suitable
for printing.
`
                },
                {
                  role: "user",
                  content:
                    `Title: ${title}

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

        const document = `
<!DOCTYPE html>
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
</html>
`;

        return new Response(
          document,
          {
            status: 200,
            headers: {
              ...cors,
              "Content-Type":
                "text/html; charset=UTF-8",
              "Content-Disposition":
                `attachment; filename="${safeFilename(title)}.html"`
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
        }, cors);
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
          }, cors, 500);
        }

        const body =
          await request.json();

        const conversationId =
          String(
            body.conversationId || ""
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
            WHERE conversation_id = ?
            ORDER BY id ASC
          `)
            .bind(conversationId)
            .all();

        return json({
          ok: true,
          messages:
            result.results || []
        }, cors);
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
          }, cors, 401);
        }

        if (!env.QTM_KEYS) {
          return json({
            ok: false,
            error: "KV unavailable"
          }, cors, 500);
        }

        const key =
          "ll_live_" +
          randomToken(32);

        const hash =
          await sha256(key);

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
          apiKey: key,
          warning:
            "Save this key now. It will not be shown again."
        }, cors);
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
          );

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
            "apikey:" + hash,
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
          "apikey:" + hash
        );

        return json({
          ok: true
        }, cors);
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
            error: "Message required"
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


      // =========================================
      // 404
      // =========================================

      return json({
        ok: false,
        error: "Endpoint not found"
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


// =================================================
// DATABASE
// =================================================

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


// =================================================
// FIREBASE AUTH
// =================================================

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

    if (
      !token ||
      !env.FIREBASE_WEB_API_KEY
    ) {
      return {
        ok: false,
        error: "Authentication configuration missing"
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
        error: "User not found"
      };
    }

    return {
      ok: true,
      uid: user.localId,
      email:
        user.email || ""
    };

  } catch {
    return {
      ok: false,
      error:
        "Authentication verification failed"
    };
  }
}


// =================================================
// API KEY AUTH
// =================================================

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

    if (
      !key.startsWith("ll_live_")
    ) {
      return {
        ok: false,
        error: "Invalid API key"
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
      uid: record.uid
    };

  } catch {
    return {
      ok: false,
      error:
        "API authentication failed"
    };
  }
}


// =================================================
// SHA256
// =================================================

async function sha256(text) {

  const data =
    new TextEncoder().encode(text);

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


// =================================================
// RANDOM TOKEN
// =================================================

function randomToken(length) {

  const bytes =
    new Uint8Array(length);

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


// =================================================
// HTML ESCAPE
// =================================================

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


// =================================================
// SAFE FILE NAME
// =================================================

function safeFilename(value) {

  return String(value)
    .replace(
      /[^a-z0-9-_ ]/gi,
      ""
    )
    .trim()
    .replace(
      /\s+/g,
      "-"
    )
    .slice(0, 80) ||
    "logic-leaf-document";
}


// =================================================
// JSON RESPONSE
// =================================================

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
