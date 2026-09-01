// =====================================================
// LOGIC-LEAF UNIVERSAL AI WORKER
// =====================================================

const APP_NAME = "LOGIC-LEAF";

const CHAT_MODEL =
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const VISION_MODEL =
  "@cf/meta/llama-3.2-11b-vision-instruct";

const IMAGE_MODEL =
  "@cf/black-forest-labs/flux-1-schnell";

const SEARCH_INSTANCE =
  "logic-leaf-search";


// =====================================================
// WORKER
// =====================================================

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

    const url =
      new URL(request.url);

    try {

      // =================================================
      // HEALTH
      // =================================================

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

          features: {
            chat: true,
            reasoning: true,
            search: !!env.AI_SEARCH,
            image_generation: !!env.AI,
            file_analysis: !!env.AI,
            pdf_analysis: !!env.AI,
            image_understanding: !!env.AI,
            pdf_generation: !!env.AI,
            history: !!env.DB,
            api_keys: !!env.QTM_KEYS
          },

          endpoints: {
            chat: "/v1/chat",
            search: "/v1/search",
            image: "/v1/image",
            file: "/v1/file",
            pdf: "/v1/pdf",
            history: "/v1/history",
            conversation: "/v1/conversation",
            create_key: "/v1/keys/create",
            revoke_key: "/v1/keys/revoke",
            public_api: "/v1/api/chat"
          }
        }, cors);
      }


      // =================================================
      // SEARCH
      // =================================================

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
          chunks.map(
            (chunk, index) => ({
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
            })
          );

        return json({
          ok: true,
          query,
          count: sources.length,
          results: sources
        }, cors);
      }


      // =================================================
      // CHAT
      // =================================================

      if (
        url.pathname === "/v1/chat" &&
        request.method === "POST"
      ) {

        if (!env.AI) {
          return json({
            ok: false,
            error: "Workers AI binding missing"
          }, cors, 500);
        }

        const body =
          await request.json();

        const message =
          String(
            body.message || ""
          ).trim();

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


        // -----------------------------------------------
        // SEARCH CONTEXT
        // -----------------------------------------------

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


        // -----------------------------------------------
        // SYSTEM PROMPT
        // -----------------------------------------------

        let systemPrompt = `
You are LOGIC-LEAF.

Developer:
V.CHENCHUKIRAN

CLOUD SECURITY
ETHICAL HACKER
DEVSECOPS

You are a highly capable general AI assistant.

You can help with:

- General questions
- Reasoning
- Mathematics
- Science
- Study
- Coding
- Programming
- Debugging
- Software development
- HTML
- CSS
- JavaScript
- Python
- Java
- C
- C++
- Project development
- Technical subjects
- Writing
- Explanations

For coding requests:

1. Understand the request.
2. Produce complete usable code.
3. Use Markdown code fences.
4. Specify the programming language.
5. Avoid unnecessary placeholders.
6. Explain important implementation details when useful.

You are LOGIC-LEAF.

Do not claim to be ChatGPT, Gemini, Claude,
or another company's assistant.

Be accurate.
If something is unavailable, say so honestly.
`;

        if (searchEnabled) {

          systemPrompt += `

SEARCH MODE IS ENABLED.

Use the supplied search results when relevant.

Do not invent facts from the search results.

If the search results are insufficient,
clearly say that more information is needed.
`;
        }


        let userPrompt =
          message;

        if (
          searchEnabled &&
          searchContext
        ) {

          userPrompt = `
QUESTION:
${message}

SEARCH RESULTS:
${searchContext}

Answer the question using the search
results when they are relevant.
`;
        }


        // -----------------------------------------------
        // AI
        // -----------------------------------------------

        const result =
          await env.AI.run(
            CHAT_MODEL,
            {
              messages: [
                {
                  role: "system",
                  content:
                    systemPrompt
                },
                {
                  role: "user",
                  content:
                    userPrompt
                }
              ],

              max_tokens: 4096
            }
          );

        const answer =
          result?.response ||
          result?.result?.response ||
          "I could not generate a response.";


        // -----------------------------------------------
        // D1
        // -----------------------------------------------

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
            searchEnabled,

          sources,

          model:
            CHAT_MODEL
        }, cors);
      }


      // =================================================
      // IMAGE GENERATION
      // =================================================

      if (
        url.pathname === "/v1/image" &&
        request.method === "POST"
      ) {

        if (!env.AI) {
          return json({
            ok: false,
            error: "Workers AI unavailable"
          }, cors, 500);
        }

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

        if (prompt.length > 2048) {
          return json({
            ok: false,
            error:
              "Image prompt is too long."
          }, cors, 400);
        }


        // Cloudflare FLUX model
        const result =
          await env.AI.run(
            IMAGE_MODEL,
            {
              prompt,

              steps:
                Math.min(
                  Math.max(
                    Number(body.steps) || 4,
                    1
                  ),
                  8
                ),

              seed:
                Math.floor(
                  Math.random() *
                  2147483647
                )
            }
          );


        const image =
          result?.image;

        if (!image) {
          return json({
            ok: false,
            error:
              "Image model returned no image."
          }, cors, 500);
        }


        return json({
          ok: true,

          image:
            `data:image/jpeg;base64,${image}`,

          mimeType:
            "image/jpeg",

          model:
            IMAGE_MODEL,

          prompt
        }, cors);
      }


      // =================================================
      // FILE / PDF / IMAGE ANALYSIS
      // =================================================

      if (
        url.pathname === "/v1/file" &&
        request.method === "POST"
      ) {

        if (!env.AI) {
          return json({
            ok: false,
            error: "Workers AI unavailable"
          }, cors, 500);
        }


        const form =
          await request.formData();

        const file =
          form.get("file");

        const question =
          String(
            form.get("question") ||
            "Analyze this file and explain the important information."
          ).trim();


        if (
          !file ||
          typeof file.arrayBuffer !==
            "function"
        ) {

          return json({
            ok: false,
            error:
              "No valid file uploaded."
          }, cors, 400);
        }


        const filename =
          String(
            file.name ||
            "uploaded-file"
          );

        const mime =
          String(
            file.type ||
            "application/octet-stream"
          );


        // -----------------------------------------------
        // SIZE LIMIT
        // -----------------------------------------------

        const MAX_FILE_SIZE =
          20 * 1024 * 1024;

        if (
          file.size &&
          file.size > MAX_FILE_SIZE
        ) {

          return json({
            ok: false,
            error:
              "File is too large. Maximum size is 20 MB."
          }, cors, 413);
        }


        const buffer =
          await file.arrayBuffer();


        // -----------------------------------------------
        // TEXT / CODE FILES
        // -----------------------------------------------

        const isText =
          mime.startsWith("text/") ||
          /\.(txt|md|json|js|jsx|ts|tsx|css|html|xml|py|java|c|cpp|h|hpp|sql|csv|yaml|yml|sh)$/i
            .test(filename);


        let extractedText = "";


        if (isText) {

          extractedText =
            new TextDecoder()
              .decode(buffer);

        } else {

          // ---------------------------------------------
          // CLOUDFLARE MARKDOWN CONVERSION
          // ---------------------------------------------

          if (
            typeof env.AI.toMarkdown !==
            "function"
          ) {

            return json({
              ok: false,
              error:
                "File conversion is unavailable on this Worker AI binding."
            }, cors, 500);
          }


          const converted =
            await env.AI.toMarkdown({
              name:
                filename,

              blob:
                new Blob(
                  [buffer],
                  {
                    type: mime
                  }
                )
            });


          const result =
            Array.isArray(converted)
              ? converted[0]
              : converted;


          if (
            !result ||
            result.format === "error"
          ) {

            return json({
              ok: false,

              error:
                result?.error ||
                "Could not convert the file."
            }, cors, 422);
          }


          extractedText =
            result.data || "";
        }


        if (!extractedText.trim()) {

          return json({
            ok: false,
            error:
              "No readable content was found in the file."
          }, cors, 422);
        }


        // Keep the request within a
        // reasonable AI context size.
        const MAX_TEXT =
          60000;

        extractedText =
          extractedText.slice(
            0,
            MAX_TEXT
          );


        // -----------------------------------------------
        // ASK AI ABOUT FILE
        // -----------------------------------------------

        const result =
          await env.AI.run(
            CHAT_MODEL,
            {
              messages: [
                {
                  role: "system",

                  content: `
You are LOGIC-LEAF.

You are analyzing a user-provided file.

Use the supplied file content as your
primary source.

Do not invent information that is not
supported by the file.

Answer clearly and accurately.
`
                },

                {
                  role: "user",

                  content: `
FILE NAME:
${filename}

FILE TYPE:
${mime}

USER QUESTION:
${question}

FILE CONTENT:
${extractedText}
`
                }
              ],

              max_tokens:
                4096
            }
          );


        const answer =
          result?.response ||
          result?.result?.response ||
          "I could not analyze this file.";


        return json({
          ok: true,

          answer,

          filename,

          mimeType:
            mime,

          characters:
            extractedText.length,

          model:
            CHAT_MODEL
        }, cors);
      }


      // =================================================
      // IMAGE UNDERSTANDING
      // =================================================

      if (
        url.pathname === "/v1/vision" &&
        request.method === "POST"
      ) {

        if (!env.AI) {
          return json({
            ok: false,
            error:
              "Workers AI unavailable"
          }, cors, 500);
        }


        const form =
          await request.formData();

        const file =
          form.get("file");

        const question =
          String(
            form.get("question") ||
            "Describe and analyze this image."
          ).trim();


        if (
          !file ||
          typeof file.arrayBuffer !==
            "function"
        ) {

          return json({
            ok: false,
            error:
              "Image required."
          }, cors, 400);
        }


        const mime =
          String(
            file.type ||
            "image/jpeg"
          );


        if (
          !mime.startsWith("image/")
        ) {

          return json({
            ok: false,
            error:
              "The uploaded file is not an image."
          }, cors, 400);
        }


        const buffer =
          await file.arrayBuffer();


        const bytes =
          new Uint8Array(buffer);


        const base64 =
          uint8ArrayToBase64(
            bytes
          );


        const imageData =
          `data:${mime};base64,${base64}`;


        const result =
          await env.AI.run(
            VISION_MODEL,
            {
              messages: [
                {
                  role: "system",

                  content:
                    "You are LOGIC-LEAF vision assistant. Analyze the provided image carefully and answer the user's question accurately."
                },

                {
                  role: "user",

                  content: [
                    {
                      type: "text",
                      text: question
                    },

                    {
                      type: "image_url",
                      image_url: {
                        url: imageData
                      }
                    }
                  ]
                }
              ],

              max_tokens:
                2048
            }
          );


        const answer =
          result?.response ||
          result?.result?.response ||
          "I could not analyze the image.";


        return json({
          ok: true,
          answer,
          model:
            VISION_MODEL
        }, cors);
      }


      // =================================================
      // PDF / DOCUMENT GENERATION
      // =================================================

      if (
        url.pathname === "/v1/pdf" &&
        request.method === "POST"
      ) {

        if (!env.AI) {
          return json({
            ok: false,
            error:
              "Workers AI unavailable"
          }, cors, 500);
        }


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
You are LOGIC-LEAF document generator.

Create a professional printable document.

Return ONLY valid HTML CONTENT.

Do not return:
- Markdown fences
- JavaScript
- <html>
- <head>
- <body>

You MAY use:
- h1
- h2
- h3
- p
- ul
- ol
- li
- table
- thead
- tbody
- tr
- th
- td
- blockquote
- pre
- code

Make the document clear,
well structured and printable.
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

              max_tokens:
                6000
            }
          );


        let content =
          result?.response ||
          result?.result?.response ||
          "";


        content =
          cleanGeneratedHTML(
            content
          );


        const document =
