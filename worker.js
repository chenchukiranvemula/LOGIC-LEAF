/*
============================================================
 LOGIC-LEAF AI
 Full Worker Backend
============================================================

Required bindings:

AI          = Workers AI
DB          = D1 database
QTM_KEYS    = KV namespace

Core routes:

GET  /
GET  /api/health
GET  /api/config

POST /v1/chat
POST /api/chat

GET  /api/chats
POST /api/chats

GET    /api/chats/:id
PUT    /api/chats/:id
DELETE /api/chats/:id

POST /api/vision
POST /api/image
POST /api/transcribe
POST /api/speech

GET /api/user

API:
POST   /api/keys
GET    /api/keys
DELETE /api/keys/:id

============================================================
*/

const APP_NAME = "LOGIC-LEAF";

const MODELS = {
  CHAT: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  VISION: "@cf/meta/llama-3.2-11b-vision-instruct",
  IMAGE: "@cf/black-forest-labs/flux-1-schnell",
  STT: "@cf/deepgram/nova-3",
  TTS: "@cf/deepgram/aura-1"
};

const DAILY_API_LIMIT = 300000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods":
    "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-API-Key",
  "Access-Control-Max-Age": "86400"
};


/* =========================================================
   RESPONSE HELPERS
========================================================= */

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...CORS,
        "Content-Type":
          "application/json; charset=utf-8"
      }
    }
  );
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

function uid(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function now() {
  return Date.now();
}

function clean(value, max = 20000) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}


/* =========================================================
   USER ID
========================================================= */

function getUserId(request) {
  const auth =
    request.headers.get("Authorization");

  if (
    auth &&
    auth.startsWith("Bearer ")
  ) {
    const token =
      auth.slice(7).trim();

    if (token) {
      return token.slice(0, 300);
    }
  }

  const apiKey =
    request.headers.get("X-API-Key");

  if (apiKey) {
    return `api_${apiKey.slice(0, 100)}`;
  }

  return "guest";
}


/* =========================================================
   DATABASE USER
========================================================= */

