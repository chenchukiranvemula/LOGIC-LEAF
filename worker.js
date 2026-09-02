const CHAT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
const IMAGE_MODEL = "@cf/black-forest-labs/flux-1-schnell";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400"
};

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
  return json({
    ok: false,
    error: message,
    ...extra
  }, status);
}

async function body(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function textFromAI(result) {
  if (result == null) return "";

  if (typeof result === "string") return result;

  if (typeof result.response === "string") {
    return result.response;
  }

  if (typeof result.result === "string") {
    return result.result;
  }

  if (result.result && typeof result.result.response === "string") {
    return result.result.response;
  }

  if (Array.isArray(result.result)) {
    return result.result.map(x => {
      if (typeof x === "string") return x;
      return x?.response || x?.text || JSON.stringify(x);
    }).join("");
  }

  return JSON.stringify(result);
}

function cleanMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter(m => m && typeof m.content === "string")
    .slice(-30)
    .map(m => ({
      role:
        m.role === "assistant"
          ? "assistant"
          : m.role === "system"
            ? "system"
            : "user",
      content: m.content.slice(0, 20000)
    }));
}

async function ensureDB(env) {
  if (!env.DB) return;

  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        messages TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `).run();
  } catch (_) {
    // Database setup must never stop normal AI chat.
  }
}

async function saveConversation(env, id, title, messages) {
  if (!env.DB) return;

  await ensureDB(env);

  const now = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO conversations
    (id, title, messages, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      messages = excluded.messages,
      updated_at = excluded.updated_at
  `)
    .bind(
      id,
      title || "New chat",
      JSON.stringify(messages),
      now,
      now
    )
    .run();
}

async function listConversations(env) {
  if (!env.DB) return [];

  await ensureDB(env);

  const result = await env.DB.prepare(`
    SELECT id, title, messages, created_at, updated_at
    FROM conversations
    ORDER BY updated_at DESC
    LIMIT 100
  `).all();

  return (result.results || []).map(row => ({
    id: row.id,
    title: row.title,
    messages: JSON.parse(row.messages || "[]"),
    created_at: row.created_at,
    updated_at: row.updated_at
  }));
}