`<!doctype html>
<html lang="en">

<head>

<meta charset="UTF-8">

<meta name="viewport"
      content="width=device-width,initial-scale=1">

<title>
${escapeHTML(title)}
</title>

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

  color: #111;
  background: white;

  line-height: 1.6;

  font-size: 14px;

  margin: 0;
}

.header {
  border-bottom:
    2px solid #111;

  padding-bottom:
    12px;

  margin-bottom:
    24px;
}

.brand {
  font-size: 13px;
  font-weight: 800;
  letter-spacing:
    .12em;
}

h1 {
  font-size:
    28px;

  margin:
    0 0 20px;
}

h2 {
  margin-top:
    28px;
}

h3 {
  margin-top:
    20px;
}

table {
  width: 100%;
  border-collapse:
    collapse;

  margin:
    18px 0;
}

th,
td {
  border:
    1px solid #999;

  padding:
    8px;

  text-align:
    left;

  vertical-align:
    top;
}

pre {
  background:
    #f3f3f3;

  padding:
    12px;

  overflow-x:
    auto;

  border:
    1px solid #ddd;

  border-radius:
    6px;
}

.footer {
  margin-top:
    40px;

  padding-top:
    10px;

  border-top:
    1px solid #aaa;

  font-size:
    10px;

  color:
    #555;
}

</style>

</head>

<body>

<div class="header">
  <div class="brand">
    LOGIC-LEAF
  </div>
</div>

<h1>
${escapeHTML(title)}
</h1>

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
              ...cors,

              "Content-Type":
                "text/html; charset=UTF-8",

              "Content-Disposition":
                `attachment; filename="${safeFilename(title)}.html"`
            }
          }
        );
      }


      // =================================================
      // HISTORY
      // =================================================

      if (
        url.pathname === "/v1/history" &&
        request.method === "POST"
      ) {

        if (!env.DB) {

          return json({
            ok: false,
            error:
              "D1 unavailable"
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
              MAX(created_at)
                AS updated_at,

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

            GROUP BY
              conversation_id

            ORDER BY
              updated_at DESC

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


      // =================================================
      // CONVERSATION
      // =================================================

      if (
        url.pathname === "/v1/conversation" &&
        request.method === "POST"
      ) {

        if (!env.DB) {

          return json({
            ok: false,
            error:
              "D1 unavailable"
          }, cors, 500);
        }


        const body =
          await request.json();

        const id =
          String(
            body.conversationId ||
            ""
          );


        if (!id) {

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
            .bind(id)
            .all();


        return json({
          ok: true,

          messages:
            result.results || []
        }, cors);
      }


      // =================================================
      // CREATE API KEY
      // =================================================

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
            error:
              auth.error
          }, cors, 401);
        }


        if (!env.QTM_KEYS) {

          return json({
            ok: false,
            error:
              "KV unavailable"
          }, cors, 500);
        }


        const rawKey =
          "ll_live_" +
          randomToken(32);


        const hash =
          await sha256(
            rawKey
          );


        await env.QTM_KEYS.put(
          `apikey:${hash}`,

          JSON.stringify({
            uid:
              auth.uid,

            createdAt:
              new Date()
                .toISOString()
          })
        );


        return json({
          ok: true,

          apiKey:
            rawKey,

          warning:
            "Copy this key now. It will not be shown again."
        }, cors);
      }


      // =================================================
      // REVOKE API KEY
      // =================================================

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
            error:
              auth.error
          }, cors, 401);
        }


        if (!env.QTM_KEYS) {

          return json({
            ok: false,
            error:
              "KV unavailable"
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


      // =================================================
      // PUBLIC API
      // =================================================

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
            error:
              auth.error
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

                  content:
                    message
                }
              ],

              max_tokens:
                4096
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


      // =================================================
      // NOT FOUND
      // =================================================

      return json({
        ok: false,
        error:
          "Endpoint not found"
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


// =====================================================
// D1 DATABASE
// =====================================================

async function ensureDatabase(env) {

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      conversation_id
        TEXT NOT NULL,

      user_id
        TEXT NOT NULL,

      role
        TEXT NOT NULL,

      content
        TEXT NOT NULL,

      created_at
        TEXT NOT NULL
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


// =====================================================
// FIREBASE AUTH
// =====================================================

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


    const idToken =
      header
        .replace(
          /^Bearer\s+/i,
          ""
        )
        .trim();


    if (!idToken) {

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
          "Firebase server configuration missing"
      };
    }


    const response =
      await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
          env.FIREBASE_WEB_API_KEY
        )}`,

        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              idToken
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


  } catch {

    return {
      ok: false,
      error:
        "Authentication verification failed"
    };
  }
}


