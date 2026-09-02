const API_URL =
  "https://logic-leaf.qtmkiller6.workers.dev";

const $ = id => document.getElementById(id);

let messages = [];
let currentChatId = localStorage.getItem("ll_chat_id") || crypto.randomUUID();
let selectedFile = null;
let busy = false;

/* -----------------------------
   BASIC HELPERS
----------------------------- */

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function markdown(text) {
  let html = escapeHTML(text);

  html = html.replace(
    /```([\s\S]*?)```/g,
    (_, code) =>
      `<pre><code>${code.trim()}</code></pre>`
  );

  html = html.replace(
    /`([^`]+)`/g,
    "<code>$1</code>"
  );

  html = html.replace(
    /\*\*([^*]+)\*\*/g,
    "<strong>$1</strong>"
  );

  html = html.replace(
    /\n/g,
    "<br>"
  );

  return html;
}

async function api(path, options = {}) {
  const response = await fetch(API_URL + path, {
    ...options,
    headers: {
      ...(options.headers || {})
    }
  });

  const type =
    response.headers.get("content-type") || "";

  if (type.includes("application/pdf")) {
    return {
      ok: response.ok,
      blob: await response.blob()
    };
  }

  const data = await response.json();

  if (!response.ok || data.ok === false) {
    throw new Error(
      data.error || "Request failed"
    );
  }

  return data;
}

/* -----------------------------
   SIDEBAR
----------------------------- */

function toggleSidebar() {
  document.body.classList.toggle("sidebar-closed");
}

$("menuBtn")?.addEventListener(
  "click",
  toggleSidebar
);

$("closeSidebar")?.addEventListener(
  "click",
  toggleSidebar
);

/* -----------------------------
   CHAT RENDER
----------------------------- */

function renderMessages() {
  const area = $("messages");

  if (!area) return;

  area.innerHTML = "";

  if (!messages.length) {
    area.innerHTML = `
      <section class="welcome">
        <div class="welcome-logo">LL</div>
        <h1>How can I help you today?</h1>
        <p>
          Ask questions, study, code, analyze files,
          understand images, search the web, or create images.
        </p>

        <div class="suggestions">
          <button data-prompt="Explain quantum mechanics simply">
            Explain something
          </button>

          <button data-prompt="Teach me an important topic for JEE">
            Study with me
          </button>

          <button data-image-prompt="Create a cinematic futuristic city at sunset">
            Create an image
          </button>

          <button id="welcomeFile">
            Analyze a file
          </button>
        </div>
      </section>
    `;
  }

  for (const message of messages) {
    const item = document.createElement("article");

    item.className =
      "message " +
      (message.role === "user"
        ? "user-message"
        : "assistant-message");

    if (message.image) {
      item.innerHTML = `
        <div class="message-label">LOGIC-LEAF</div>
        <img class="generated-image"
             src="${message.image}"
             alt="Generated image">
        ${
          message.content
            ? `<div class="message-text">${markdown(message.content)}</div>`
            : ""
        }
      `;
    } else {
      item.innerHTML = `
        <div class="message-label">
          ${
            message.role === "user"
              ? "YOU"
              : "LOGIC-LEAF"
          }
        </div>
        <div class="message-text">
          ${markdown(message.content || "")}
        </div>
      `;
    }

    area.appendChild(item);
  }

  area.scrollTop = area.scrollHeight;

  $("welcomeFile")?.addEventListener(
    "click",
    () => $("fileInput")?.click()
  );

  area.querySelectorAll(
    "[data-prompt]"
  ).forEach(button => {
    button.addEventListener("click", () => {
      $("prompt").value =
        button.dataset.prompt;

      sendMessage();
    });
  });

  area.querySelectorAll(
    "[data-image-prompt]"
  ).forEach(button => {
    button.addEventListener("click", () => {
      generateImage(button.dataset.imagePrompt);
    });
  });
}

/* -----------------------------
   NEW CHAT
----------------------------- */

function newChat() {
  messages = [];

  currentChatId =
    crypto.randomUUID();

  localStorage.setItem(
    "ll_chat_id",
    currentChatId
  );

  renderMessages();

  if (window.innerWidth < 800) {
    document.body.classList.add(
      "sidebar-closed"
    );
  }
}

$("newChat")?.addEventListener(
  "click",
  newChat
);

/* -----------------------------
   CHAT
----------------------------- */

async function sendMessage() {
  if (busy) return;

  const input = $("prompt");
  const text = input.value.trim();

  if (!text && !selectedFile) return;

  busy = true;

  input.value = "";

  if (selectedFile) {
    await analyzeFile(selectedFile, text);
    selectedFile = null;
    updateFilePreview();
    busy = false;
    return;
  }

  messages.push({
    role: "user",
    content: text
  });

  renderMessages();

  const loading = {
    role: "assistant",
    content: "Thinking…"
  };

  messages.push(loading);
  renderMessages();

  try {
    const result = await api("/v1/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: text,
        messages: messages
          .filter(m => m !== loading)
          .slice(-30)
      })
    });

    messages.pop();

    messages.push({
      role: "assistant",
      content:
        result.response ||
        result.result ||
        "I couldn't generate a response."
    });

    await saveConversation();

  } catch (e) {
    messages.pop();

    messages.push({
      role: "assistant",
      content:
        "Sorry — " + e.message
    });
  }

  renderMessages();

  busy = false;
}

$("sendBtn")?.addEventListener(
  "click",
  sendMessage
);

$("prompt")?.addEventListener(
  "keydown",
  e => {
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();
      sendMessage();
    }
  }
);

/* -----------------------------
   IMAGE GENERATION
----------------------------- */

async function generateImage(prompt) {
  if (busy) return;

  busy = true;

  messages.push({
    role: "user",
    content: prompt
  });

  messages.push({
    role: "assistant",
    content: "Creating your image…"
  });

  renderMessages();

  try {
    const result = await api("/v1/image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt
      })
    });

    messages.pop();

    messages.push({
      role: "assistant",
      content: "Generated image",
      image:
        result.dataURI ||
        `data:image/jpeg;base64,${result.image}`
    });

    await saveConversation();

  } catch (e) {
    messages.pop();

    messages.push({
      role: "assistant",
      content:
        "Image generation failed: " +
        e.message
    });
  }

  renderMessages();

  busy = false;
}

$("imageBtn")?.addEventListener(
  "click",
  () => {
    const prompt =
      $("prompt").value.trim();

    if (prompt) {
      $("prompt").value = "";
      generateImage(prompt);
    } else {
      $("prompt").placeholder =
        "Describe the image you want…";
      $("prompt").focus();
    }
  }
);

/* -----------------------------
   CAMERA / IMAGE
----------------------------- */

$("cameraBtn")?.addEventListener(
  "click",
  () => {
    $("cameraInput")?.click();
  }
);

$("cameraInput")?.addEventListener(
  "change",
  async e => {
    const file =
      e.target.files?.[0];

    if (!file) return;

    await analyzeImage(file);
    e.target.value = "";
  }
);

async function analyzeImage(file) {
  busy = true;

  const userPrompt =
    $("prompt").value.trim() ||
    "Analyze this image carefully and explain what you see.";

  messages.push({
    role: "user",
    content:
      `Image attached: ${file.name}`
  });

  messages.push({
    role: "assistant",
    content: "Analyzing image…"
  });

  renderMessages();

  try {
    const base64 =
      await fileToDataURL(file);

    const result = await api(
      "/v1/vision",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          image: base64,
          prompt: userPrompt
        })
      }
    );

    messages.pop();

    messages.push({
      role: "assistant",
      content:
        result.response ||
        result.result ||
        "No visual analysis was returned."
    });

  } catch (e) {
    messages.pop();

    messages.push({
      role: "assistant",
      content:
        "Vision failed: " +
        e.message
    });
  }

  $("prompt").value = "";

  renderMessages();

  busy = false;
}

function fileToDataURL(file) {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () =>
        resolve(reader.result);

      reader.onerror = reject;

      reader.readAsDataURL(file);
    }
  );
}

/* -----------------------------
   FILE
----------------------------- */

$("fileBtn")?.addEventListener(
  "click",
  () => $("fileInput")?.click()
);

$("fileInput")?.addEventListener(
  "change",
  e => {
    const file =
      e.target.files?.[0];

    if (!file) return;

    selectedFile = file;

    updateFilePreview();
  }
);

function updateFilePreview() {
  const box =
    $("filePreview");

  if (!box) return;

  if (!selectedFile) {
    box.innerHTML = "";
    box.hidden = true;
    return;
  }

  box.hidden = false;

  box.innerHTML = `
    <span>${escapeHTML(selectedFile.name)}</span>
    <button id="removeFile">×</button>
  `;

  $("removeFile")?.addEventListener(
    "click",
    () => {
      selectedFile = null;
      $("fileInput").value = "";
      updateFilePreview();
    }
  );
}

async function analyzeFile(file, prompt) {
  messages.push({
    role: "user",
    content:
      `Analyze file: ${file.name}`
  });

  messages.push({
    role: "assistant",
    content: "Reading file…"
  });

  renderMessages();

  try {
    const form =
      new FormData();

    form.append(
      "file",
      file
    );

    form.append(
      "prompt",
      prompt ||
      "Analyze this file and summarize the important information."
    );

    const result =
      await api("/v1/file", {
        method: "POST",
        body: form
      });

    messages.pop();

    messages.push({
      role: "assistant",
      content:
        result.response ||
        result.text ||
        "File received."
    });

  } catch (e) {
    messages.pop();

    messages.push({
      role: "assistant",
      content:
        "File analysis failed: " +
        e.message
    });
  }

  renderMessages();
}

/* -----------------------------
   PDF
----------------------------- */

$("pdfBtn")?.addEventListener(
  "click",
  async () => {
    const text =
      $("prompt").value.trim();

    if (!text) {
      $("prompt").placeholder =
        "Enter the text you want in the PDF…";
      $("prompt").focus();
      return;
    }

    try {
      const result =
        await api("/v1/pdf", {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            text
          })
        });

      const url =
        URL.createObjectURL(
          result.blob
        );

      const a =
        document.createElement("a");

      a.href = url;
      a.download =
        "logic-leaf.pdf";

      a.click();

      setTimeout(
        () => URL.revokeObjectURL(url),
        1000
      );

      $("prompt").value = "";

    } catch (e) {
      alert(
        "PDF generation failed: " +
        e.message
      );
    }
  }
);

/* -----------------------------
   SEARCH
----------------------------- */

$("searchBtn")?.addEventListener(
  "click",
  async () => {
    const query =
      $("prompt").value.trim();

    if (!query) {
      $("prompt").focus();
      return;
    }

    busy = true;

    messages.push({
      role: "user",
      content:
        `Search: ${query}`
    });

    messages.push({
      role: "assistant",
      content:
        "Searching…"
    });

    renderMessages();

    try {
      const result =
        await api("/v1/search", {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            query
          })
        });

      messages.pop();

      let answer =
        result.results?.length
          ? result.results
              .map(
                r =>
                  `**${r.title}**\n${r.text}${
                    r.url
                      ? `\n${r.url}`
                      : ""
                  }`
              )
              .join("\n\n")
          : "No search results found.";

      messages.push({
        role: "assistant",
        content: answer
      });

    } catch (e) {
      messages.pop();

      messages.push({
        role: "assistant",
        content:
          "Search failed: " +
          e.message
      });
    }

    $("prompt").value = "";

    renderMessages();

    busy = false;
  }
);

/* -----------------------------
   HISTORY
----------------------------- */

async function saveConversation() {
  try {
    await api(
      "/v1/conversation",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          id: currentChatId,
          title:
            messages.find(
              m => m.role === "user"
            )?.content?.slice(0, 50) ||
            "New chat",
          messages
        })
      }
    );

    localStorage.setItem(
      "ll_chat_id",
      currentChatId
    );

    await loadHistory();

  } catch (_) {}
}

async function loadHistory() {
  const box =
    $("history");

  if (!box) return;

  try {
    const result =
      await api("/v1/history");

    box.innerHTML = "";

    for (
      const chat of
      result.conversations || []
    ) {
      const button =
        document.createElement("button");

      button.className =
        "history-item";

      button.textContent =
        chat.title || "New chat";

      button.onclick = () => {
        messages =
          chat.messages || [];

        currentChatId =
          chat.id;

        localStorage.setItem(
          "ll_chat_id",
          currentChatId
        );

        renderMessages();
      };

      box.appendChild(button);
    }

  } catch (_) {}
}

/* -----------------------------
   API KEY
----------------------------- */

$("createKeyBtn")?.addEventListener(
  "click",
  async () => {
    try {
      const result =
        await api(
          "/v1/keys/create",
          {
            method: "POST"
          }
        );

      const box =
        $("apiKeyOutput");

      if (box) {
        box.value =
          result.key || "";
      }

      alert(
        "API key created. Save it somewhere safe."
      );

    } catch (e) {
      alert(
        "Could not create API key: " +
        e.message
      );
    }
  }
);

$("revokeKeyBtn")?.addEventListener(
  "click",
  async () => {
    const key =
      $("apiKeyOutput")?.value.trim();

    if (!key) return;

    try {
      await api(
        "/v1/keys/revoke",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            key
          })
        }
      );

      $("apiKeyOutput").value = "";

      alert("API key revoked.");

    } catch (e) {
      alert(
        "Could not revoke key: " +
        e.message
      );
    }
  }
);

/* -----------------------------
   SETTINGS
----------------------------- */

$("settingsBtn")?.addEventListener(
  "click",
  () => {
    $("settingsPanel")?.classList.toggle(
      "show"
    );
  }
);

$("closeSettings")?.addEventListener(
  "click",
  () => {
    $("settingsPanel")?.classList.remove(
      "show"
    );
  }
);

/* -----------------------------
   START
----------------------------- */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    renderMessages();
    loadHistory();

    if (window.innerWidth < 800) {
      document.body.classList.add(
        "sidebar-closed"
      );
    }
  }
);
