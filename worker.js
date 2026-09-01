// ============================================================
// LOGIC-LEAF — COMPLETE CLOUDFLARE WORKER
// ============================================================

const APP_NAME = "LOGIC-LEAF";

// -------------------------
// CLOUDFLARE AI MODELS
// -------------------------

const CHAT_MODEL =
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const VISION_MODEL =
  "@cf/meta/llama-3.2-11b-vision-instruct";

const IMAGE_MODEL =
  "@cf/black-forest-labs/flux-1-schnell";

// -------------------------
// AI SEARCH
// -------------------------

const SEARCH_INSTANCE =
  "logic-leaf-search";


// ============================================================
// WORKER
// ============================================================

export default {

  async fetch(request, env) {

    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods":
        "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization",
      "Access-Control-Max-Age":
        "86400"
    };


    // ========================================================
    // CORS PREFLIGHT
    // ========================================================

    if (request.method === "OPTIONS") {

      return new Response(null, {
        status: 204,
        headers: cors
      });

    }


    const url =
      new URL(request.url);


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

          ai_gateway: true,

          ai_search:
            !!env.AI_SEARCH,

          database:
            !!env.DB,

          kv:
            !!env.QTM_KEYS,

          firebase:
            !!env.FIREBASE_WEB_API_KEY,

          endpoints: {

            chat:
              "/v1/chat",

            search:
              "/v1/search",

            image:
              "/v1/image",

            pdf:
              "/v1/pdf",

            analyze:
              "/v1/analyze",

            history:
              "/v1/history",

            conversation:
              "/v1/conversation",

            createKey:
              "/v1/keys/create",

            revokeKey:
              "/v1/keys/revoke",

            api:
              "/v1/api/chat"

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

        const body =
          await readJSON(request);

        const query =
          String(
            body.query ||
            body.message ||
            ""
          ).trim();


        if (!query) {

          return json({

            ok: false,

            error:
              "Search query required"

          }, cors, 400);

        }


        if (!env.AI_SEARCH) {

          return json({

            ok: false,

            error:
              "AI Search binding missing"

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
                role:
                  "user",

                content:
                  query
              }

            ]

          });


        const chunks =
          Array.isArray(
            result?.chunks
          )
            ? result.chunks
            : [];


        const sources =
          chunks.map(
            (chunk, index) => ({

              id:
                index + 1,

              text:
                chunk.text ||
                chunk.content ||
                "",

              score:
                chunk.score ??
                null,

              source:
                chunk.source ||
                chunk.filename ||
                chunk.file_name ||
                chunk.title ||
                "Indexed source",

              url:
                chunk.url ||
                null

            })
          );


        return json({

          ok: true,

          query,

          count:
            sources.length,

          results:
            sources

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
          await readJSON(request);


        const message =
          String(
            body.message ||
            ""
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


        if (!message) {

          return json({

            ok: false,

            error:
              "Message required"

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

            const instance =
              env.AI_SEARCH.get(
                SEARCH_INSTANCE
              );


            const searchResult =
              await instance.search({

                messages: [

                  {
                    role:
                      "user",

                    content:
                      message
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

                  id:
                    index + 1,

                  text:
                    chunk.text ||
                    chunk.content ||
                    "",

                  score:
                    chunk.score ??
                    null,

                  source:
                    chunk.source ||
                    chunk.filename ||
                    chunk.file_name ||
                    chunk.title ||
                    "Indexed source",

                  url:
                    chunk.url ||
                    null

                })
              );


            searchContext =
              sources
                .map(
                  source =>
                    `[Source ${source.id}]\n${source.text}`
                )
                .join(
                  "\n\n"
                );

          }

          catch (error) {

            console.error(
              "SEARCH ERROR",
              error
            );

          }

        }


        // ----------------------------------------------------
        // SYSTEM PROMPT
        // ----------------------------------------------------

        let systemPrompt = `

You are LOGIC-LEAF.

You are an advanced general-purpose AI assistant.

Developer:
V.CHENCHUKIRAN

Developer focus:
CLOUD SECURITY
ETHICAL HACKING
DEVSECOPS

You can help with:

General questions
Reasoning
Mathematics
Science
Study
Education
Programming
Coding
Debugging
HTML
CSS
JavaScript
Python
Java
C
C++
Web development
Cloud computing
Cloud security
DevOps
DevSecOps
Project development
Writing
Technical explanations

When the user asks for code:

- Give complete usable code when requested.
- Use Markdown code blocks.
- Specify the language.
- Do not deliberately omit important sections.
- Keep related files compatible with one another.
- Explain important configuration requirements.

Do not claim to be ChatGPT.
Do not claim to be Gemini.
Do not claim to be Claude.

You are LOGIC-LEAF.

Answer clearly and directly.
`;


        if (searchEnabled) {

          systemPrompt += `

SEARCH MODE IS ENABLED.

Use the supplied search results when relevant.

Do not invent facts from the search results.

If the supplied results are insufficient,
say that clearly.

`;

        }


        let userPrompt =
          message;


        if (
          searchEnabled &&
          searchContext
        ) {

          userPrompt = `

USER QUESTION:

${message}


SEARCH RESULTS:

${searchContext}


Answer the user's question using
the search results when useful.

`;

        }


        // ----------------------------------------------------
        // AI
        // ----------------------------------------------------

        if (!env.AI) {

          return json({

            ok: false,

            error:
              "Cloudflare AI binding is missing"

          }, cors, 500);

        }


        const result =
          await env.AI.run(

            CHAT_MODEL,

            {

              messages: [

                {
                  role:
                    "system",

                  content:
                    systemPrompt
                },

                {
                  role:
                    "user",

                  content:
                    userPrompt
                }

              ],

              max_tokens:
                4096

            },

            {

              gateway: {

                id:
                  "default",

                skipCache:
                  false,

                collectLog:
                  true

              }

            }

          );


        const answer =
          result?.response ||
          result?.result?.response ||
          "I could not generate a response.";


        // ----------------------------------------------------
        // SAVE CHAT TO D1
        // ----------------------------------------------------

        if (env.DB) {

          try {

            await ensureDatabase(
              env
            );


            const now =
              new Date()
                .toISOString();


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

                new Date()
                  .toISOString()

              )
              .run();

          }

          catch (error) {

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
            CHAT_MODEL,

          gateway:
            "default"

        }, cors);

      }


      // ======================================================
      // FILE / IMAGE ANALYSIS
      // ======================================================

      if (
        url.pathname === "/v1/analyze" &&
        request.method === "POST"
      ) {

        const body =
          await readJSON(request);


        const prompt =
          String(

            body.prompt ||

            "Analyze the uploaded content."

          );


        const fileName =
          String(

            body.fileName ||

            "uploaded-file"

          );


        const mimeType =
          String(

            body.mimeType ||

            ""

          );


        const data =
          body.data;


        if (!data) {

          return json({

            ok: false,

            error:
              "File data required"

          }, cors, 400);

        }


        if (!env.AI) {

          return json({

            ok: false,

            error:
              "Cloudflare AI binding is missing"

          }, cors, 500);

        }


        // ----------------------------------------------------
        // IMAGE ANALYSIS
        // ----------------------------------------------------

        if (
          mimeType.startsWith(
            "image/"
          )
        ) {

          try {

            const imageBytes =
              decodeBase64(
                data
              );


            const result =
              await env.AI.run(

                VISION_MODEL,

                {

                  messages: [

                    {

                      role:
                        "system",

                      content:
                        `
You are LOGIC-LEAF vision AI.

Analyze the provided image accurately.

Describe useful visible information.

Answer the user's request directly.

Do not invent visual details.
`
                    },

                    {

                      role:
                        "user",

                      content: [

                        {

                          type:
                            "text",

                          text:
                            prompt

                        },

                        {

                          type:
                            "image",

                          image:
                            [
                              ...imageBytes
                            ]

                        }

                      ]

                    }

                  ]

                }

              );


            const answer =
              result?.response ||
              result?.result?.response ||
              "Unable to analyze the image.";


            return json({

              ok: true,

              type:
                "image",

              fileName,

              answer

            }, cors);

          }

          catch (error) {

            console.error(
              "VISION ERROR",
              error
            );


            return json({

              ok: false,

              error:
                error?.message ||
                "Image analysis failed"

            }, cors, 500);

          }

        }


        // ----------------------------------------------------
        // TEXT / CODE
        // ----------------------------------------------------

        if (

          mimeType.startsWith(
            "text/"
          )

          ||

          /\.(js|css|html|py|java|cpp|c|h|hpp|md|json|csv|xml|txt|sql|jsx|tsx)$/i
            .test(fileName)

        ) {

          let text;


          try {

            text =
              decodeBase64Text(
                data
              );

          }

          catch {

            text =
              String(data);

          }


          const result =
            await env.AI.run(

              CHAT_MODEL,

              {

                messages: [

                  {

                    role:
                      "system",

                    content:
                      `
You are LOGIC-LEAF file analysis AI.

Analyze the supplied file carefully.

For code:
- identify problems
- explain important sections
- suggest fixes
- provide corrected code when useful
`
                  },

                  {

                    role:
                      "user",

                    content:
                      `${prompt}

FILE NAME:
${fileName}

FILE CONTENT:
${text}`

                  }

                ],

                max_tokens:
                  4096

              }

            );


          return json({

            ok: true,

            type:
              "text",

            fileName,

            answer:
              result?.response ||
              result?.result?.response ||
              ""

          }, cors);

        }


        // ----------------------------------------------------
        // PDF
        // ----------------------------------------------------

        if (

          mimeType ===
            "application/pdf"

          ||

          /\.pdf$/i
            .test(fileName)

        ) {

          return json({

            ok: false,

            type:
              "pdf",

            error:
              "PDF upload was received, but this Worker does not include a PDF text-extraction engine. PDF generation is supported separately through /v1/pdf."

          }, cors, 501);

        }


        return json({

          ok: false,

          error:
            "Unsupported file type"

        }, cors, 400);

      }


      // ======================================================
      // IMAGE GENERATION
      // ======================================================

      if (
        url.pathname === "/v1/image" &&
        request.method === "POST"
      ) {

        const body =
          await readJSON(request);


        const prompt =
          String(
            body.prompt ||
            ""
          ).trim();


        if (!prompt) {

          return json({

            ok: false,

            error:
              "Image prompt required"

          }, cors, 400);

        }


        if (!env.AI) {

          return json({

            ok: false,

            error:
              "Cloudflare AI binding is missing"

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


          // --------------------------------------------------
          // STREAM
          // --------------------------------------------------

          if (
            result instanceof
            ReadableStream
          ) {

            return new Response(
              result,

              {

                status:
                  200,

                headers: {

                  ...cors,

                  "Content-Type":
                    "image/png"

                }

              }

            );

          }


          // --------------------------------------------------
          // ARRAY BUFFER
          // --------------------------------------------------

          if (
            result instanceof
            ArrayBuffer
          ) {

            return new Response(

              result,

              {

                status:
                  200,

                headers: {

                  ...cors,

                  "Content-Type":
                    "image/png"

                }

              }

            );

          }


          // --------------------------------------------------
          // IMAGE PROPERTY
          // --------------------------------------------------

          if (
            result &&
            typeof result.image ===
              "string"
          ) {

            const bytes =
              decodeBase64(
                result.image
              );


            return new Response(

              bytes,

              {

                status:
                  200,

                headers: {

                  ...cors,

                  "Content-Type":
                    "image/png"

                }

              }

            );

          }


          // --------------------------------------------------
          // FALLBACK
          // --------------------------------------------------

          return json({

            ok: true,

            type:
              "image",

            result

          }, cors);

        }

        catch (error) {

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
      // PDF / DOCUMENT GENERATION
      // ======================================================

      if (
        url.pathname === "/v1/pdf" &&
        request.method === "POST"
      ) {

        const body =
          await readJSON(request);


        const prompt =
          String(
            body.prompt ||
            ""
          ).trim();


        const title =
          String(

            body.title ||

            "LOGIC-LEAF Document"

          );


        if (!prompt) {

          return json({

            ok: false,

            error:
              "PDF request required"

          }, cors, 400);

        }


        if (!env.AI) {

          return json({

            ok: false,

            error:
              "Cloudflare AI binding is missing"

          }, cors, 500);

        }


        const result =
          await env.AI.run(

            CHAT_MODEL,

            {

              messages: [

                {

                  role:
                    "system",

                  content:
                    `
Create a professional printable
HTML document.

Return ONLY HTML.

Do not return Markdown fences.

Do not use JavaScript.

Use professional:

headings
paragraphs
lists
tables
sections
`

                },

                {

                  role:
                    "user",

                  content:
                    `TITLE:

${title}


REQUEST:

${prompt}`

                }

              ],

              max_tokens:
                4096

            }

          );


        let content =
          result?.response ||
          result?.result?.response ||
          "";


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
`
<!doctype html>

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

  color:
    #111;

  background:
    #fff;

  line-height:
    1.6;

  font-size:
    14px;

}

h1 {

  font-size:
    28px;

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
    1px solid #999;

  padding:
    8px;

  vertical-align:
    top;

}

th {

  font-weight:
    700;

}

.header {

  border-bottom:
    2px solid #111;

  margin-bottom:
    25px;

  padding-bottom:
    12px;

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

}

</style>

</head>

<body>

<div class="header">

<strong>
LOGIC-LEAF
</strong>

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

            status:
              200,

            headers: {

              ...cors,

              "Content-Type":
                "text/html; charset=UTF-8",

              "Content-Disposition":
                `attachment; filename="${safeFileName(title)}.html"`

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

            error:
              "D1 unavailable"

          }, cors, 500);

        }


        const body =
          await readJSON(request);


        const userId =
          String(

            body.userId ||

            "anonymous"

          );


        await ensureDatabase(
          env
        );


        const result =
          await env.DB.prepare(`

            SELECT

              conversation_id,

              MAX(created_at)
              AS updated_at,

              SUBSTR(

                MAX(

                  CASE

                    WHEN role =
                      'user'

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

            .bind(
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
      // LOAD CONVERSATION
      // ======================================================

      if (
        url.pathname ===
          "/v1/conversation" &&
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
          await readJSON(request);


        const conversationId =
          String(

            body.conversationId ||

            ""

          );


        if (!conversationId) {

          return json({

            ok: false,

            error:
              "Conversation ID required"

          }, cors, 400);

        }


        await ensureDatabase(
          env
        );


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

            .bind(
              conversationId
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
        url.pathname ===
          "/v1/keys/create" &&
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


      // ======================================================
      // REVOKE API KEY
      // ======================================================

      if (
        url.pathname ===
          "/v1/keys/revoke" &&
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
          await readJSON(request);


        const apiKey =
          String(

            body.apiKey ||

            ""

          );


        if (!apiKey) {

          return json({

            ok: false,

            error:
              "API key required"

          }, cors, 400);

        }


        const hash =
          await sha256(
            apiKey
          );


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
        url.pathname ===
          "/v1/api/chat" &&
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
          await readJSON(request);


        const message =
          String(

            body.message ||

            ""

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

                  role:
                    "system",

                  content:
                    "You are LOGIC-LEAF API."

                },

                {

                  role:
                    "user",

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


      // ======================================================
      // NOT FOUND
      // ======================================================

      return json({

        ok: false,

        error:
          "Endpoint not found"

      }, cors, 404);

    }


    catch (error) {

      console.error(
        "LOGIC-LEAF WORKER ERROR:",
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
// D1 DATABASE
// ============================================================

async function ensureDatabase(
  env
) {

  await env.DB.prepare(`

    CREATE TABLE IF NOT EXISTS messages (

      id
      INTEGER
      PRIMARY KEY
      AUTOINCREMENT,

      conversation_id
      TEXT
      NOT NULL,

      user_id
      TEXT
      NOT NULL,

      role
      TEXT
      NOT NULL,

      content
      TEXT
      NOT NULL,

      created_at
      TEXT
      NOT NULL

    )

  `).run();


  await env.DB.prepare(`

    CREATE INDEX IF NOT EXISTS
    idx_messages_conversation

    ON messages(
      conversation_id
    )

  `).run();


  await env.DB.prepare(`

    CREATE INDEX IF NOT EXISTS
    idx_messages_user

    ON messages(
      user_id
    )

  `).run();

}


// ============================================================
// FIREBASE AUTHENTICATION
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


    if (
      !env.FIREBASE_WEB_API_KEY
    ) {

      return {

        ok: false,

        error:
          "FIREBASE_WEB_API_KEY is not configured"

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

  }


  catch (error) {

    console.error(
      "FIREBASE AUTH ERROR:",
      error
    );


    return {

      ok: false,

      error:
        "Firebase authentication verification failed"

    };

  }

}


// ============================================================
// API KEY AUTHENTICATION
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
      await sha256(
        key
      );


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

  }


  catch {

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

    ...new Uint8Array(
      hash
    )

  ]

    .map(

      byte =>

        byte
          .toString(16)
          .padStart(
            2,
            "0"
          )

    )

    .join("");

}


// ============================================================
// RANDOM TOKEN
// ============================================================

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
          .padStart(
            2,
            "0"
          )

    )

    .join("");

}


// ============================================================
// BASE64 → BYTES
// ============================================================

function decodeBase64(
  value
) {

  const clean =
    String(value)

      .replace(
        /^data:[^;]+;base64,/,
        ""
      );


  const binary =
    atob(clean);


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


// ============================================================
// BASE64 → TEXT
// ============================================================

function decodeBase64Text(
  value
) {

  const bytes =
    decodeBase64(
      value
    );


  return new TextDecoder()
    .decode(bytes);

}


// ============================================================
// JSON
// ============================================================

async function readJSON(
  request
) {

  try {

    return await request.json();

  }

  catch {

    return {};

  }

}


// ============================================================
// HTML ESCAPE
// ============================================================

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


// ============================================================
// SAFE FILE NAME
// ============================================================

function safeFileName(
  value
) {

  return String(value)

    .replace(
      /[^a-z0-9_\-]+/gi,
      "_"
    )

    .replace(
      /^_+|_+$/g,
      ""
    )

    .slice(
      0,
      80
    )

    || "logic-leaf-document";

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

    JSON.stringify(
      data
    ),

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