// =====================================================
// API KEY AUTH
// =====================================================

async function authenticateApiKey(
  request,
  env
) {

  try {

    if (!env.QTM_KEYS) {

      return {
        ok: false,
        error:
          "API key storage unavailable"
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


  } catch {

    return {
      ok: false,
      error:
        "API authentication failed"
    };
  }
}


// =====================================================
// BASE64
// =====================================================

function uint8ArrayToBase64(
  bytes
) {

  let binary = "";

  const chunkSize =
    0x8000;


  for (
    let i = 0;
    i < bytes.length;
    i += chunkSize
  ) {

    binary += String.fromCharCode(
      ...bytes.subarray(
        i,
        Math.min(
          i + chunkSize,
          bytes.length
        )
      )
    );
  }


  return btoa(binary);
}


// =====================================================
// SHA256
// =====================================================

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


  return [
    ...new Uint8Array(hash)
  ]
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(2, "0")
    )
    .join("");
}


// =====================================================
// RANDOM TOKEN
// =====================================================

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


  return [
    ...bytes
  ]
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(2, "0")
    )
    .join("");
}


// =====================================================
// HTML ESCAPE
// =====================================================

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


// =====================================================
// CLEAN AI HTML
// =====================================================

function cleanGeneratedHTML(
  html
) {

  let result =
    String(html || "")
      .trim();


  result =
    result.replace(
      /^```html\s*/i,
      ""
    );


  result =
    result.replace(
      /^```\s*/i,
      ""
    );


  result =
    result.replace(
      /\s*```$/i,
      ""
    );


  // Remove accidental document wrappers
  result =
    result.replace(
      /<!doctype[^>]*>/gi,
      ""
    );


  result =
    result.replace(
      /<\/?(html|head|body)[^>]*>/gi,
      ""
    );


  // Never allow scripts in generated documents
  result =
    result.replace(
      /<script[\s\S]*?<\/script>/gi,
      ""
    );


  return result.trim();
}


// =====================================================
// SAFE FILE NAME
// =====================================================

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
    .slice(0, 80)
    || "logic-leaf-document";
}


// =====================================================
// JSON RESPONSE
// =====================================================

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