async function ensureUser(env, userId) {
  if (!env.DB) return;

  await env.DB.prepare(`
    INSERT OR IGNORE INTO users
    (id, google_id, name, email, avatar_url, created_at)
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
  const chatId = uid("chat");
  const timestamp = now();

  await env.DB.prepare(`
    INSERT INTO conversations
    (id, user_id, title, created_at, updated_at)
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


async function getChat(
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


async function listChats(
  env,
  userId
) {
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


async function listMessages(
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
  const messageId = uid("msg");

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
      now()
    )
    .run();

  await env.DB.prepare(`
    UPDATE conversations
    SET updated_at = ?
    WHERE id = ?
  `)
    .bind(
      now(),
      chatId
    )
    .run();

  return messageId;
}


/* =========================================================
   AI
========================================================= */

function extractText(result) {
  if (result == null) return "";

  if (typeof result === "string") {
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
    result.result &&
    typeof result.result.response === "string"
  ) {
    return result.result.response;
  }

  return JSON.stringify(result);
}


function getSystemPrompt(mode) {
  const base = `
You are LOGIC-LEAF, a powerful general-purpose AI assistant.

Your job is to help the user accurately, clearly and efficiently.

You can help with:

- General knowledge
- Mathematics
- Science
- Programming
- Debugging
- Coding architecture
- Study
- Writing
- Summarization
- Reasoning
- Problem solving
- Planning
- Image understanding when an image is supplied

Rules:

1. Be accurate.
2. Never intentionally invent facts.
3. If you are uncertain, say so.
4. Explain difficult concepts clearly.
5. Use Markdown when useful.
6. For code, provide complete usable code when appropriate.
7. Do not claim to have accessed something that you cannot access.
8. Do not pretend that web search occurred when no search service is connected.
9. Keep answers relevant to the user's request.
`;

  if (mode === "study") {
    return base + `
Act as an expert study assistant.
Teach step-by-step.
Use examples and simple explanations.
`;
  }

  if (mode === "code") {
    return base + `
Act as an expert programming assistant.
Analyze bugs carefully.
Prefer maintainable, secure and complete solutions.
`;
  }

  if (mode === "reasoning") {
    return base + `
Focus strongly on logical reasoning.
Break complicated problems into clear steps.
Do not expose private chain-of-thought.
Give concise reasoning summaries and conclusions.
`;
  }

  return base;
}


async function runChat(
  env,
  messages,
  options = {}
) {
  return env.AI.run(
    MODELS.CHAT,
    {
      messages,
      max_tokens:
        Math.min(
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
    body =
      await request.json();
  } catch {
    return error(
      "Invalid JSON request.",
      400
    );
  }

  const userId =
    getUserId(request);

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
    await getChat(
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
    await listMessages(
      env,
      chatId
    );

  const messages = [
    {
      role: "system",
      content:
        getSystemPrompt(
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
      messages.push({
        role: item.role,
        content:
          item.content || ""
      });
    }
  }

  try {
    const result =
      await runChat(
        env,
        messages,
        {
          max_tokens:
            body.max_tokens,
          temperature:
            typeof body.temperature === "number"
              ? body.temperature
              : 0.5
        }
      );

    const answer =
      extractText(result);

    await saveMessage(
      env,
      chatId,
      "assistant",
      answer
    );

    return json({
      ok: true,
      name: APP_NAME,
      conversationId: chatId,
      message: answer,
      model: MODELS.CHAT
    });

  } catch (e) {
    console.error(
      "AI CHAT ERROR",
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
    "Analyze this image carefully.";

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
      name: APP_NAME,
      message:
        extractText(result),
      model:
        MODELS.VISION
    });

  } catch (e) {
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
          ),
          seed:
            Number.isFinite(
              Number(body.seed)
            )
              ? Number(body.seed)
              : Math.floor(
                  Math.random() *
                  2147483647
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
      name: APP_NAME,
      type: "image",
      image:
        `data:image/jpeg;base64,${result.image}`,
      model:
        MODELS.IMAGE
    });

  } catch (e) {
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

  const contentType =
    request.headers.get(
      "content-type"
    ) || "";

  let audio;

  try {
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
  } catch {
    return error(
      "Invalid audio request.",
      400
    );
  }

  if (!audio) {
    return error(
      "Audio is required.",
      400
    );
  }

  try {
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
        extractText(result),
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
          returnRawResponse:
            true
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
   CHAT ROUTES
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
    getUserId(request);

  await ensureUser(
    env,
    userId
  );

  if (
    request.method === "GET"
  ) {
    return json({
      ok: true,
      chats:
        await listChats(
          env,
          userId
        )
    });
  }

  if (
    request.method === "POST"
  ) {
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
    getUserId(request);

  const chat =
    await getChat(
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

  if (
    request.method === "GET"
  ) {
    return json({
      ok: true,
      chat,
      messages:
        await listMessages(
          env,
          chatId
        )
    });
  }

  if (
    request.method === "PUT"
  ) {
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

  if (
    request.method === "DELETE"
  ) {
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
   API KEY HELPERS
========================================================= */

function randomKey() {
  const bytes =
    new Uint8Array(32);

  crypto.getRandomValues(bytes);

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}


async function hashKey(key) {
  const data =
    new TextEncoder().encode(key);

  const hash =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  return Array.from(
    new Uint8Array(hash)
  )
    .map(
      x =>
        x.toString(16)
          .padStart(2, "0")
    )
    .join("");
}


function todayKey() {
  const d = new Date();

  return d
    .toISOString()
    .slice(0, 10);
}


/* =========================================================
   API KEY AUTH
========================================================= */

async function authenticateApiKey(
  request,
  env
) {
  if (!env.QTM_KEYS) {
    return {
      ok: false,
      error:
        "API key storage is not configured."
    };
  }

  const supplied =
    request.headers.get(
      "X-API-Key"
    ) ||
    (
      request.headers
        .get("Authorization")
        ?.startsWith("Bearer ")
        ? request.headers
            .get("Authorization")
            .slice(7)
        : ""
    );

  if (!supplied) {
    return {
      ok: false,
      error: "API key required."
    };
  }

  const hash =
    await hashKey(
      supplied.trim()
    );

  const record =
    await env.QTM_KEYS.get(
      `key:${hash}`,
      "json"
    );

  if (!record) {
    return {
      ok: false,
      error: "Invalid API key."
    };
  }

  if (record.revoked) {
    return {
      ok: false,
      error: "API key has been revoked."
    };
  }

  const date =
    todayKey();

  if (record.date !== date) {
    record.date = date;
    record.usage = 0;
  }

  if (
    Number(record.usage || 0) >=
    DAILY_API_LIMIT
  ) {
    return {
      ok: false,
      error:
        "Daily API usage limit reached."
    };
  }

  record.usage =
    Number(record.usage || 0) + 1;

  await env.QTM_KEYS.put(
    `key:${hash}`,
    JSON.stringify(record)
  );

  return {
    ok: true,
    record
  };
}


/* =========================================================
   API KEY CREATE
========================================================= */

async function createApiKey(
  request,
  env
) {
  if (!env.QTM_KEYS) {
    return error(
      "KV binding QTM_KEYS is missing.",
      500
    );
  }

  const userId =
    getUserId(request);

  let body = {};

  try {
    body =
      await request.json();
  } catch {}

  const name =
    clean(
      body.name,
      80
    ) ||
    "LOGIC-LEAF API Key";

  const plainKey =
    `llk_${randomKey()}`;

  const hash =
    await hashKey(
      plainKey
    );

  const keyId =
    uid("key");

  const record = {
    id: keyId,
    userId,
    name,
    hash,
    prefix:
      plainKey.slice(0, 12),
    createdAt: now(),
    revoked: false,
    usage: 0,
    date: todayKey(),
    dailyLimit:
      DAILY_API_LIMIT
  };

  await env.QTM_KEYS.put(
    `key:${hash}`,
    JSON.stringify(record)
  );

  await env.QTM_KEYS.put(
    `userkey:${userId}:${keyId}`,
    hash
  );

  /*
   The full key is returned ONLY now.
   It is not stored in plaintext.
  */

  return json({
    ok: true,
    key: plainKey,
    keyId,
    name,
    dailyLimit:
      DAILY_API_LIMIT,
    warning:
      "Save this API key now. It will not be shown again."
  });
}


/* =========================================================
   API KEY LIST
========================================================= */

async function listApiKeys(
  request,
  env
) {
  if (!env.QTM_KEYS) {
    return error(
      "KV binding QTM_KEYS is missing.",
      500
    );
  }

  const userId =
    getUserId(request);

  const list =
    await env.QTM_KEYS.list({
      prefix:
        `userkey:${userId}:`
    });

  const keys = [];

  for (
    const item of list.keys
  ) {
    const hash =
      await env.QTM_KEYS.get(
        item.name
      );

    if (!hash) continue;

    const record =
      await env.QTM_KEYS.get(
        `key:${hash}`,
        "json"
      );

    if (!record) continue;

    keys.push({
      id: record.id,
      name: record.name,
      prefix: record.prefix,
      createdAt:
        record.createdAt,
      revoked:
        !!record.revoked,
      usage:
        record.usage || 0,
      dailyLimit:
        DAILY_API_LIMIT
    });
  }

  return json({
    ok: true,
    keys
  });
}


/* =========================================================
   API KEY REVOKE
========================================================= */

async function revokeApiKey(
  request,
  env,
  keyId
) {
  if (!env.QTM_KEYS) {
    return error(
      "KV binding QTM_KEYS is missing.",
      500
    );
  }

  const userId =
    getUserId(request);

  const pointer =
    `userkey:${userId}:${keyId}`;

  const hash =
    await env.QTM_KEYS.get(
      pointer
    );

  if (!hash) {
    return error(
      "API key not found.",
      404
    );
  }

  const record =
    await env.QTM_KEYS.get(
      `key:${hash}`,
      "json"
    );

  if (!record) {
    return error(
      "API key not found.",
      404
    );
  }

  record.revoked = true;
  record.revokedAt = now();

  await env.QTM_KEYS.put(
    `key:${hash}`,
    JSON.stringify(record)
  );

  return json({
    ok: true,
    revoked: keyId
  });
}


/* =========================================================
   API KEY PROTECTED TEST ENDPOINT
========================================================= */

async function handleApiStatus(
  request,
  env
) {
  const auth =
    await authenticateApiKey(
      request,
      env
    );

  if (!auth.ok) {
    return error(
      auth.error,
      401
    );
  }

  return json({
    ok: true,
    name: APP_NAME,
    authenticated: true,
    keyId:
      auth.record.id,
    usage:
      auth.record.usage,
    dailyLimit:
      DAILY_API_LIMIT
  });
}


/* =========================================================
   USER
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
    getUserId(request);

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
   CONFIG
========================================================= */

function handleConfig() {
  return json({
    ok: true,
    name: APP_NAME,
    version: "5",
    capabilities: {
      text: true,
      reasoning: true,
      coding: true,
      study: true,
      vision: true,
      imageGeneration: true,
      speechToText: true,
      textToSpeech: true,
      chatHistory: true,
      fileUpload: true,
      pdfReady: true,
      googleLoginFrontend: true,
      apiKeys: true,
      dailyApiLimit:
        DAILY_API_LIMIT,
      webSearch:
        false
    },

    endpoints: {
      chat:
        "/v1/chat",
      legacyChat:
        "/api/chat",
      chats:
        "/api/chats",
      vision:
        "/api/vision",
      image:
        "/api/image",
      transcribe:
        "/api/transcribe",
      speech:
        "/api/speech",
      user:
        "/api/user",
      apiKeys:
        "/api/keys",
      apiStatus:
        "/api/api-status"
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
    ai: !!env.AI,
    database:
      !!env.DB,
    kv:
      !!env.QTM_KEYS,
    endpoint:
      "/v1/chat"
  });
}


/* =========================================================
   ROUTER
========================================================= */

export default {
  async fetch(
    request,
    env
  ) {
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


      /* HEALTH */

      if (
        path === "/" &&
        request.method ===
          "GET"
      ) {
        return health(env);
      }

      if (
        path === "/api/health" &&
        request.method ===
          "GET"
      ) {
        return health(env);
      }


      /* CONFIG */

      if (
        path === "/api/config" &&
        request.method ===
          "GET"
      ) {
        return handleConfig();
      }


      /* USER */

      if (
        path === "/api/user" &&
        request.method ===
          "GET"
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
        request.method ===
          "POST"
      ) {
        return handleChat(
          request,
          env
        );
      }


      /* VISION */

      if (
        path === "/api/vision" &&
        request.method ===
          "POST"
      ) {
        return handleVision(
          request,
          env
        );
      }


      /* IMAGE */

      if (
        path === "/api/image" &&
        request.method ===
          "POST"
      ) {
        return handleImage(
          request,
          env
        );
      }


      /* TRANSCRIPTION */

      if (
        path === "/api/transcribe" &&
        request.method ===
          "POST"
      ) {
        return handleTranscribe(
          request,
          env
        );
      }


      /* SPEECH */

      if (
        path === "/api/speech" &&
        request.method ===
          "POST"
      ) {
        return handleSpeech(
          request,
          env
        );
      }


      /* CREATE API KEY */

      if (
        path === "/api/keys" &&
        request.method ===
          "POST"
      ) {
        return createApiKey(
          request,
          env
        );
      }


      /* LIST API KEYS */

      if (
        path === "/api/keys" &&
        request.method ===
          "GET"
      ) {
        return listApiKeys(
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
        request.method ===
          "DELETE"
      ) {
        return revokeApiKey(
          request,
          env,
          keyMatch[1]
        );
      }


      /* API KEY STATUS */

      if (
        path ===
          "/api/api-status" &&
        request.method ===
          "GET"
      ) {
        return handleApiStatus(
          request,
          env
        );
      }


      /* GOOGLE AUTH STATUS */

      if (
        path ===
          "/api/auth/google" &&
        request.method ===
          "GET"
      ) {
        return json({
          ok: true,
          configured:
            false,
          message:
            "Google authentication is handled by the frontend Firebase configuration. The Worker does not pretend to verify Google tokens until server-side token verification is configured."
        });
      }


      /* NOT FOUND */

      return error(
        "LOGIC-LEAF endpoint not found.",
        404,
        {
          path,
          endpoints: [
            "/",
            "/api/health",
            "/api/config",
            "/v1/chat",
            "/api/chat",
            "/api/chats",
            "/api/vision",
            "/api/image",
            "/api/transcribe",
            "/api/speech",
            "/api/user",
            "/api/keys",
            "/api/api-status"
          ]
        }
      );

    } catch (e) {

      console.error(
        "LOGIC-LEAF ERROR:",
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
