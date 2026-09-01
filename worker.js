// ============================================================
// LOGIC-LEAF AI
// Cloudflare Worker Backend
// ============================================================

const CHAT_MODEL =
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const VISION_MODEL =
  "@cf/meta/llama-3.2-11b-vision-instruct";

const IMAGE_MODEL =
  "@cf/black-forest-labs/flux-1-schnell";

// ============================================================
// CORS
// ============================================================

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods":
    "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-User-ID",
  "Access-Control-Max-Age": "86400"
};

// ============================================================
// RESPONSE HELPERS
// ============================================================

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...CORS_HEADERS,
        "Content-Type":
          "application/json; charset=utf-8"
      }
    }
  );
}

function makeId() {
  return crypto.randomUUID();
}

// ============================================================
// DATABASE SETUP
// ============================================================

async function ensureTables(env) {
  if (!env.DB) return;

  await env.DB.batch([
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `),

    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `),

    env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS
      idx_chats_user
      ON chats(user_id)
    `),

    env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS
      idx_messages_chat
      ON messages(chat_id)
    `)
  ]);
}

// ============================================================
// USER ID
// ============================================================

function getUserId(request, body = {}) {
  return (
    request.headers.get("X-User-ID") ||
    body.userId ||
    body.uid ||
    "guest"
  );
}

// ============================================================
// MAIN WORKER
// ============================================================

