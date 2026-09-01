// ============================================================
// LOGIC-LEAF UNIVERSAL AI WORKER
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

const MAX_FILE_BYTES =
  15 * 1024 * 1024;


// ============================================================
// MAIN WORKER
// ============================================================

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


    // --------------------------------------------------------
    // CORS
    // --------------------------------------------------------

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

          models: {

            chat: CHAT_MODEL,

            vision: VISION_MODEL,

            image: IMAGE_MODEL

          },

          endpoints: {

            chat: "/v1/chat",

            vision: "/v1/vision",

            search: "/v1/search",

            image: "/v1/image",

            pdf: "/v1/pdf",

            file: "/v1/file",

            history: "/v1/history",

            conversation:
              "/v1/conversation",

            keys:
              "/v1/keys/create",

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
                role: "user",
                content: query
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

              id: index + 1,

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
          await safeJSON(request);


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


        if (!env.AI) {

          return json({
            ok: false,
            error:
              "Workers AI binding missing"
          }, cors, 500);

        }


        // ----------------------------------------------------
        // LOAD PREVIOUS CONVERSATION
        // ----------------------------------------------------

        let previousMessages = [];


        if (env.DB) {

          try {

            await ensureDatabase(
              env
            );


            const history =
              await env.DB.prepare(`
                SELECT
                  role,
                  content
                FROM messages
                WHERE conversation_id = ?
                ORDER BY id DESC
                LIMIT 20
              `)
              .bind(
                conversationId
              )
              .all();


            previousMessages =
              (
                history.results ||
                []
              )
              .reverse()
              .map(
                item => ({

                  role:
                    item.role ===
                    "assistant"
                      ? "assistant"
                      : "user",

                  content:
                    item.content

                })
              );

          } catch (error) {

            console.error(
              "HISTORY LOAD ERROR",
              error
            );

          }

        }


        // ----------------------------------------------------
        // SEARCH
        // ----------------------------------------------------

        let sources = [];

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
                    role: "user",
                    content: message
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


        // ----------------------------------------------------
        // SYSTEM PROMPT
        // ----------------------------------------------------

        let systemPrompt = `

You are LOGIC-LEAF.

You are a capable general-purpose AI assistant.

Your developer is:

V.CHENCHUKIRAN

Focus:
CLOUD SECURITY

You can help with:

- General questions
- Reasoning
- Mathematics
- Science
- Education
- Study assistance
- Coding
- Debugging
- Programming
- HTML
- CSS
- JavaScript
- Python
- Java
- C
- C++
- Projects
- Writing
- Technical explanations
- Document analysis
- Image understanding

IMPORTANT CONVERSATION RULES:

1. Maintain continuity with the current conversation.
2. Use previous messages when they are relevant.
3. Do not restart the topic unnecessarily.
4. If the user says "continue", continue the current topic.
5. If the user says "explain more", expand the previous answer.
6. If the user asks a follow-up question, understand its context.
7. Do not pretend that every question is from a foreign country.
8. Prefer the user's actual wording and context.
9. Do not invent personal information about the user.
10. Answer naturally and directly.

CODING RULES:

- Provide complete usable code when requested.
- Use Markdown code blocks.
- Identify the programming language.
- Do not intentionally omit important sections.
- Explain important configuration requirements.
- Never claim code is deployed unless it actually is.

IDENTITY:

You are LOGIC-LEAF.

Do not claim to be ChatGPT,
Gemini, Claude, or another company's assistant.

`;


        if (searchEnabled) {

          systemPrompt += `

SEARCH MODE:

Search results may be supplied below.

Use them when relevant.

Do not invent facts from search results.

If the results are insufficient,
say that the available indexed information
was insufficient.

`;

        }


        // ----------------------------------------------------
        // BUILD MESSAGE ARRAY
        // ----------------------------------------------------

        const aiMessages = [

          {
            role: "system",
            content:
              systemPrompt
          }

        ];


        for (
          const item of previousMessages
        ) {

          aiMessages.push({
            role:
              item.role,
            content:
              item.content
          });

        }


        let finalMessage =
          message;


        if (
          searchEnabled &&
          searchContext
        ) {

          finalMessage = `

QUESTION:

${message}


SEARCH RESULTS:

${searchContext}


Use the search results only when
they are relevant.

`;

        }


        aiMessages.push({

          role: "user",

          content:
            finalMessage

        });


        // ----------------------------------------------------
        // AI REQUEST
        // ----------------------------------------------------

        const result =
          await env.AI.run(
            CHAT_MODEL,
            {
              messages:
                aiMessages,

              max_tokens:
                4096,

              temperature:
                0.6
            },
            gatewayOptions()
          );


        const answer =
          result?.response ||
          result?.result?.response ||
          "";


        if (!answer) {

          return json({
            ok: false,
            error:
              "AI returned an empty response"
          }, cors, 502);

        }


        // ----------------------------------------------------
        // SAVE USER + AI MESSAGE
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
            CHAT_MODEL,

          gateway:
            "default"

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
            error:
              "Workers AI binding missing"
          }, cors, 500);

        }


        const body =
          await safeJSON(
            request
          );


        const prompt =
          String(
            body.prompt ||
            "Describe and analyze this image."
          );


        let image =
          body.image ||
          body.imageBase64 ||
          null;


        if (!image) {

          return json({
            ok: false,
            error:
              "Image data required"
          }, cors, 400);

        }


        // Remove data URI prefix if supplied.

        image =
          stripDataUri(
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
                    "You are LOGIC-LEAF image analysis assistant. Analyze the supplied image accurately. Do not invent details that cannot be seen."
                },

                {
                  role: "user",

                  content:
                    prompt,

                  image

                }

              ],

              max_tokens:
                2048

            }
          );


        const answer =
          result?.response ||
          result?.result?.response ||
          "";


        return json({

          ok: true,

          answer,

          model:
            VISION_MODEL

        }, cors);

      }


      // ======================================================
      // FILE UPLOAD / ANALYSIS
      // ======================================================

      if (
        url.pathname === "/v1/file" &&
        request.method === "POST"
      ) {

        return await handleFile(
          request,
          env,
          cors
        );

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
            error:
              "Workers AI binding missing"
          }, cors, 500);

        }


        const body =
          await safeJSON(
            request
          );


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


        if (
          prompt.length >
          2048
        ) {

          return json({
            ok: false,
            error:
              "Image prompt is too long"
          }, cors, 400);

        }


        try {

          const result =
            await env.AI.run(
              IMAGE_MODEL,
              {

                prompt,

                steps:
                  Math.min(
                    Math.max(
                      Number(
                        body.steps ||
                        4
                      ),
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
                "Image model returned no image"
            }, cors, 502);

          }


          return json({

            ok: true,

            type:
              "image",

            mime:
              "image/jpeg",

            image,

            dataURI:
              `data:image/jpeg;base64,${image}`,

            model:
              IMAGE_MODEL

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
              "Image generation failed",

            model:
              IMAGE_MODEL

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

        if (!env.AI) {

          return json({
            ok: false,
            error:
              "Workers AI binding missing"
          }, cors, 500);

        }


        const body =
          await safeJSON(
            request
          );


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


        const result =
          await env.AI.run(
            CHAT_MODEL,
            {

              messages: [

                {
                  role:
                    "system",

                  content: `
Create a professional printable document.

Return ONLY valid HTML.

Do not return Markdown.

Do not include JavaScript.

Use:

<h1>
<h2>
<h3>
<p>
<ul>
<ol>
<table>

when appropriate.

Do not include html,
head,
body,
or script tags.
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

            },

            gatewayOptions()
          );


        let content =
          result?.response ||
          "";


        content =
          cleanGeneratedHTML(
            content
          );


        const documentHTML =
          createPrintableHTML(
            title,
            content
          );


        return json({

          ok: true,

          type:
            "html-document",

          title,

          html:
            documentHTML

        }, cors);

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
          await safeJSON(
            request
          );


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
              MAX(created_at) AS updated_at,
              MAX(
                CASE
                  WHEN role = 'user'
                  THEN SUBSTR(content, 1, 80)
                  ELSE NULL
                END
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
            result.results ||
            []

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
            error:
              "D1 unavailable"
          }, cors, 500);

        }


        const body =
          await safeJSON(
            request
          );


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
            result.results ||
            []

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
            "Copy this key now. It will not be displayed again."

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
          await safeJSON(
            request
          );


        const key =
          String(
            body.apiKey ||
            ""
          ).trim();


        if (!key) {

          return json({
            ok: false,
            error:
              "API key required"
          }, cors, 400);

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


        if (
          !record ||
          record.uid !==
          auth.uid
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
            error:
              auth.error
          }, cors, 401);

        }


        const body =
          await safeJSON(
            request
          );


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

            },

            gatewayOptions()
          );


        return json({

          ok: true,

          answer:
            result?.response ||
            "",

          model:
            CHAT_MODEL

        }, cors);

      }


      // ======================================================
      // NOT FOUND
      // ======================================================

      return json({

        ok: false,

        error:
          "Endpoint not found",

        path:
          url.pathname

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


// ============================================================
// FILE HANDLER
// ============================================================

async function handleFile(
  request,
  env,
  cors
) {

  if (!env.AI) {

    return json({
      ok: false,
      error:
        "Workers AI binding missing"
    }, cors, 500);

  }


  const contentType =
    request.headers.get(
      "content-type"
    ) || "";


  // ----------------------------------------------------------
  // JSON BASE64 IMAGE
  // ----------------------------------------------------------

  if (
    contentType
      .toLowerCase()
      .includes(
        "application/json"
      )
  ) {

    const body =
      await safeJSON(
        request
      );


    if (
      body.image ||
      body.imageBase64
    ) {

      const image =
        stripDataUri(
          body.image ||
          body.imageBase64
        );


      const prompt =
        String(
          body.prompt ||
          "Analyze this image."
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
                  "You are LOGIC-LEAF. Analyze the supplied image accurately."
              },

              {
                role:
                  "user",

                content:
                  prompt,

                image

              }

            ],

            max_tokens:
              2048

          }
        );


      return json({

        ok: true,

        type:
          "image",

        answer:
          result?.response ||
          "",

        model:
          VISION_MODEL

      }, cors);

    }


    return json({
      ok: false,
      error:
        "No supported file data found"
    }, cors, 400);

  }


  // ----------------------------------------------------------
  // MULTIPART FILE
  // ----------------------------------------------------------

  if (
    contentType
      .toLowerCase()
      .includes(
        "multipart/form-data"
      )
  ) {

    const form =
      await request.formData();


    const file =
      form.get("file");


    const prompt =
      String(
        form.get("prompt") ||
        "Analyze this file."
      );


    if (
      !file ||
      typeof file ===
      "string"
    ) {

      return json({
        ok: false,
        error:
          "File required"
      }, cors, 400);

    }


    if (
      file.size >
      MAX_FILE_BYTES
    ) {

      return json({
        ok: false,
        error:
          "File is larger than 15 MB"
      }, cors, 413);

    }


    const mime =
      file.type ||
      "application/octet-stream";


    const name =
      file.name ||
      "uploaded-file";


    // --------------------------------------------------------
    // IMAGE
    // --------------------------------------------------------

    if (
      mime.startsWith(
        "image/"
      )
    ) {

      const bytes =
        new Uint8Array(
          await file.arrayBuffer()
        );


      const base64 =
        bytesToBase64(
          bytes
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
                  "You are LOGIC-LEAF. Carefully analyze the supplied image. Do not invent visual details."
              },

              {
                role:
                  "user",

                content:
                  prompt,

                image:
                  base64

              }

            ],

            max_tokens:
              2048

          }
        );


      return json({

        ok: true,

        type:
          "image",

        filename:
          name,

        answer:
          result?.response ||
          "",

        model:
          VISION_MODEL

      }, cors);

    }


    // --------------------------------------------------------
    // TEXT / CODE
    // --------------------------------------------------------

    if (
      mime.startsWith(
        "text/"
      ) ||
      /\.(txt|md|csv|json|js|css|html|py|java|c|cpp|h|xml)$/i
        .test(name)
    ) {

      const text =
        await file.text();


      const limited =
        text.slice(
          0,
          100000
        );


      const result =
        await env.AI.run(
          CHAT_MODEL,
          {

            messages: [

              {
                role:
                  "system",

                content:
                  `You are LOGIC-LEAF.

Analyze the supplied file.

Filename:
${name}

Give a useful answer to the user's request.

Do not invent file contents.`
              },

              {
                role:
                  "user",

                content:
                  `User request:

${prompt}

File contents:

${limited}`
              }

            ],

            max_tokens:
              4096

          },

          gatewayOptions()
        );


      return json({

        ok: true,

        type:
          "text",

        filename:
          name,

        answer:
          result?.response ||
          "",

        model:
          CHAT_MODEL

      }, cors);

    }


    // --------------------------------------------------------
    // PDF / DOCUMENT
    // --------------------------------------------------------

    if (
      mime ===
      "application/pdf" ||
      /\.pdf$/i.test(name)
    ) {

      return await analyzeDocument(
        file,
        name,
        prompt,
        env,
        cors
      );

    }


    // --------------------------------------------------------
    // FALLBACK
    // --------------------------------------------------------

    return json({

      ok: false,

      error:
        `Unsupported file type: ${mime}`,

      filename:
        name

    }, cors, 415);

  }


  return json({

    ok: false,

    error:
      "Send JSON or multipart/form-data"

  }, cors, 400);

}


// ============================================================
// DOCUMENT ANALYSIS
// ============================================================

async function analyzeDocument(
  file,
  filename,
  prompt,
  env,
  cors
) {

  /*
    Cloudflare's current document conversion API is a REST
    service. A Worker binding does not automatically expose
    that REST conversion API.

    If you configure:

      CLOUDFLARE_ACCOUNT_ID
      CLOUDFLARE_API_TOKEN

    as Worker secrets, this function can use the conversion
    service to turn PDFs/documents into Markdown.
  */


  if (
    !env.CLOUDFLARE_ACCOUNT_ID ||
    !env.CLOUDFLARE_API_TOKEN
  ) {

    return json({

      ok: false,

      error:
        "PDF analysis requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN Worker secrets.",

      filename

    }, cors, 503);

  }


  try {

    const form =
      new FormData();


    form.append(
      "files",
      file,
      filename
    );


    form.append(
      "conversionOptions",
      JSON.stringify({

        output: {
          format:
            "markdown"
        }

      })
    );


    const response =
      await fetch(

        `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
          env.CLOUDFLARE_ACCOUNT_ID
        )}/ai/tomarkdown`,

        {

          method:
            "POST",

          headers: {

            Authorization:
              `Bearer ${env.CLOUDFLARE_API_TOKEN}`

          },

          body:
            form

        }

      );


    const data =
      await response.json();


    if (!response.ok) {

      return json({

        ok: false,

        error:
          data?.errors?.[0]?.message ||
          "Document conversion failed",

        filename

      }, cors, 502);

    }


    const converted =
      data?.result?.[0];


    const markdown =
      converted?.data ||
      "";


    if (!markdown) {

      return json({

        ok: false,

        error:
          "No text could be extracted from the document",

        filename

      }, cors, 422);

    }


    const limited =
      markdown.slice(
        0,
        120000
      );


    const result =
      await env.AI.run(
        CHAT_MODEL,
        {

          messages: [

            {
              role:
                "system",

              content:
                `You are LOGIC-LEAF.

You are analyzing a user-provided document.

Do not invent information.

Use only the supplied document content.

Give a clear answer to the user's request.`
            },

            {
              role:
                "user",

              content:
                `USER REQUEST:

${prompt}

DOCUMENT:

${limited}`
            }

          ],

          max_tokens:
            4096

        },

        gatewayOptions()
      );


    return json({

      ok: true,

      type:
        "document",

      filename,

      answer:
        result?.response ||
        "",

      extracted:
        true,

      model:
        CHAT_MODEL

    }, cors);

  } catch (error) {

    console.error(
      "DOCUMENT ERROR",
      error
    );


    return json({

      ok: false,

      error:
        error?.message ||
        "Document analysis failed",

      filename

    }, cors, 500);

  }

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
          "Firebase API key secret missing"

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
        user.email ||
        ""

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

  } catch {

    return {

      ok: false,

      error:
        "API authentication failed"

    };

  }

}


