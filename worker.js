/* =====================================================
   LOGIC-LEAF WORKER
===================================================== */

const APP_NAME =
  "LOGIC-LEAF";


const CHAT_MODEL =
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast";


const VISION_MODEL =
  "@cf/meta/llama-3.2-11b-vision-instruct";


const IMAGE_MODEL =
  "@cf/black-forest-labs/flux-1-schnell";


const SEARCH_INSTANCE =
  "logic-leaf-search";


/* =====================================================
   WORKER
===================================================== */

export default {

  async fetch(request, env) {

    const cors = {

      "Access-Control-Allow-Origin": "*",

      "Access-Control-Allow-Methods":
        "GET,POST,OPTIONS",

      "Access-Control-Allow-Headers":
        "Content-Type, Authorization",

      "Access-Control-Max-Age":
        "86400"
    };


    if (
      request.method === "OPTIONS"
    ) {

      return new Response(
        null,
        {
          status: 204,
          headers: cors
        }
      );
    }


    const url =
      new URL(request.url);


    try {


      /* =========================================
         HEALTH
      ========================================= */

      if (
        url.pathname === "/" ||
        url.pathname === "/health"
      ) {

        return json({

          ok: true,

          name:
            APP_NAME,

          status:
            "online",

          ai:
            !!env.AI,

          database:
            !!env.DB,

          kv:
            !!env.QTM_KEYS,

          ai_search:
            !!env.AI_SEARCH,

          endpoint:
            "/v1/chat",

          image:
            "/v1/image",

          pdf:
            "/v1/pdf",

          history:
            "/v1/history"

        }, cors);
      }


      /* =========================================
         SEARCH
      ========================================= */

      if (
        url.pathname === "/v1/search" &&
        request.method === "POST"
      ) {

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
            (chunk, i) => ({

              id:
                i + 1,

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

          ok:
            true,

          query,

          count:
            sources.length,

          results:
            sources

        }, cors);
      }


      /* =========================================
         CHAT
      ========================================= */

      if (
        url.pathname === "/v1/chat" &&
        request.method === "POST"
      ) {

        const body =
          await request.json();


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


        const file =
          body.file || null;


        if (
          !message &&
          !file
        ) {

          return json({

            ok: false,

            error:
              "Message required"

          }, cors, 400);
        }


        /* =====================================
           DATABASE
        ===================================== */

        let previousMessages =
          [];


        if (env.DB) {

          try {

            await ensureDatabase(env);


            const history =
              await env.DB
                .prepare(`
                  SELECT
                    role,
                    content,
                    created_at
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
                .map(
                  row => ({

                    role:
                      row.role,

                    content:
                      row.content

                  })
                );


          } catch (error) {

            console.error(
              "HISTORY ERROR",
              error
            );
          }
        }


        /* =====================================
           SEARCH
        ===================================== */

        let sources =
          [];

        let searchContext =
          "";


        if (
          searchEnabled &&
          env.AI_SEARCH
        ) {

          try {

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
                      message
                  }

                ]

              });


            const chunks =
              Array.isArray(
                result?.chunks
              )
                ? result.chunks
                : [];


            sources =
              chunks.map(
                (chunk, i) => ({

                  id:
                    i + 1,

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
                    `[Source ${source.id}]
${source.text}`
                )
                .join(
                  "\n\n"
                );


          } catch (error) {

            console.error(
              "SEARCH ERROR",
              error
            );
          }
        }


        /* =====================================
           SYSTEM PROMPT
        ===================================== */

        const systemPrompt = `

You are LOGIC-LEAF.

You are a highly capable general AI assistant.

Developer:
V.CHENCHUKIRAN

Project:
LOGIC-LEAF

Focus:
CLOUD SECURITY

You help users with:

- general questions
- reasoning
- mathematics
- science
- education
- coding
- debugging
- programming
- writing
- project development
- study assistance
- technical questions
- image understanding
- document analysis

CONVERSATION CONTINUITY:

The conversation history provided to you is important.

Understand references such as:

"it"
"that"
"this"
"the previous one"
"continue"
"as we discussed"
"next"
"what about that"

Maintain the topic naturally.

Do NOT restart the conversation unnecessarily.

If the user asks a follow-up question,
use the previous messages to understand
what they mean.

INDIA CONTEXT:

The user may be in India.

When a question is clearly about India,
prefer Indian context.

Use:
- INR / ₹
- Indian education systems
- Indian exams
- Indian dates and conventions
- Indian services
- Indian examples

Do not assume that every question is about
a foreign country.

However, if the user explicitly asks about
another country, answer for that country.

ACCURACY:

Do not invent facts.

If information is uncertain,
say that it is uncertain.

SEARCH:

When search results are provided,
use them when relevant.

Do not pretend that indexed sources say
something they do not say.

CODE:

When generating code:

- use Markdown code blocks
- identify the language
- make code complete
- avoid unnecessary placeholders
- explain important parts when useful

You are LOGIC-LEAF.

Do not claim to be ChatGPT,
Gemini, Claude, or another company's assistant.

`;


        if (searchEnabled) {

          systemPrompt += `

SEARCH MODE IS ACTIVE.

Use the supplied search results
when they are relevant.

`;
        }


        /* =====================================
           FILE PROCESSING
        ===================================== */

        let fileContext =
          "";


        let imageData =
          null;


        if (file) {

          const fileName =
            String(
              file.name ||
              "uploaded-file"
            );


          const fileType =
            String(
              file.type ||
              ""
            );


          const fileData =
            String(
              file.data ||
              ""
            );


          /*
             IMAGE
          */

          if (
            fileType.startsWith(
              "image/"
            )
          ) {

            imageData =
              fileData;

          }


          /*
             TEXT / CODE
          */

          else if (
            fileType.startsWith("text/") ||
            /\.(js|css|html|py|java|cpp|c|h|md|json|csv|xml|sql)$/i
              .test(fileName)
          ) {

            try {

              fileContext =
                decodeDataURL(
                  fileData
                );

            } catch {

              fileContext =
                "";
            }

          }


          /*
             PDF
          */

          else if (
            fileName
              .toLowerCase()
              .endsWith(".pdf")
          ) {

            fileContext = `

The user uploaded a PDF named:
${fileName}

The current Worker received the PDF,
but PDF text extraction is not available
in this lightweight Worker implementation.

Do not invent the PDF contents.

Ask the user to provide the relevant text
if direct PDF extraction is unavailable.

`;

          }

        }


        /* =====================================
           BUILD MODEL MESSAGES
        ===================================== */

        const modelMessages = [

          {
            role:
              "system",

            content:
              systemPrompt
          }

        ];


        /*
          Previous conversation
        */

        for (
          const item of previousMessages
        ) {

          if (
            item.role === "user" ||
            item.role === "assistant"
          ) {

            modelMessages.push({

              role:
                item.role,

              content:
                String(
                  item.content || ""
                ).slice(
                  0,
                  12000
                )

            });

          }

        }


        let finalUserMessage =
          message;


        if (fileContext) {

          finalUserMessage += `

UPLOADED FILE:

${fileContext}

Please analyze the uploaded file
as part of your answer.
`;

        }


        if (searchContext) {

          finalUserMessage += `

SEARCH RESULTS:

${searchContext}

Use these results when relevant.
`;

        }


        /*
          Vision request
        */

        if (imageData) {

          /*
            Cloudflare's Llama Vision model
            accepts image data alongside the
            request.
          */

          const visionPrompt = {

            role:
              "user",

            content:
              finalUserMessage

          };


          let visionResult;


          try {

            visionResult =
              await env.AI.run(
                VISION_MODEL,
                {
                  messages: [
                    {
                      role:
                        "system",

                      content:
                        systemPrompt
                    },

                    ...previousMessages.slice(
                      -10
                    ),

                    visionPrompt
                  ],

                  image:
                    imageData,

                  max_tokens:
                    4096
                }
              );


          } catch (visionError) {

            console.error(
              "VISION ERROR",
              visionError
            );


            return json({

              ok:
                false,

              error:
                "Image understanding failed. Make sure the Cloudflare Vision model is enabled for this Worker."

            }, cors, 500);
          }


          const answer =
            extractAIText(
              visionResult
            );


          await saveMessages(
            env,
            conversationId,
            userId,
            message ||
              `Analyze ${file?.name || "image"}`,
            answer
          );


          return json({

            ok:
              true,

            answer,

            conversationId,

            sources,

            vision:
              true,

            model:
              VISION_MODEL

          }, cors);
        }


        /*
          Normal text request
        */

        modelMessages.push({

          role:
            "user",

          content:
            finalUserMessage

        });


        let result;


        try {

          result =
            await env.AI.run(
              CHAT_MODEL,
              {
                messages:
                  modelMessages,

                max_tokens:
                  4096,

                temperature:
                  0.6
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


        } catch (aiError) {

          console.error(
            "AI ERROR",
            aiError
          );


          return json({

            ok:
              false,

            error:
              aiError?.message ||
              "Workers AI request failed"

          }, cors, 500);
        }


        const answer =
          extractAIText(
            result
          );


        /* =====================================
           SAVE
        ===================================== */

        await saveMessages(
          env,
          conversationId,
          userId,
          message,
          answer
        );


        return json({

          ok:
            true,

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


      /* =========================================
         IMAGE GENERATION
      ========================================= */

      if (
        url.pathname === "/v1/image" &&
        request.method === "POST"
      ) {

        const body =
          await request.json();


        const prompt =
          String(
            body.prompt ||
            ""
          ).trim();


        if (!prompt) {

          return json({

            ok:
              false,

            error:
              "Image prompt required"

          }, cors, 400);
        }


        if (!env.AI) {

          return json({

            ok:
              false,

            error:
              "Workers AI binding is missing"

          }, cors, 500);
        }


        let result;


        try {

          result =
            await env.AI.run(
              IMAGE_MODEL,
              {
                prompt,

                steps:
                  4,

                seed:
                  Math.floor(
                    Math.random() *
                    2147483647
                  )
              }
            );


        } catch (error) {

          console.error(
            "IMAGE ERROR",
            error
          );


          return json({

            ok:
              false,

            error:
              error?.message ||
              "Image generation failed"

          }, cors, 500);
        }


        if (
          !result?.image
        ) {

          return json({

            ok:
              false,

            error:
              "The configured image model did not return an image."

          }, cors, 500);
        }


        /*
          FLUX returns base64 image data.
        */

        const dataURI =
          `data:image/jpeg;base64,${result.image}`;


        return json({

          ok:
            true,

          image:
            dataURI,

          message:
            "Generated image"

        }, cors);

      }


      /* =========================================
         PDF / DOCUMENT
      ========================================= */

      if (
        url.pathname === "/v1/pdf" &&
        request.method === "POST"
      ) {

        const body =
          await request.json();


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

            ok:
              false,

            error:
              "PDF request required"

          }, cors, 400);
        }


        let result;


        try {

          result =
            await env.AI.run(
              CHAT_MODEL,
              {
                messages: [

                  {
                    role:
                      "system",

                    content: `

Create a professional printable document.

Return ONLY HTML content.

Do not use Markdown fences.

Do not include JavaScript.

Use:

- headings
- paragraphs
- lists
- tables
- sections

when appropriate.

`
                  },

                  {
                    role:
                      "user",

                    content:
                      `Title:
${title}

Request:
${prompt}`
                  }

                ],

                max_tokens:
                  4096

              }
            );


        } catch (error) {

          return json({

            ok:
              false,

            error:
              error?.message ||
              "Document generation failed"

          }, cors, 500);
        }


        let content =
          extractAIText(
            result
          );


        content =
          cleanHTML(
            content
          );


        const document =
          `<!doctype html>

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

<h1>
${escapeHTML(title)}
</h1>

${content}

<div class="footer">
Created with LOGIC-LEAF
</div>

</body>

</html>`;


        /*
          Return an HTML document as a data URL.
          The browser can open/print it as PDF.
        */

        const encoded =
          base64Encode(
            new TextEncoder()
              .encode(document)
          );


        const dataURL =
          `data:text/html;base64,${encoded}`;


        return json({

          ok:
            true,

          title,

          url:
            dataURL,

          html:
            document,

          message:
            "Document generated. Open it and use Print → Save as PDF."

        }, cors);

      }


      /* =========================================
         HISTORY
      ========================================= */

      if (
        url.pathname === "/v1/history" &&
        request.method === "POST"
      ) {

        if (!env.DB) {

          return json({

            ok:
              false,

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


        await ensureDatabase(
          env
        );


        const result =
          await env.DB
            .prepare(`
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

          ok:
            true,

          chats:
            result.results || []

        }, cors);
      }


      /* =========================================
         CONVERSATION
      ========================================= */

      if (
        url.pathname === "/v1/conversation" &&
        request.method === "POST"
      ) {

        if (!env.DB) {

          return json({

            ok:
              false,

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

            ok:
              false,

            error:
              "Conversation ID required"

          }, cors, 400);
        }


        await ensureDatabase(
          env
        );


        const result =
          await env.DB
            .prepare(`
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

          ok:
            true,

          messages:
            result.results || []

        }, cors);
      }


      /* =========================================
         CREATE API KEY
      ========================================= */

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

            ok:
              false,

            error:
              auth.error

          }, cors, 401);
        }


        if (!env.QTM_KEYS) {

          return json({

            ok:
              false,

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

          ok:
            true,

          apiKey:
            rawKey,

          warning:
            "Copy this key now. It will not be shown again."

        }, cors);
      }


      /* =========================================
         REVOKE API KEY
      ========================================= */

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

            ok:
              false,

            error:
              auth.error

          }, cors, 401);
        }


        if (!env.QTM_KEYS) {

          return json({

            ok:
              false,

            error:
              "KV unavailable"

          }, cors, 500);
        }


        const body =
          await request.json();


        const key =
          String(
            body.apiKey ||
            ""
          );


        if (!key) {

          return json({

            ok:
              false,

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

            ok:
              false,

            error:
              "API key not found"

          }, cors, 404);
        }


        await env.QTM_KEYS.delete(
          `apikey:${hash}`
        );


        return json({

          ok:
            true

        }, cors);
      }


      /* =========================================
         PUBLIC API
      ========================================= */

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

            ok:
              false,

            error:
              auth.error

          }, cors, 401);
        }


        const body =
          await request.json();


        const message =
          String(
            body.message ||
            ""
          ).trim();


        if (!message) {

          return json({

            ok:
              false,

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

              ]

            }
          );


        return json({

          ok:
            true,

          answer:
            extractAIText(result)

        }, cors);
      }


      /* =========================================
         NOT FOUND
      ========================================= */

      return json({

        ok:
          false,

        error:
          "Endpoint not found"

      }, cors, 404);


    } catch (error) {

      console.error(
        "WORKER ERROR:",
        error
      );


      return json({

        ok:
          false,

        error:
          error?.message ||
          "Server error"

      }, cors, 500);
    }
  }
};


/* =====================================================
   DATABASE
===================================================== */

async function ensureDatabase(env) {

  await env.DB
    .prepare(`
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
    `)
    .run();


  await env.DB
    .prepare(`
      CREATE INDEX IF NOT EXISTS
      idx_messages_conversation
      ON messages(conversation_id)
    `)
    .run();


  await env.DB
    .prepare(`
      CREATE INDEX IF NOT EXISTS
      idx_messages_user
      ON messages(user_id)
    `)
    .run();
}


/* =====================================================
   SAVE CHAT
===================================================== */

async function saveMessages(
  env,
  conversationId,
  userId,
  userMessage,
  assistantMessage
) {

  if (!env.DB) {
    return;
  }


  try {

    await ensureDatabase(
      env
    );


    const now =
      new Date()
        .toISOString();


    await env.DB
      .prepare(`
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
        userMessage,
        now
      )
      .run();


    await env.DB
      .prepare(`
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
        assistantMessage,
        new Date()
          .toISOString()
      )
      .run();


  } catch (error) {

    console.error(
      "D1 SAVE ERROR",
      error
    );
  }
}


/* =====================================================
   FIREBASE AUTH
===================================================== */

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

        ok:
          false,

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

        ok:
          false,

        error:
          "Invalid authentication"

      };
    }


    if (
      !env.FIREBASE_WEB_API_KEY
    ) {

      return {

        ok:
          false,

        error:
          "FIREBASE_WEB_API_KEY secret is missing"

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

        ok:
          false,

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

        ok:
          false,

        error:
          "User not found"

      };
    }


    return {

      ok:
        true,

      uid:
        user.localId,

      email:
        user.email || ""

    };


  } catch {

    return {

      ok:
        false,

      error:
        "Authentication verification failed"

    };
  }
}


/* =====================================================
   API KEY AUTH
===================================================== */

async function authenticateApiKey(
  request,
  env
) {

  try {

    if (!env.QTM_KEYS) {

      return {

        ok:
          false,

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

        ok:
          false,

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

        ok:
          false,

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

        ok:
          false,

        error:
          "Invalid or revoked API key"

      };
    }


    return {

      ok:
        true,

      uid:
        record.uid

    };


  } catch {

    return {

      ok:
        false,

      error:
        "API authentication failed"

    };
  }
}


/* =====================================================
   AI RESULT EXTRACTION
===================================================== */

function extractAIText(
  result
) {

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
    typeof result.result === "string"
  ) {

    return result.result;
  }


  if (
    typeof result.result?.response === "string"
  ) {

    return result.result.response;
  }


  if (
    typeof result.text === "string"
  ) {

    return result.text;
  }


  return JSON.stringify(
    result
  );
}


/* =====================================================
   DATA URL DECODER
===================================================== */

function decodeDataURL(
  dataURL
) {

  if (
    !dataURL.includes(",")
  ) {

    return dataURL;
  }


  const comma =
    dataURL.indexOf(",");


  const metadata =
    dataURL.slice(
      0,
      comma
    );


  const data =
    dataURL.slice(
      comma + 1
    );


  if (
    metadata.includes(
      ";base64"
    )
  ) {

    const binary =
      atob(data);


    return new TextDecoder()
      .decode(
        Uint8Array.from(
          binary,
          c =>
            c.charCodeAt(0)
        )
      );
  }


  return decodeURIComponent(
    data
  );
}


/* =====================================================
   CLEAN HTML
===================================================== */

function cleanHTML(
  html
) {

  return String(
    html || ""
  )

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


/* =====================================================
   SHA256
===================================================== */

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
      b =>
        b
          .toString(16)
          .padStart(2, "0")
    )

    .join("");
}


/* =====================================================
   RANDOM TOKEN
===================================================== */

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
      b =>
        b
          .toString(16)
          .padStart(2, "0")
    )

    .join("");
}


/* =====================================================
   BASE64
===================================================== */

function base64Encode(
  bytes
) {

  let binary =
    "";


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


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHTML(
  value
) {

  return String(
    value
  )

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


/* =====================================================
   JSON RESPONSE
===================================================== */

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
