/*
============================================================
 LOGIC-LEAF — FULL MULTIMODAL AI WORKER
============================================================

Required wrangler bindings:

AI          = Workers AI
DB          = D1 database
QTM_KEYS    = KV namespace

D1 tables:

users
conversations
messages
api_keys
usage
files
search_history

Main endpoints:

GET     /
GET     /api/health
GET     /api/config

POST    /v1/chat
POST    /api/chat

GET     /api/chats
POST    /api/chats
GET     /api/chats/:id
PUT     /api/chats/:id
DELETE  /api/chats/:id

POST    /api/vision
POST    /api/image
POST    /api/transcribe
POST    /api/speech

GET     /api/user

POST    /api/keys
GET     /api/keys
DELETE  /api/keys/:id

POST    /api/search
POST    /api/files

============================================================
*/

const MODELS = {
  CHAT: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  VISION: "@cf/meta/llama-3.2-11b-vision-instruct",
  IMAGE: "@cf/black-forest-labs/flux-1-schnell",
  STT: "@cf/deepgram/nova-3",
  TTS: "@cf/deepgram/aura-1"
};

const APP_NAME = "LOGIC-LEAF";
const VERSION = "5";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods":
    "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400"
};

/* =========================================================
   RESPONSE HELPERS
========================================================= */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function error(message, status = 400, extra = {}) {
  return json(
    {
      ok: false,
      error: message,
      ...extra
    },
    status
  );
}

function now() {
  return Date.now();
}

function makeId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clean(value, max = 20000) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

/* =========================================================
   HASHING / API KEYS
========================================================= */

function randomString(length = 32) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function createApiKey() {
  return `ll_live_${randomString(32)}`;
}

async function sha256(value) {
  const data = new TextEncoder().encode(value);

  const hash = await crypto.subtle.digest(
    "SHA-256",
    data
  );

  return Array.from(new Uint8Array(hash))
    .map(b =>
      b.toString(16).padStart(2, "0")
    )
    .join("");
}

/* =========================================================
   USER AUTH IDENTITY
========================================================= */

/*
   The frontend may send:

   Authorization: Bearer <Google/Firebase token>

   IMPORTANT:
   This Worker does not pretend to verify Google tokens.
   For production Google authentication, the token must be
   verified with your authentication provider.

   API keys created by LOGIC-LEAF ARE verified securely by
   hashing the supplied key and looking it up in D1.
*/

function bearerToken(request) {
  const auth =
    request.headers.get("Authorization") || "";

  if (!auth.startsWith("Bearer ")) {
    return "";
  }

  return auth.slice(7).trim();
}

async function authenticateApiKey(request, env) {
  const token = bearerToken(request);

  if (!token.startsWith("ll_live_")) {
    return null;
  }

  if (!env.DB) return null;

  const hash = await sha256(token);

  const key = await env.DB.prepare(`
    SELECT *
    FROM api_keys
    WHERE key_hash = ?
      AND revoked_at IS NULL
  `)
    .bind(hash)
    .first();

  if (!key) return null;

  return key;
}

function getIdentity(request) {
  const token = bearerToken(request);

  if (!token) {
    return "guest";
  }

  /*
    API-key identities are handled separately.
    For non-API bearer tokens we use a stable hash-like
    identifier rather than storing the raw token in D1.
  */

  if (token.startsWith("ll_live_")) {
    return null;
  }

  return `auth_${token.slice(0, 120)}`;
}

async function getUserId(request, env) {
  const apiKey = await authenticateApiKey(
    request,
    env
  );

  if (apiKey) {
    return apiKey.user_id;
  }

  return getIdentity(request) || "guest";
}

/* =========================================================
   USER
========================================================= */

async function ensureUser(env, userId) {
  if (!env.DB) return;

  await env.DB.prepare(`
    INSERT OR IGNORE INTO users
    (
      id,
      google_id,
      name,
      email,
      avatar_url,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `)
    .bind(
      userId,
      userId === "guest" ? null : userId,
      userId === "guest"
        ? "Guest"
        : "LOGIC-LEAF User",
      null,
      null,
      now()
    )
    .run();
}