// ============================================================
// DATABASE
// ============================================================

async function ensureDatabase(
  env
) {

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
  `)
  .run();


  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS
    idx_messages_conversation
    ON messages(conversation_id)
  `)
  .run();


  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS
    idx_messages_user
    ON messages(user_id)
  `)
  .run();

}


// ============================================================
// AI GATEWAY
// ============================================================

function gatewayOptions() {

  return {

    gateway: {

      id:
        "default",

      skipCache:
        false,

      collectLog:
        true

    }

  };

}


// ============================================================
// JSON
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


// ============================================================
// RESPONSE
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


// ============================================================
// HTML
// ============================================================

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


// ============================================================
// GENERATED HTML CLEANUP
// ============================================================

function cleanGeneratedHTML(
  value
) {

  return String(
    value || ""
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


// ============================================================
// PRINTABLE HTML
// ============================================================

function createPrintableHTML(
  title,
  content
) {

  return `<!doctype html>

<html>

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

body {
  font-family:
    Arial,
    Helvetica,
    sans-serif;

  color: #111;

  line-height: 1.6;

  font-size: 14px;
}

.header {

  border-bottom:
    2px solid #111;

  padding-bottom:
    12px;

  margin-bottom:
    24px;

}

h1 {
  font-size:
    28px;
}

h2 {
  margin-top:
    28px;
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

  text-align:
    left;

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

</html>`;

}


// ============================================================
// CRYPTO
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
// DATA URI
// ============================================================

function stripDataUri(
  value
) {

  const text =
    String(value || "");


  if (
    text.startsWith(
      "data:"
    )
  ) {

    const comma =
      text.indexOf(",");


    if (
      comma !== -1
    ) {

      return text.slice(
        comma + 1
      );

    }

  }


  return text;

}


// ============================================================
// BYTES → BASE64
// ============================================================

function bytesToBase64(
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


  return btoa(
    binary
  );

            }
