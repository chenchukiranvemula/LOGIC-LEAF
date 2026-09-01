// ============================================================
// LOGIC-LEAF WORKER
// Chat + Search + Vision/File + Image + PDF + History + API
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
// MAIN
// ============================================================

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
            search: "/v1/search",
            image: "/v1/image",
            pdf: "/v1/pdf",
            vision: "/v1/vision",
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

        if (!env.AI_SEARCH) {
          return json({
            ok: false,
            error: "AI Search binding is not configured"
          }, cors, 500);
        }

        try {

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
            }));

          return json({
            ok: true,
            query,
            count: sources.length,
            results: sources
          }, cors);

        } catch (error) {

          return json({
            ok: false,
            error:
              error?.message ||
              "Search failed"
          }, cors, 500);
        }
      }


      // ======================================================
      // CHAT
      // ======================================================

      if (
        url.pathname === "/v1/chat" &&
        request.method === "POST"
      ) {

        const body =
          await safeJSON(request);

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

        if (!env.AI) {
          return json({
            ok: false,
            error: "Cloudflare AI binding missing"
          }, cors, 500);
        }

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
              chunks.map((chunk, index) => ({
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
                  chunk.url || null
              }));

            searchContext =
              sources
                .map(source =>
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
        // IMPORTANT:
        // LET, NOT CONST
        // ----------------------------------------------------

        let systemPrompt = `
You are LOGIC-LEAF, a capable general AI assistant.

Your job is to give useful, accurate and natural answers.

You can help with:

- General questions
- Mathematics
- Physics
- Chemistry
- JEE preparation
- School and college study
- Programming
- Coding
- Debugging
- Web development
- HTML
- CSS
- JavaScript
- Python
- Java
- C
- C++
- Technical projects
- Writing
- Reasoning
- Problem solving
- Explanations
- Study planning

IMPORTANT CONTEXT RULES:

1. Continue the current conversation naturally.
2. Use previous conversation context when it is provided.
3. Do not randomly assume the user is asking about another country.
4. If the user is in India or asks about Indian education, exams,
   colleges, laws, prices or services, answer for India unless they
   specifically request another country.
5. Do not invent personal information about the user.
6. If information is uncertain, say so.
7. Do not claim to be ChatGPT, Gemini, Claude or another company's AI.
8. You are LOGIC-LEAF.

When writing code:
- Give complete usable code.
- Use Markdown code blocks.
- Mention the language.
- Avoid unnecessary incomplete snippets.
`;


        // ----------------------------------------------------
        // SEARCH PROMPT
        // ----------------------------------------------------

        if (
          searchEnabled &&
          searchContext
        ) {

          systemPrompt += `

SEARCH MODE:

Search results have been provided below.

Use them when they are relevant.
Do not invent facts that are not supported by the results.

SEARCH RESULTS:
${searchContext}
`;
        }


        // ----------------------------------------------------
        // CONVERSATION MEMORY
        // ----------------------------------------------------

        let previousMessages = [];

        if (
          env.DB &&
          userId !== "anonymous"
        ) {

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
                .map(item => ({
                  role:
                    item.role === "assistant"
                      ? "assistant"
                      : "user",

                  content:
                    String(item.content || "")
                }));

          } catch (error) {

            console.error(
              "HISTORY CONTEXT ERROR",
              error
            );
          }
        }


        // ----------------------------------------------------
        // AI REQUEST
        // ----------------------------------------------------

        const messages = [
          {
            role: "system",
            content: systemPrompt
          },

          ...previousMessages,

          {
            role: "user",
            content: message
          }
        ];


        const result =
          await env.AI.run(
            CHAT_MODEL,
            {
              messages,
              max_tokens: 4096
            }
          );


        const answer =
          result?.response ||
          result?.result?.response ||
          "I could not generate a response.";


        // ----------------------------------------------------
        // SAVE
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
          model: CHAT_MODEL
        }, cors);
      }


      // ======================================================
      // VISION / IMAGE / FILE ANALYSIS
      // ======================================================

      if (
        url.pathname === "/v1/vision" &&
        request.method === "POST"
      ) {

        const body =
          await safeJSON(request);

        const prompt =
          String(
            body.prompt ||
            "Analyze this image."
          );

        const image =
          body.image ||
          body.imageData ||
          body.dataURL;

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

        try {

          const imageBytes =
            await dataURLToUint8Array(
              image
            );

          const result =
            await env.AI.run(
              VISION_MODEL,
              {
                messages: [
                  {
                    role: "system",
                    content:
                      "You are LOGIC-LEAF vision assistant. Analyze images accurately and describe what is useful for the user's request."
                  },

                  {
                    role: "user",
                    content: [
                      {
                        type: "text",
                        text: prompt
                      },

                      {
                        type: "image_url",
                        image_url: {
                          url: image
                        }
                      }
                    ]
                  }
                ]
              }
            );

          const answer =
            result?.response ||
            result?.result?.response ||
            "I could not analyze the image.";

          return json({
            ok: true,
            answer,
            model: VISION_MODEL
          }, cors);

        } catch (error) {

          console.error(
            "VISION ERROR",
            error
          );

          return json({
            ok: false,
            error:
              error?.message ||
              "Vision request failed"
          }, cors, 500);
        }
      }


      // ======================================================
      // IMAGE GENERATION
      // ======================================================

      if (
        url.pathname === "/v1/image" &&
        request.method === "POST"
      ) {

        const body =
          await safeJSON(request);

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

          const result =
            await env.AI.run(
              IMAGE_MODEL,
              {
                prompt
              }
            );

          // Cloudflare image response can be
          // a stream or image-like response.

          if (
            result instanceof ReadableStream
          ) {

            return new Response(
              result,
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
            result instanceof ArrayBuffer
          ) {

            return new Response(
              result,
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
            result instanceof Uint8Array
          ) {

            return new Response(
              result,
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


          // Some model/runtime versions
          // return an object.

          return json({
            ok: true,
            image: result
          }, cors);

        } catch (error) {

          console.error(
            "IMAGE ERROR",
            error
          );

          return json({
            ok: false,
            error:
              error?.message ||
              "Image generation failed"
          }, cors, 500);
        }
      }


      // ======================================================
      // PDF GENERATION
      // ======================================================

      if (
        url.pathname === "/v1/pdf" &&
        request.method === "POST"
      ) {

        const body =
          await safeJSON(request);

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

        if (!env.AI) {
          return json({
            ok: false,
            error: "Cloudflare AI binding missing"
          }, cors, 500);
        }

        try {

          const result =
            await env.AI.run(
              CHAT_MODEL,
              {
                messages: [
                  {
                    role: "system",
                    content: `
Create a professional printable HTML document.

Return ONLY HTML.

Do not use Markdown fences.
Do not use JavaScript.

Use:
- headings
- paragraphs
- lists
- tables
- sections

Make the document clean and suitable
for printing on A4 paper.
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
            result?.response ||
            result?.result?.response ||
            "";


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


          const document =
`
<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<title>
${escapeHTML(title)}
</title>

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

  color: #15171c;

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
  margin-top: 20px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 18px 0;
}

th,
td {
  border: 1px solid #aaa;
  padding: 8px;
  text-align: left;
}

th {
  font-weight: bold;
}

.header {
  border-bottom:
    2px solid #111;

  margin-bottom: 25px;

  padding-bottom: 12px;
}

.footer {
  border-top:
    1px solid #aaa;

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

<h1>
${escapeHTML(title)}
</h1>

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
                  `inline; filename="${safeFilename(title)}.html"`
              }
            }
          );

        } catch (error) {

          console.error(
            "PDF ERROR",
            error
          );

          return json({
            ok: false,
            error:
              error?.message ||
              "PDF generation failed"
          }, cors, 500);
        }
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
            WHERE conversation_id = ?
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
            "Copy this key now. It will not be shown again."
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
          await safeJSON(request);

        const key =
          String(
            body.apiKey ||
            ""
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
          await safeJSON(request);

        const message =
          String(
            body.message ||
            ""
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


      // ======================================================
      // 404
      // ======================================================

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
          "Invalid authentication"
      };
    }

    if (!env.FIREBASE_WEB_API_KEY) {
      return {
        ok: false,
        error:
          "Firebase API key missing"
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

  } catch (error) {

    console.error(
      "FIREBASE ERROR",
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


// ============================================================
// DATA URL
// ============================================================

async function dataURLToUint8Array(
  dataURL
) {

  const value =
    String(dataURL);

  if (
    !value.startsWith(
      "data:"
    )
  ) {
    throw new Error(
      "Image must be a data URL"
    );
  }

  const comma =
    value.indexOf(",");

  if (comma === -1) {
    throw new Error(
      "Invalid image data"
    );
  }

  const header =
    value.slice(
      0,
      comma
    );

  const data =
    value.slice(
      comma + 1
    );

  if (
    header.includes(
      ";base64"
    )
  ) {

    const binary =
      atob(data);

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

  const decoded =
    decodeURIComponent(data);

  return new TextEncoder()
    .encode(decoded);
}


// ============================================================
// RANDOM / HASH
// ============================================================

async function sha256(
  text
) {

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


function randomToken(
  length
) {

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
// HELPERS
// ============================================================

async function safeJSON(
  request
) {

  try {
    return await request.json();
  } catch {
    return {};
  }
}


function escapeHTML(
  value
) {

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


function safeFilename(
  value
) {

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
    .slice(
      0,
      80
    ) || "logic-leaf-document";
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