export default {

  async fetch(request, env) {

    try {

      // ------------------------------------------------------
      // CORS PREFLIGHT
      // ------------------------------------------------------

      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: CORS_HEADERS
        });
      }

      const url = new URL(request.url);
      const path = url.pathname;

      // ------------------------------------------------------
      // ROOT
      // ------------------------------------------------------

      if (
        path === "/" &&
        request.method === "GET"
      ) {

        return json({
          ok: true,
          name: "LOGIC-LEAF",
          status: "online",
          message:
            "LOGIC-LEAF AI Worker is running.",
          endpoints: [
            "/health",
            "/v1/chat",
            "/v1/image",
            "/v1/vision",
            "/v1/history",
            "/v1/history/save",
            "/v1/api/keys"
          ]
        });

      }

      // ------------------------------------------------------
      // HEALTH
      // ------------------------------------------------------

      if (
        path === "/health" &&
        request.method === "GET"
      ) {

        return json({
          ok: true,
          name: "LOGIC-LEAF",
          status: "online",
          ai: !!env.AI,
          database: !!env.DB,
          kv: !!env.QTM_KEYS,
          endpoint: "/v1/chat"
        });

      }

      // ======================================================
      // AI CHAT
      // ======================================================

      if (
        path === "/v1/chat" &&
        request.method === "POST"
      ) {

        if (!env.AI) {
          return json({
            ok: false,
            error:
              "Workers AI binding is missing."
          }, 500);
        }

        const body =
          await request.json();

        let messages =
          Array.isArray(body.messages)
            ? body.messages
            : [];

        const prompt =
          body.prompt ||
          body.message ||
          "";

        if (
          messages.length === 0 &&
          !prompt
        ) {

          return json({
            ok: false,
            error:
              "No message provided."
          }, 400);

        }

        if (messages.length === 0) {

          messages = [
            {
              role: "user",
              content: prompt
            }
          ];

        }

        const systemMessage = {
          role: "system",
          content: `
You are LOGIC-LEAF, a general-purpose AI assistant.

Help users with:
- General questions
- Reasoning
- Mathematics
- Science
- Programming
- Coding
- Study assistance
- Writing
- Problem solving

Give clear, useful and accurate answers.

When a problem is complicated,
break it into understandable steps.

Do not claim that you performed an
action when you did not actually perform it.
          `.trim()
        };

        const result =
          await env.AI.run(
            CHAT_MODEL,
            {
              messages: [
                systemMessage,
                ...messages
              ],
              max_tokens:
                body.max_tokens || 4096,
              temperature:
                typeof body.temperature ===
                "number"
                  ? body.temperature
                  : 0.7
            }
          );

        const answer =
          result?.response ||
          result?.output_text ||
          result?.text ||
          "";

        return json({
          ok: true,
          type: "chat",
          model: CHAT_MODEL,
          response: answer,
          answer
        });

      }

      // ======================================================
      // IMAGE GENERATION
      // ======================================================

      if (
        path === "/v1/image" &&
        request.method === "POST"
      ) {

        if (!env.AI) {
          return json({
            ok: false,
            error:
              "Workers AI binding is missing."
          }, 500);
        }

        const body =
          await request.json();

        const prompt =
          String(
            body.prompt ||
            body.message ||
            ""
          ).trim();

        if (!prompt) {

          return json({
            ok: false,
            error:
              "Image prompt is required."
          }, 400);

        }

        const result =
          await env.AI.run(
            IMAGE_MODEL,
            {
              prompt,
              num_steps:
                body.num_steps || 4
            }
          );

        // Workers AI image models
        // commonly return a Response.

        if (
          result instanceof Response
        ) {

          return new Response(
            result.body,
            {
              status: result.status,
              headers: {
                ...CORS_HEADERS,
                "Content-Type":
                  result.headers.get(
                    "Content-Type"
                  ) ||
                  "image/png"
              }
            }
          );

        }

        // Fallback for object responses.

        if (result?.image) {

          return json({
            ok: true,
            type: "image",
            image: result.image
          });

        }

        return json({
          ok: true,
          type: "image",
          result
        });

      }

      // ======================================================
      // IMAGE UNDERSTANDING / VISION
      // ======================================================

      if (
        path === "/v1/vision" &&
        request.method === "POST"
      ) {

        if (!env.AI) {
          return json({
            ok: false,
            error:
              "Workers AI binding is missing."
          }, 500);
        }

        const body =
          await request.json();

        const prompt =
          body.prompt ||
          body.message ||
          "Analyze this image and explain what you see.";

        const image =
          body.image ||
          body.image_base64 ||
          body.imageBase64;

        if (!image) {

          return json({
            ok: false,
            error:
              "Image data is required."
          }, 400);

        }

        let base64 =
          String(image);

        if (
          base64.includes(",")
        ) {
          base64 =
            base64.split(",")[1];
        }

        let bytes;

        try {

          bytes =
            Uint8Array.from(
              atob(base64),
              c =>
                c.charCodeAt(0)
            );

        } catch {

          return json({
            ok: false,
            error:
              "Invalid base64 image data."
          }, 400);

        }

        const result =
          await env.AI.run(
            VISION_MODEL,
            {
              messages: [
                {
                  role: "user",
                  content: prompt,
                  image:
                    Array.from(bytes)
                }
              ]
            }
          );

        const answer =
          result?.response ||
          result?.output_text ||
          result?.text ||
          "";

        return json({
          ok: true,
          type: "vision",
          model: VISION_MODEL,
          response: answer,
          answer
        });

      }

      // ======================================================
      // GET CHAT HISTORY
      // ======================================================

      if (
        path === "/v1/history" &&
        request.method === "GET"
      ) {

        if (!env.DB) {

          return json({
            ok: false,
            error:
              "D1 database binding is missing."
          }, 500);

        }

        await ensureTables(env);

        const userId =
          request.headers.get(
            "X-User-ID"
          ) ||
          url.searchParams.get(
            "userId"
          ) ||
          "guest";

        const result =
          await env.DB.prepare(`
            SELECT
              id,
              title,
              created_at,
              updated_at
            FROM chats
            WHERE user_id = ?
            ORDER BY updated_at DESC
          `)
          .bind(userId)
          .all();

        return json({
          ok: true,
          chats:
            result.results || []
        });

      }

      // ======================================================
      // GET ONE CHAT
      // ======================================================

      if (
        path.startsWith(
          "/v1/history/"
        ) &&
        request.method === "GET"
      ) {

        if (!env.DB) {

          return json({
            ok: false,
            error:
              "D1 database binding is missing."
          }, 500);

        }

        await ensureTables(env);

        const chatId =
          path
            .replace(
              "/v1/history/",
              ""
            )
            .trim();

        if (!chatId) {

          return json({
            ok: false,
            error:
              "Chat ID required."
          }, 400);

        }

        const result =
          await env.DB.prepare(`
            SELECT
              id,
              chat_id,
              role,
              content,
              created_at
            FROM messages
            WHERE chat_id = ?
            ORDER BY created_at ASC
          `)
          .bind(chatId)
          .all();

        return json({
          ok: true,
          chatId,
          messages:
            result.results || []
        });

      }

      // ======================================================
      // SAVE CHAT
      // ======================================================

      if (
        path ===
          "/v1/history/save" &&
        request.method === "POST"
      ) {

        if (!env.DB) {

          return json({
            ok: false,
            error:
              "D1 database binding is missing."
          }, 500);

        }

        const body =
          await request.json();

        await ensureTables(env);

        const userId =
          getUserId(
            request,
            body
          );

        const chatId =
          body.chatId ||
          body.id ||
          makeId();

        const title =
          body.title ||
          "New chat";

        const messages =
          Array.isArray(
            body.messages
          )
            ? body.messages
            : [];

        const now =
          new Date().toISOString();

        const existing =
          await env.DB.prepare(`
            SELECT id
            FROM chats
            WHERE id = ?
          `)
          .bind(chatId)
          .first();

        if (!existing) {

          await env.DB.prepare(`
            INSERT INTO chats
            (
              id,
              user_id,
              title,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?)
          `)
          .bind(
            chatId,
            userId,
            title,
            now,
            now
          )
          .run();

        } else {

          await env.DB.prepare(`
            UPDATE chats
            SET
              title = ?,
              updated_at = ?
            WHERE id = ?
          `)
          .bind(
            title,
            now,
            chatId
          )
          .run();

        }

        await env.DB.prepare(`
          DELETE FROM messages
          WHERE chat_id = ?
        `)
        .bind(chatId)
        .run();

        for (
          const message of messages
        ) {

          if (
            !message ||
            !message.role
          ) {
            continue;
          }

          const content =
            typeof message.content ===
            "string"
              ? message.content
              : JSON.stringify(
                  message.content
                );

          await env.DB.prepare(`
            INSERT INTO messages
            (
              id,
              chat_id,
              role,
              content,
              created_at
            )
            VALUES (?, ?, ?, ?, ?)
          `)
          .bind(
            makeId(),
            chatId,
            message.role,
            content,
            message.created_at ||
              now
          )
          .run();

        }

        return json({
          ok: true,
          chatId,
          saved:
            messages.length
        });

      }

      // ======================================================
      // DELETE CHAT
      // ======================================================

      if (
        path.startsWith(
          "/v1/history/"
        ) &&
        request.method === "DELETE"
      ) {

        if (!env.DB) {

          return json({
            ok: false,
            error:
              "D1 database binding is missing."
          }, 500);

        }

        await ensureTables(env);

        const chatId =
          path
            .replace(
              "/v1/history/",
              ""
            )
            .trim();

        if (!chatId) {

          return json({
            ok: false,
            error:
              "Chat ID required."
          }, 400);

        }

        await env.DB.prepare(`
          DELETE FROM messages
          WHERE chat_id = ?
        `)
        .bind(chatId)
        .run();

        await env.DB.prepare(`
          DELETE FROM chats
          WHERE id = ?
        `)
        .bind(chatId)
        .run();

        return json({
          ok: true,
          deleted: chatId
        });

      }

      // ======================================================
      // CREATE API KEY
      // ======================================================

      if (
        path === "/v1/api/keys" &&
        request.method === "POST"
      ) {

        if (!env.QTM_KEYS) {

          return json({
            ok: false,
            error:
              "QTM_KEYS KV binding is missing."
          }, 500);

        }

        const body =
          await request.json();

        const userId =
          getUserId(
            request,
            body
          );

        const key =
          "ll_" +
          crypto.randomUUID()
            .replaceAll("-", "");

        const record = {
          userId,
          createdAt:
            new Date().toISOString()
        };

        await env.QTM_KEYS.put(
          key,
          JSON.stringify(record)
        );

        return json({
          ok: true,
          apiKey: key,
          createdAt:
            record.createdAt
        });

      }

      // ======================================================
      // LIST API KEYS
      // ======================================================

      if (
        path === "/v1/api/keys" &&
        request.method === "GET"
      ) {

        if (!env.QTM_KEYS) {

          return json({
            ok: false,
            error:
              "QTM_KEYS KV binding is missing."
          }, 500);

        }

        const userId =
          request.headers.get(
            "X-User-ID"
          ) || "guest";

        const list =
          await env.QTM_KEYS.list();

        const keys = [];

        for (
          const item of list.keys
        ) {

          const value =
            await env.QTM_KEYS.get(
              item.name,
              "json"
            );

          if (
            value &&
            value.userId === userId
          ) {

            keys.push({
              key:
                item.name.slice(
                  0,
                  8
                ) + "••••••••",
              createdAt:
                value.createdAt
            });

          }

        }

        return json({
          ok: true,
          keys
        });

      }

      // ======================================================
      // DELETE API KEY
      // ======================================================

      if (
        path === "/v1/api/keys" &&
        request.method === "DELETE"
      ) {

        if (!env.QTM_KEYS) {

          return json({
            ok: false,
            error:
              "QTM_KEYS KV binding is missing."
          }, 500);

        }

        const body =
          await request.json();

        const key =
          body.key;

        if (!key) {

          return json({
            ok: false,
            error:
              "API key required."
          }, 400);

        }

        const value =
          await env.QTM_KEYS.get(
            key,
            "json"
          );

        if (!value) {

          return json({
            ok: false,
            error:
              "API key not found."
          }, 404);

        }

        const userId =
          getUserId(
            request,
            body
          );

        if (
          value.userId !==
          userId
        ) {

          return json({
            ok: false,
            error:
              "You cannot revoke this API key."
          }, 403);

        }

        await env.QTM_KEYS.delete(
          key
        );

        return json({
          ok: true,
          revoked: true
        });

      }

      // ======================================================
      // NOT FOUND
      // ======================================================

      return json({
        ok: false,
        error:
          "Endpoint not found.",
        path
      }, 404);

    } catch (error) {

      console.error(
        "LOGIC-LEAF ERROR:",
        error
      );

      return json({
        ok: false,
        error:
          "Worker request failed.",
        message:
          error?.message ||
          String(error)
      }, 500);

    }

  }

};