/* =========================================================
   CHAT DATABASE
========================================================= */

async function createChat(
  env,
  userId,
  title = "New chat"
) {
  const chatId = makeId("chat");
  const timestamp = now();

  await env.DB.prepare(`
    INSERT INTO conversations
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
      clean(title, 100) || "New chat",
      timestamp,
      timestamp
    )
    .run();

  return chatId;
}

async function findChat(
  env,
  userId,
  chatId
) {
  return env.DB.prepare(`
    SELECT *
    FROM conversations
    WHERE id = ?
      AND user_id = ?
  `)
    .bind(chatId, userId)
    .first();
}

async function getChats(env, userId) {
  const result =
    await env.DB.prepare(`
      SELECT
        id,
        title,
        created_at,
        updated_at
      FROM conversations
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `)
      .bind(userId)
      .all();

  return result.results || [];
}

async function getMessages(
  env,
  chatId
) {
  const result =
    await env.DB.prepare(`
      SELECT
        id,
        role,
        content,
        attachment_url,
        attachment_type,
        created_at
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `)
      .bind(chatId)
      .all();

  return result.results || [];
}

async function saveMessage(
  env,
  chatId,
  role,
  content,
  attachmentUrl = null,
  attachmentType = null
) {
  const messageId = makeId("msg");
  const timestamp = now();

  await env.DB.prepare(`
    INSERT INTO messages
    (
      id,
      conversation_id,
      role,
      content,
      attachment_url,
      attachment_type,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      messageId,
      chatId,
      role,
      clean(content, 50000),
      attachmentUrl,
      attachmentType,
      timestamp
    )
    .run();

  await env.DB.prepare(`
    UPDATE conversations
    SET updated_at = ?
    WHERE id = ?
  `)
    .bind(timestamp, chatId)
    .run();

  return messageId;
}

/* =========================================================
   AI TEXT
========================================================= */

function systemPrompt(mode = "general") {
  const base = `
You are LOGIC-LEAF, a powerful general-purpose AI assistant.

You help users with:

• General questions
• Reasoning
• Mathematics
• Science
• Programming
• Debugging
• Coding
• Study assistance
• Writing
• Summarization
• Planning
• Analysis
• Image understanding
• Files and documents when supplied

Behavior:

1. Be accurate and useful.
2. Never pretend to know something you don't know.
3. Explain difficult concepts clearly.
4. For coding tasks, provide complete useful code.
5. Use Markdown when it improves readability.
6. Keep answers focused on the user's request.
7. Do not claim that an unavailable tool was used.
8. Do not fabricate web sources.
9. When the user supplies an image, reason about its visible content.
`;

  if (mode === "study") {
    return base + `
Act as a patient expert tutor.
Teach step-by-step.
Use examples and practice questions when useful.
`;
  }

  if (mode === "code") {
    return base + `
Act as an experienced software engineer.
Diagnose problems carefully.
Return complete corrected code when appropriate.
`;
  }

  if (mode === "reasoning") {
    return base + `
Solve problems carefully.
Break complex problems into logical steps.
Give the conclusion clearly.
`;
  }

  return base;
}

function extractAIText(result) {
  if (result == null) return "";

  if (typeof result === "string") {
    return result;
  }

  if (typeof result.response === "string") {
    return result.response;
  }

  if (
    result.result &&
    typeof result.result.response === "string"
  ) {
    return result.result.response;
  }

  if (typeof result.text === "string") {
    return result.text;
  }

  return JSON.stringify(result);
}

async function runAIChat(
  env,
  messages,
  options = {}
) {
  return env.AI.run(
    MODELS.CHAT,
    {
      messages,
      max_tokens: Math.min(
        Number(options.max_tokens) || 4096,
        8192
      ),
      temperature:
        typeof options.temperature === "number"
          ? options.temperature
          : 0.5
    }
  );
}

/* =========================================================
   API USAGE LIMIT
========================================================= */

function dateKey() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

async function checkApiLimit(
  env,
  apiKey
) {
  if (!apiKey) {
    return {
      allowed: true
    };
  }

  const today = dateKey();

  const row =
    await env.DB.prepare(`
      SELECT *
      FROM usage
      WHERE user_id = ?
        AND api_key_id = ?
        AND usage_date = ?
    `)
      .bind(
        apiKey.user_id,
        apiKey.id,
        today
      )
      .first();

  const used =
    Number(row?.requests || 0);

  const limit =
    Number(apiKey.daily_limit || 300000);

  if (used >= limit) {
    return {
      allowed: false,
      used,
      limit
    };
  }

  return {
    allowed: true,
    used,
    limit
  };
}

async function recordApiUsage(
  env,
  apiKey
) {
  if (!apiKey || !env.DB) return;

  const today = dateKey();
  const usageId = makeId("usage");

  await env.DB.prepare(`
    INSERT INTO usage
    (
      id,
      user_id,
      api_key_id,
      usage_date,
      requests
    )
    VALUES (?, ?, ?, ?, 1)

    ON CONFLICT(user_id, api_key_id, usage_date)
    DO UPDATE SET requests = requests + 1
  `)
    .bind(
      usageId,
      apiKey.user_id,
      apiKey.id,
      today
    )
    .run();

  await env.DB.prepare(`
    UPDATE api_keys
    SET last_used_at = ?
    WHERE id = ?
  `)
    .bind(
      now(),
      apiKey.id
    )
    .run();
}

/* =========================================================
   MAIN CHAT
========================================================= */

async function handleChat(
  request,
  env
) {
  if (!env.AI) {
    return error(
      "Workers AI binding is missing.",
      500
    );
  }

  if (!env.DB) {
    return error(
      "D1 database binding is missing.",
      500
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return error(
      "Invalid JSON.",
      400
    );
  }

  const apiKey =
    await authenticateApiKey(
      request,
      env
    );

  if (apiKey) {
    const usage =
      await checkApiLimit(
        env,
        apiKey
      );

    if (!usage.allowed) {
      return error(
        "Daily API-key usage limit reached.",
        429,
        {
          used: usage.used,
          limit: usage.limit
        }
      );
    }
  }

  const userId =
    await getUserId(
      request,
      env
    );

  await ensureUser(
    env,
    userId
  );

  const message =
    clean(
      body.message,
      20000
    );

  if (!message) {
    return error(
      "Message is required.",
      400
    );
  }

  let chatId =
    clean(
      body.conversationId ||
      body.chatId,
      200
    );

  if (!chatId) {
    chatId =
      await createChat(
        env,
        userId,
        message.slice(0, 80)
      );
  }

  const chat =
    await findChat(
      env,
      userId,
      chatId
    );

  if (!chat) {
    return error(
      "Conversation not found.",
      404
    );
  }

  await saveMessage(
    env,
    chatId,
    "user",
    message
  );

  const history =
    await getMessages(
      env,
      chatId
    );

  const aiMessages = [
    {
      role: "system",
      content:
        systemPrompt(
          body.mode || "general"
        )
    }
  ];

  for (
    const item of history.slice(-40)
  ) {
    if (
      item.role === "user" ||
      item.role === "assistant"
    ) {
      aiMessages.push({
        role: item.role,
        content:
          item.content || ""
      });
    }
  }

  try {
    const result =
      await runAIChat(
        env,
        aiMessages,
        {
          max_tokens:
            body.max_tokens,
          temperature:
            typeof body.temperature ===
            "number"
              ? body.temperature
              : 0.5
        }
      );

    const answer =
      extractAIText(result);

    if (!answer) {
      return error(
        "AI returned an empty response.",
        500
      );
    }

    await saveMessage(
      env,
      chatId,
      "assistant",
      answer
    );

    await recordApiUsage(
      env,
      apiKey
    );

    return json({
      ok: true,
      conversationId: chatId,
      message: answer,
      model: MODELS.CHAT,
      usage: apiKey
        ? {
            dailyLimit:
              apiKey.daily_limit
          }
        : null
    });
  } catch (e) {
    console.error(
      "CHAT ERROR",
      e
    );

    return error(
      e?.message ||
        "AI request failed.",
      500
    );
  }
}

/* =========================================================
   VISION
========================================================= */

async function handleVision(
  request,
  env
) {
  if (!env.AI) {
    return error(
      "Workers AI binding is missing.",
      500
    );
  }

  let body;

  try {
    body =
      await request.json();
  } catch {
    return error(
      "Invalid JSON.",
      400
    );
  }

  const image =
    body.image ||
    body.imageBase64;

  if (!image) {
    return error(
      "Image data is required.",
      400
    );
  }

  const prompt =
    clean(
      body.prompt,
      10000
    ) ||
    "Analyze this image carefully and explain what you see.";

  try {
    const result =
      await env.AI.run(
        MODELS.VISION,
        {
          prompt,
          image
        }
      );

    return json({
      ok: true,
      message:
        extractAIText(result),
      model:
        MODELS.VISION
    });
  } catch (e) {
    console.error(
      "VISION ERROR",
      e
    );

    return error(
      e?.message ||
        "Vision request failed.",
      500
    );
  }
}

/* =========================================================
   IMAGE GENERATION
========================================================= */

async function handleImage(
  request,
  env
) {
  if (!env.AI) {
    return error(
      "Workers AI binding is missing.",
      500
    );
  }

  let body;

  try {
    body =
      await request.json();
  } catch {
    return error(
      "Invalid JSON.",
      400
    );
  }

  const prompt =
    clean(
      body.prompt,
      2048
    );

  if (!prompt) {
    return error(
      "Image prompt is required.",
      400
    );
  }

  try {
    const result =
      await env.AI.run(
        MODELS.IMAGE,
        {
          prompt,
          steps: Math.min(
            Math.max(
              Number(body.steps) || 4,
              1
            ),
            8
          )
        }
      );

    if (!result?.image) {
      return error(
        "Image model returned no image.",
        500
      );
    }

    return json({
      ok: true,
      type: "image",
      image:
        `data:image/jpeg;base64,${result.image}`,
      model:
        MODELS.IMAGE
    });
  } catch (e) {
    console.error(
      "IMAGE ERROR",
      e
    );

    return error(
      e?.message ||
        "Image generation failed.",
      500
    );
  }
}

/* =========================================================
   SPEECH TO TEXT
========================================================= */

async function handleTranscribe(
  request,
  env
) {
  if (!env.AI) {
    return error(
      "Workers AI binding is missing.",
      500
    );
  }

  try {
    const contentType =
      request.headers.get(
        "content-type"
      ) || "";

    let audio;

    if (
      contentType.includes(
        "application/json"
      )
    ) {
      const body =
        await request.json();

      audio =
        body.audio ||
        body.audioBase64;
    } else {
      const buffer =
        await request.arrayBuffer();

      audio =
        Array.from(
          new Uint8Array(buffer)
        );
    }

    if (!audio) {
      return error(
        "Audio is required.",
        400
      );
    }

    const result =
      await env.AI.run(
        MODELS.STT,
        {
          audio
        }
      );

    return json({
      ok: true,
      transcript:
        result?.text ||
        result?.transcript ||
        extractAIText(result),
      model:
        MODELS.STT
    });
  } catch (e) {
    return error(
      e?.message ||
        "Transcription failed.",
      500
    );
  }
}

/* =========================================================
   TEXT TO SPEECH
========================================================= */

async function handleSpeech(
  request,
  env
) {
  if (!env.AI) {
    return error(
      "Workers AI binding is missing.",
      500
    );
  }

  let body;

  try {
    body =
      await request.json();
  } catch {
    return error(
      "Invalid JSON.",
      400
    );
  }

  const text =
    clean(
      body.text,
      10000
    );

  if (!text) {
    return error(
      "Text is required.",
      400
    );
  }

  try {
    const audio =
      await env.AI.run(
        MODELS.TTS,
        {
          text,
          speaker:
            body.speaker ||
            "asteria",
          encoding:
            body.encoding ||
            "mp3"
        },
        {
          returnRawResponse: true
        }
      );

    return new Response(
      audio.body || audio,
      {
        status: 200,
        headers: {
          ...CORS,
          "Content-Type":
            "audio/mpeg",
          "Cache-Control":
            "no-store"
        }
      }
    );
  } catch (e) {
    return error(
      e?.message ||
        "Speech generation failed.",
      500
    );
  }
}

/* =========================================================
   CHAT LIST
========================================================= */

async function handleChats(
  request,
  env
) {
  if (!env.DB) {
    return error(
      "D1 database binding is missing.",
      500
    );
  }

  const userId =
    await getUserId(
      request,
      env
    );

  await ensureUser(
    env,
    userId
  );

  if (request.method === "GET") {
    return json({
      ok: true,
      chats:
        await getChats(
          env,
          userId
        )
    });
  }

  if (request.method === "POST") {
    let body = {};

    try {
      body =
        await request.json();
    } catch {}

    const chatId =
      await createChat(
        env,
        userId,
        body.title ||
          "New chat"
      );

    return json({
      ok: true,
      chat: {
        id: chatId,
        title:
          clean(
            body.title,
            100
          ) ||
          "New chat"
      }
    });
  }

  return error(
    "Method not allowed.",
    405
  );
}

/* =========================================================
   SINGLE CHAT
========================================================= */

async function handleSingleChat(
  request,
  env,
  chatId
) {
  if (!env.DB) {
    return error(
      "D1 database binding is missing.",
      500
    );
  }

  const userId =
    await getUserId(
      request,
      env
    );

  const chat =
    await findChat(
      env,
      userId,
      chatId
    );

  if (!chat) {
    return error(
      "Chat not found.",
      404
    );
  }

  if (request.method === "GET") {
    return json({
      ok: true,
      chat,
      messages:
        await getMessages(
          env,
          chatId
        )
    });
  }

  if (request.method === "PUT") {
    let body;

    try {
      body =
        await request.json();
    } catch {
      return error(
        "Invalid JSON.",
        400
      );
    }

    const title =
      clean(
        body.title,
        100
      );

    if (!title) {
      return error(
        "Title is required.",
        400
      );
    }

    await env.DB.prepare(`
      UPDATE conversations
      SET title = ?, updated_at = ?
      WHERE id = ?
        AND user_id = ?
    `)
      .bind(
        title,
        now(),
        chatId,
        userId
      )
      .run();

    return json({
      ok: true,
      id: chatId,
      title
    });
  }

  if (request.method === "DELETE") {
    await env.DB.prepare(`
      DELETE FROM conversations
      WHERE id = ?
        AND user_id = ?
    `)
      .bind(
        chatId,
        userId
      )
      .run();

    return json({
      ok: true,
      deleted: chatId
    });
  }

  return error(
    "Method not allowed.",
    405
  );
}

/* =========================================================
   USER PROFILE
========================================================= */

async function handleUser(
  request,
  env
) {
  if (!env.DB) {
    return error(
      "D1 database binding is missing.",
      500
    );
  }

  const userId =
    await getUserId(
      request,
      env
    );

  await ensureUser(
    env,
    userId
  );

  const user =
    await env.DB.prepare(`
      SELECT
        id,
        name,
        email,
        avatar_url,
        created_at
      FROM users
      WHERE id = ?
    `)
      .bind(userId)
      .first();

  return json({
    ok: true,
    user
  });
}

/* =========================================================
   API KEY CREATION
========================================================= */

async function handleCreateKey(
  request,
  env
) {
  if (!env.DB) {
    return error(
      "D1 database binding is missing.",
      500
    );
  }

  const userId =
    await getUserId(
      request,
      env
    );

  await ensureUser(
    env,
    userId
  );

  let body = {};

  try {
    body =
      await request.json();
  } catch {}

  const name =
    clean(
      body.name,
      100
    ) ||
    "API Key";

  const key =
    createApiKey();

  const hash =
    await sha256(key);

  const prefix =
    key.slice(
      0,
      16
    );

  const keyId =
    makeId("key");

  const limit =
    Math.min(
      Math.max(
        Number(
          body.daily_limit
        ) || 300000,
        1
      ),
      300000
    );

  await env.DB.prepare(`
    INSERT INTO api_keys
    (
      id,
      user_id,
      name,
      key_hash,
      key_prefix,
      created_at,
      daily_limit
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      keyId,
      userId,
      name,
      hash,
      prefix,
      now(),
      limit
    )
    .run();

  /*
    The complete key is returned ONLY during creation.
    It is never stored in plain text.
  */

  return json({
    ok: true,
    apiKey: {
      id: keyId,
      name,
      key,
      prefix,
      daily_limit: limit,
      created_at: now()
    },
    warning:
      "Save this API key now. The complete key will not be shown again."
  });
}

/* =========================================================
   API KEY LIST
========================================================= */

async function handleListKeys(
  request,
  env
) {
  if (!env.DB) {
    return error(
      "D1 database binding is missing.",
      500
    );
  }

  const userId =
    await getUserId(
      request,
      env
    );

  await ensureUser(
    env,
    userId
  );

  const result =
    await env.DB.prepare(`
      SELECT
        id,
        name,
        key_prefix,
        created_at,
        last_used_at,
        revoked_at,
        daily_limit
      FROM api_keys
      WHERE user_id = ?
      ORDER BY created_at DESC
    `)
      .bind(userId)
      .all();

  return json({
    ok: true,
    keys:
      result.results || []
  });
}

/* =========================================================
   API KEY REVOKE
========================================================= */

async function handleRevokeKey(
  request,
  env,
  keyId
) {
  if (!env.DB) {
    return error(
      "D1 database binding is missing.",
      500
    );
  }

  const userId =
    await getUserId(
      request,
      env
    );

  const result =
    await env.DB.prepare(`
      UPDATE api_keys
      SET revoked_at = ?
      WHERE id = ?
        AND user_id = ?
        AND revoked_at IS NULL
    `)
      .bind(
        now(),
        keyId,
        userId
      )
      .run();

  if (
    !result.success ||
    result.meta.changes === 0
  ) {
    return error(
      "API key not found.",
      404
    );
  }

  return json({
    ok: true,
    revoked: keyId
  });
}

/* =========================================================
   FILE METADATA
========================================================= */

async function handleFile(
  request,
  env
) {
  if (!env.DB) {
    return error(
      "D1 database binding is missing.",
      500
    );
  }

  let body;

  try {
    body =
      await request.json();
  } catch {
    return error(
      "Invalid JSON.",
      400
    );
  }

  const userId =
    await getUserId(
      request,
      env
    );

  await ensureUser(
    env,
    userId
  );

  const filename =
    clean(
      body.filename,
      255
    );

  if (!filename) {
    return error(
      "Filename is required.",
      400
    );
  }

  const fileId =
    makeId("file");

  await env.DB.prepare(`
    INSERT INTO files
    (
      id,
      user_id,
      conversation_id,
      filename,
      content_type,
      size,
      storage_key,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      fileId,
      userId,
      clean(
        body.conversationId,
        200
      ) || null,
      filename,
      clean(
        body.content_type,
        200
      ) || null,
      Number(body.size) || 0,
      clean(
        body.storage_key,
        500
      ) || null,
      now()
    )
    .run();

  return json({
    ok: true,
    file: {
      id: fileId,
      filename
    }
  });
}

/* =========================================================
   PDF / DOCUMENT TEXT ASSISTANCE
========================================================= */

/*
   D1 is NOT a binary PDF storage engine.

   The frontend can extract text from a PDF and send that
   text here. This endpoint then asks LOGIC-LEAF to analyze it.

   This keeps the Worker lightweight and avoids pretending
   that raw PDF bytes are automatically understood.
*/

async function handleDocumentQuestion(
  request,
  env
) {
  if (!env.AI) {
    return error(
      "Workers AI binding is missing.",
      500
    );
  }

  let body;

  try {
    body =
      await request.json();
  } catch {
    return error(
      "Invalid JSON.",
      400
    );
  }

  const text =
    clean(
      body.text,
      60000
    );

  const question =
    clean(
      body.question,
      10000
    );

  if (!text) {
    return error(
      "Document text is required.",
      400
    );
  }

  if (!question) {
    return error(
      "Question is required.",
      400
    );
  }

  const messages = [
    {
      role: "system",
      content: `
You are LOGIC-LEAF document assistant.

Answer the user's question using the supplied document.
Do not invent information that is not supported by the document.
If the answer cannot be found, say that clearly.
`
    },
    {
      role: "user",
      content:
        `DOCUMENT:\n${text}\n\nQUESTION:\n${question}`
    }
  ];

  try {
    const result =
      await runAIChat(
        env,
        messages
      );

    return json({
      ok: true,
      answer:
        extractAIText(result),
      model:
        MODELS.CHAT
    });
  } catch (e) {
    return error(
      e?.message ||
        "Document analysis failed.",
      500
    );
  }
}

/* =========================================================
   SEARCH
========================================================= */

/*
   No search provider is configured in your current
   wrangler.toml.

   Therefore this endpoint deliberately reports that
   live web search is not configured rather than fabricating
   search results.

   Later a real search provider can be connected here.
*/

async function handleSearch(
  request,
  env
) {
  return error(
    "Live web search is not configured yet. Add a real search provider before enabling this endpoint.",
    501
  );
}

/* =========================================================
   CONFIG
========================================================= */

function config(env) {
  return json({
    ok: true,
    name: APP_NAME,
    version: VERSION,

    capabilities: {
      text: true,
      reasoning: true,
      coding: true,
      study: true,

      vision: !!env.AI,
      imageGeneration: !!env.AI,

      speechToText: !!env.AI,
      textToSpeech: !!env.AI,

      chatHistory: !!env.DB,
      users: !!env.DB,

      apiKeys: !!env.DB,
      apiKeyAuthentication: !!env.DB,

      fileMetadata: !!env.DB,
      documentQuestions: !!env.AI,

      pdfTextAnalysis: !!env.AI,

      liveWebSearch: false,

      googleLogin:
        "frontend-provider-required"
    },

    endpoints: {
      chat: "/v1/chat",

      chats: "/api/chats",

      vision: "/api/vision",

      image: "/api/image",

      transcribe:
        "/api/transcribe",

      speech:
        "/api/speech",

      user: "/api/user",

      keys: "/api/keys",

      files: "/api/files",

      document:
        "/api/document",

      search:
        "/api/search"
    },

    limits: {
      apiKeyDailyMaximum:
        300000
    }
  });
}

/* =========================================================
   HEALTH
========================================================= */

function health(env) {
  return json({
    ok: true,
    name: APP_NAME,
    status: "online",
    version: VERSION,

    ai: !!env.AI,
    database: !!env.DB,
    kv: !!env.QTM_KEYS,

    capabilities: {
      chat: !!env.AI,
      history: !!env.DB,
      vision: !!env.AI,
      imageGeneration: !!env.AI,
      speech: !!env.AI,
      apiKeys: !!env.DB,
      files: !!env.DB
    }
  });
}

/* =========================================================
   ROUTER
========================================================= */

export default {
  async fetch(request, env) {
    try {
      /* CORS */

      if (
        request.method ===
        "OPTIONS"
      ) {
        return new Response(
          null,
          {
            status: 204,
            headers: CORS
          }
        );
      }

      const url =
        new URL(
          request.url
        );

      const path =
        url.pathname;

      /* ROOT */

      if (
        path === "/" &&
        request.method === "GET"
      ) {
        return health(env);
      }

      /* HEALTH */

      if (
        path === "/api/health" &&
        request.method === "GET"
      ) {
        return health(env);
      }

      /* CONFIG */

      if (
        path === "/api/config" &&
        request.method === "GET"
      ) {
        return config(env);
      }

      /* USER */

      if (
        path === "/api/user" &&
        request.method === "GET"
      ) {
        return handleUser(
          request,
          env
        );
      }

      /* CHATS */

      if (
        path === "/api/chats"
      ) {
        return handleChats(
          request,
          env
        );
      }

      /* SINGLE CHAT */

      const chatMatch =
        path.match(
          /^\/api\/chats\/([^/]+)$/
        );

      if (chatMatch) {
        return handleSingleChat(
          request,
          env,
          chatMatch[1]
        );
      }

      /* MAIN CHAT */

      if (
        (
          path === "/v1/chat" ||
          path === "/api/chat" ||
          path === "/chat"
        ) &&
        request.method === "POST"
      ) {
        return handleChat(
          request,
          env
        );
      }

      /* VISION */

      if (
        path === "/api/vision" &&
        request.method === "POST"
      ) {
        return handleVision(
          request,
          env
        );
      }

      /* IMAGE */

      if (
        path === "/api/image" &&
        request.method === "POST"
      ) {
        return handleImage(
          request,
          env
        );
      }

      /* TRANSCRIPTION */

      if (
        path === "/api/transcribe" &&
        request.method === "POST"
      ) {
        return handleTranscribe(
          request,
          env
        );
      }

      /* SPEECH */

      if (
        path === "/api/speech" &&
        request.method === "POST"
      ) {
        return handleSpeech(
          request,
          env
        );
      }

      /* CREATE API KEY */

      if (
        path === "/api/keys" &&
        request.method === "POST"
      ) {
        return handleCreateKey(
          request,
          env
        );
      }

      /* LIST API KEYS */

      if (
        path === "/api/keys" &&
        request.method === "GET"
      ) {
        return handleListKeys(
          request,
          env
        );
      }

      /* REVOKE API KEY */

      const keyMatch =
        path.match(
          /^\/api\/keys\/([^/]+)$/
        );

      if (
        keyMatch &&
        request.method === "DELETE"
      ) {
        return handleRevokeKey(
          request,
          env,
          keyMatch[1]
        );
      }

      /* FILE */

      if (
        path === "/api/files" &&
        request.method === "POST"
      ) {
        return handleFile(
          request,
          env
        );
      }

      /* DOCUMENT */

      if (
        path === "/api/document" &&
        request.method === "POST"
      ) {
        return handleDocumentQuestion(
          request,
          env
        );
      }

      /* SEARCH */

      if (
        path === "/api/search" &&
        request.method === "POST"
      ) {
        return handleSearch(
          request,
          env
        );
      }

      /* GOOGLE AUTH STATUS */

      if (
        path === "/api/auth/google"
      ) {
        return json(
          {
            ok: false,
            configured: false,
            message:
              "Configure Google/Firebase authentication in the frontend and token verification before enabling production Google authentication."
          },
          501
        );
      }

      /* UNKNOWN */

      return error(
        "LOGIC-LEAF endpoint not found.",
        404,
        {
          path,
          available: [
            "/",
            "/api/health",
            "/api/config",
            "/api/user",
            "/api/chats",
            "/v1/chat",
            "/api/vision",
            "/api/image",
            "/api/transcribe",
            "/api/speech",
            "/api/keys",
            "/api/files",
            "/api/document",
            "/api/search"
          ]
        }
      );

    } catch (e) {
      console.error(
        "LOGIC-LEAF ERROR",
        e
      );

      return error(
        e?.message ||
          "Internal server error.",
        500
      );
    }
  }
};