async function getConversation(env, id) {
  if (!env.DB) return null;

  await ensureDB(env);

  const row = await env.DB.prepare(`
    SELECT id, title, messages, created_at, updated_at
    FROM conversations
    WHERE id = ?
  `).bind(id).first();

  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    messages: JSON.parse(row.messages || "[]"),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

async function deleteConversation(env, id) {
  if (!env.DB) return;

  await ensureDB(env);

  await env.DB.prepare(`
    DELETE FROM conversations WHERE id = ?
  `).bind(id).run();
}

/* -------------------------------------------------------
   HEALTH
------------------------------------------------------- */

async function health(env) {
  return json({
    ok: true,
    name: env.APP_NAME || "LOGIC-LEAF",
    status: "online",
    ai: !!env.AI,
    database: !!env.DB,
    kv: !!env.QTM_KEYS,
    ai_search: !!env.AI_SEARCH,
    endpoints: {
      chat: "/v1/chat",
      vision: "/v1/vision",
      file: "/v1/file",
      image: "/v1/image",
      pdf: "/v1/pdf",
      search: "/v1/search",
      history: "/v1/history",
      conversation: "/v1/conversation",
      createKey: "/v1/keys/create",
      revokeKey: "/v1/keys/revoke",
      apiChat: "/v1/api/chat"
    }
  });
}

/* -------------------------------------------------------
   CHAT
------------------------------------------------------- */

async function chat(request, env) {
  if (!env.AI) return error("Workers AI binding is missing.", 500);

  const data = await body(request);

  const prompt = String(data.prompt || "").trim();

  if (!prompt && !Array.isArray(data.messages)) {
    return error("Message is required.");
  }

  const incoming = Array.isArray(data.messages)
    ? cleanMessages(data.messages)
    : [];

  const messages = [
    {
      role: "system",
      content: `
You are LOGIC-LEAF, a capable general AI assistant.

Answer the user's actual question directly.
Maintain context across the conversation.
If the user asks a follow-up, understand what they are referring to.
Do not repeatedly introduce yourself.
Do not claim you cannot generate images when the user asks for image generation through the image endpoint.
Use clear explanations.
For programming questions, provide working code when appropriate.
For study questions, teach step by step.
If information is uncertain, say so instead of inventing facts.
`
    }
  ];

  if (incoming.length) {
    messages.push(...incoming);
  } else {
    messages.push({
      role: "user",
      content: prompt
    });
  }

  try {
    const result = await env.AI.run(CHAT_MODEL, {
      messages,
      max_tokens: 2048,
      temperature: 0.6
    });

    const answer = textFromAI(result);

    return json({
      ok: true,
      response: answer,
      result: answer
    });
  } catch (e) {
    return error(
      "AI chat failed: " + (e?.message || String(e)),
      500
    );
  }
}

/* -------------------------------------------------------
   VISION
------------------------------------------------------- */

async function vision(request, env) {
  if (!env.AI) return error("Workers AI binding is missing.", 500);

  const data = await body(request);

  const image = String(data.image || "").trim();
  const prompt =
    String(data.prompt || "Describe and analyze this image accurately.").trim();

  if (!image) return error("Image data is required.");

  try {
    const result = await env.AI.run(VISION_MODEL, {
      messages: [
        {
          role: "system",
          content: "You are a helpful visual analysis assistant."
        },
        {
          role: "user",
          content: prompt,
          image
        }
      ],
      max_tokens: 1500
    });

    const answer = textFromAI(result);

    return json({
      ok: true,
      response: answer,
      result: answer
    });
  } catch (e) {
    return error(
      "Vision failed: " + (e?.message || String(e)),
      500
    );
  }
}

/* -------------------------------------------------------
   IMAGE GENERATION
------------------------------------------------------- */

async function generateImage(request, env) {
  if (!env.AI) return error("Workers AI binding is missing.", 500);

  const data = await body(request);

  const prompt = String(data.prompt || "").trim();

  if (!prompt) return error("Image prompt is required.");

  try {
    const result = await env.AI.run(IMAGE_MODEL, {
      prompt: prompt.slice(0, 2048),
      steps: Math.min(
        Math.max(Number(data.steps) || 4, 1),
        8
      ),
      seed: Math.floor(Math.random() * 999999999)
    });

    if (!result || !result.image) {
      return error("The image model returned no image.", 502);
    }

    const dataURI =
      `data:image/jpeg;base64,${result.image}`;

    return json({
      ok: true,
      image: result.image,
      dataURI,
      mimeType: "image/jpeg"
    });
  } catch (e) {
    return error(
      "Image generation failed: " + (e?.message || String(e)),
      500
    );
  }
}

/* -------------------------------------------------------
   FILE
------------------------------------------------------- */

async function fileEndpoint(request, env) {
  const form = await request.formData();

  const file = form.get("file");
  const prompt =
    String(form.get("prompt") || "Analyze this file and summarize the important information.");

  if (!(file instanceof File)) {
    return error("No file was uploaded.");
  }

  const type = file.type || "application/octet-stream";
  const name = file.name || "file";
  const size = file.size;

  let text = "";

  if (
    type.startsWith("text/") ||
    /\.(txt|md|csv|json|js|css|html|xml|py|java|c|cpp)$/i.test(name)
  ) {
    text = await file.text();
    text = text.slice(0, 30000);
  }

  if (!text) {
    return json({
      ok: true,
      name,
      type,
      size,
      response:
        `File "${name}" was received successfully. ` +
        `For binary files, use the image/vision endpoint for images. ` +
        `PDF files can be sent to /v1/pdf for PDF generation.`
    });
  }

  if (!env.AI) {
    return json({
      ok: true,
      name,
      type,
      size,
      text
    });
  }

  try {
    const result = await env.AI.run(CHAT_MODEL, {
      messages: [
        {
          role: "system",
          content: "You are a file analysis assistant. Answer based only on the supplied file content."
        },
        {
          role: "user",
          content:
            `${prompt}\n\nFILE NAME: ${name}\n\nFILE CONTENT:\n${text}`
        }
      ],
      max_tokens: 1800
    });

    const answer = textFromAI(result);

    return json({
      ok: true,
      name,
      type,
      size,
      response: answer,
      result: answer,
      text
    });
  } catch (e) {
    return error(
      "File analysis failed: " + (e?.message || String(e)),
      500
    );
  }
}

/* -------------------------------------------------------
   SIMPLE PDF GENERATOR
------------------------------------------------------- */

function escapePDF(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, "")
    .replace(/[^\x20-\x7E\n]/g, "?");
}

function wrapText(text, max = 82) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words) {
    if ((line + " " + word).trim().length > max) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = (line + " " + word).trim();
    }
  }

  if (line) lines.push(line);

  return lines;
}

function makePDF(text) {
  const lines = wrapText(text, 82).slice(0, 100);

  let stream = "BT\n/F1 11 Tf\n50 760 Td\n14 TL\n";

  for (const line of lines) {
    stream += `(${escapePDF(line)}) Tj\nT*\n`;
  }

  stream += "ET";

  const objects = [];

  objects.push(
    "<< /Type /Catalog /Pages 2 0 R >>"
  );

  objects.push(
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"
  );

  objects.push(
    "<< /Type /Page /Parent 2 0 R " +
    "/MediaBox [0 0 612 792] " +
    "/Resources << /Font << /F1 4 0 R >> >> " +
    "/Contents 5 0 R >>"
  );

  objects.push(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
  );

  objects.push(
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  );

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n`;
    pdf += objects[i];
    pdf += "\nendobj\n";
  }

  const xref = pdf.length;

  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let i = 1; i <= objects.length; i++) {
    pdf += String(offsets[i]).padStart(10, "0");
    pdf += " 00000 n \n";
  }

  pdf += `trailer\n`;
  pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += "startxref\n";
  pdf += `${xref}\n`;
  pdf += "%%EOF";

  return new TextEncoder().encode(pdf);
}

async function pdfEndpoint(request) {
  const data = await body(request);

  const text = String(
    data.text ||
    data.content ||
    data.prompt ||
    "LOGIC-LEAF generated document"
  );

  const bytes = makePDF(text);

  return new Response(bytes, {
    status: 200,
    headers: {
      ...CORS,
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="logic-leaf.pdf"',
      "Cache-Control": "no-store"
    }
  });
}

/* -------------------------------------------------------
   SEARCH
------------------------------------------------------- */

async function searchEndpoint(request) {
  const data = await body(request);

  const query = String(data.query || data.q || "").trim();

  if (!query) return error("Search query is required.");

  try {
    const url =
      "https://api.duckduckgo.com/?" +
      new URLSearchParams({
        q: query,
        format: "json",
        no_html: "1",
        skip_disambig: "1"
      }).toString();

    const response = await fetch(url, {
      headers: {
        "User-Agent": "LOGIC-LEAF/1.0"
      }
    });

    const result = await response.json();

    const results = [];

    if (result.AbstractText) {
      results.push({
        title: result.Heading || query,
        text: result.AbstractText,
        url: result.AbstractURL || ""
      });
    }

    for (const item of result.RelatedTopics || []) {
      if (item.Text) {
        results.push({
          title: item.Text.slice(0, 100),
          text: item.Text,
          url: item.FirstURL || ""
        });
      }

      if (Array.isArray(item.Topics)) {
        for (const sub of item.Topics) {
          if (sub.Text) {
            results.push({
              title: sub.Text.slice(0, 100),
              text: sub.Text,
              url: sub.FirstURL || ""
            });
          }
        }
      }

      if (results.length >= 10) break;
    }

    return json({
      ok: true,
      query,
      results: results.slice(0, 10)
    });
  } catch (e) {
    return error(
      "Search failed: " + (e?.message || String(e)),
      500
    );
  }
}

/* -------------------------------------------------------
   HISTORY
------------------------------------------------------- */

async function history(request, env) {
  try {
    return json({
      ok: true,
      conversations: await listConversations(env)
    });
  } catch (e) {
    return error(
      "History failed: " + (e?.message || String(e)),
      500
    );
  }
}

/* -------------------------------------------------------
   CONVERSATION
------------------------------------------------------- */

async function conversation(request, env) {
  const data = await body(request);
  const id = String(data.id || crypto.randomUUID());

  if (request.method === "GET") {
    const url = new URL(request.url);
    const requestedId = url.searchParams.get("id");

    if (!requestedId) {
      return error("Conversation id is required.");
    }

    const item = await getConversation(env, requestedId);

    if (!item) return error("Conversation not found.", 404);

    return json({
      ok: true,
      conversation: item
    });
  }

  if (data.action === "delete") {
    await deleteConversation(env, id);

    return json({
      ok: true,
      deleted: id
    });
  }

  const messages = cleanMessages(data.messages || []);

  await saveConversation(
    env,
    id,
    String(data.title || "New chat"),
    messages
  );

  return json({
    ok: true,
    id,
    messages
  });
}

/* -------------------------------------------------------
   API KEYS
------------------------------------------------------- */

function randomKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));

  return "ll_" +
    Array.from(bytes)
      .map(x => x.toString(16).padStart(2, "0"))
      .join("");
}

async function createKey(request, env) {
  if (!env.QTM_KEYS) {
    return error("KV binding is missing.", 500);
  }

  const key = randomKey();

  await env.QTM_KEYS.put(
    `key:${key}`,
    JSON.stringify({
      created_at: new Date().toISOString()
    })
  );

  return json({
    ok: true,
    key
  });
}

async function revokeKey(request, env) {
  if (!env.QTM_KEYS) {
    return error("KV binding is missing.", 500);
  }

  const data = await body(request);

  const key = String(data.key || "").trim();

  if (!key) return error("API key is required.");

  await env.QTM_KEYS.delete(`key:${key}`);

  return json({
    ok: true,
    revoked: true
  });
}

async function apiChat(request, env) {
  const auth = request.headers.get("Authorization") || "";

  if (!auth.startsWith("Bearer ")) {
    return error("Authorization: Bearer <API_KEY> is required.", 401);
  }

  const key = auth.slice(7).trim();

  if (!env.QTM_KEYS) {
    return error("KV binding is missing.", 500);
  }

  const valid = await env.QTM_KEYS.get(`key:${key}`);

  if (!valid) {
    return error("Invalid API key.", 401);
  }

  return chat(request, env);
}

/* -------------------------------------------------------
   ROUTER
------------------------------------------------------- */

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS
      });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    try {
      if (request.method === "GET" && path === "/") {
        return health(env);
      }

      if (request.method === "GET" && path === "/health") {
        return health(env);
      }

      if (request.method === "POST" && path === "/v1/chat") {
        return chat(request, env);
      }

      if (request.method === "POST" && path === "/v1/vision") {
        return vision(request, env);
      }

      if (request.method === "POST" && path === "/v1/image") {
        return generateImage(request, env);
      }

      if (request.method === "POST" && path === "/v1/file") {
        return fileEndpoint(request, env);
      }

      if (request.method === "POST" && path === "/v1/pdf") {
        return pdfEndpoint(request);
      }

      if (request.method === "POST" && path === "/v1/search") {
        return searchEndpoint(request);
      }

      if (request.method === "GET" && path === "/v1/history") {
        return history(request, env);
      }

      if (path === "/v1/conversation") {
        return conversation(request, env);
      }

      if (request.method === "POST" && path === "/v1/keys/create") {
        return createKey(request, env);
      }

      if (request.method === "POST" && path === "/v1/keys/revoke") {
        return revokeKey(request, env);
      }

      if (request.method === "POST" && path === "/v1/api/chat") {
        return apiChat(request, env);
      }

      return error("Endpoint not found.", 404);

    } catch (e) {
      return error(
        "Server error: " + (e?.message || String(e)),
        500
      );
    }
  }
};
