/*
===========================================================
 LOGIC-LEAF FRONTEND
===========================================================

Connected Worker:

https://ck.qtmkiller6.workers.dev

Main API:

POST /v1/chat

History:

GET    /api/chats
POST   /api/chats
GET    /api/chats/:id
PUT    /api/chats/:id
DELETE /api/chats/:id

Vision:

POST /api/vision

Image:

POST /api/image

Voice:

POST /api/transcribe
POST /api/speech

User:

GET /api/user

Config:

GET /api/config

===========================================================
*/


const API_URL =
  "https://ck.qtmkiller6.workers.dev";


/* ========================================================
   STATE
======================================================== */

let currentChatId = null;

let currentMode = "general";

let selectedFile = null;

let isGenerating = false;

let mediaRecorder = null;

let audioChunks = [];

let isRecording = false;


/* ========================================================
   DOM
======================================================== */

const sidebar =
  document.getElementById("sidebar");

const openSidebar =
  document.getElementById("openSidebar");

const closeSidebar =
  document.getElementById("closeSidebar");

const newChatBtn =
  document.getElementById("newChatBtn");

const chatList =
  document.getElementById("chatList");

const chatArea =
  document.getElementById("chatArea");

const welcome =
  document.getElementById("welcome");

const messages =
  document.getElementById("messages");

const messageInput =
  document.getElementById("messageInput");

const sendBtn =
  document.getElementById("sendBtn");

const attachBtn =
  document.getElementById("attachBtn");

const fileInput =
  document.getElementById("fileInput");

const voiceBtn =
  document.getElementById("voiceBtn");

const attachmentPreview =
  document.getElementById("attachmentPreview");

const settingsOverlay =
  document.getElementById("settingsOverlay");

const settingsBtn =
  document.getElementById("settingsBtn");

const settingsTopBtn =
  document.getElementById("settingsTopBtn");

const closeSettings =
  document.getElementById("closeSettings");

const clearChatBtn =
  document.getElementById("clearChatBtn");

const toast =
  document.getElementById("toast");

const googleLoginBtn =
  document.getElementById("googleLoginBtn");

const createApiKeyBtn =
  document.getElementById("createApiKeyBtn");

const apiKeysList =
  document.getElementById("apiKeysList");

const apiKeyResult =
  document.getElementById("apiKeyResult");

const backendStatus =
  document.getElementById("backendStatus");

const aiStatus =
  document.getElementById("aiStatus");

const dbStatus =
  document.getElementById("dbStatus");


/* ========================================================
   UTILITIES
======================================================== */

function showToast(text) {

  toast.textContent = text;

  toast.classList.add("show");

  clearTimeout(
    showToast.timer
  );

  showToast.timer =
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2600);
}


function escapeHTML(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/*
Simple Markdown-like renderer.

This intentionally does not try to be a full Markdown
parser. It handles common AI responses safely.
*/

function renderText(text) {

  let safe =
    escapeHTML(text || "");

  /*
  Code blocks
  */

  safe =
    safe.replace(
      /```([\s\S]*?)```/g,
      (_, code) =>
        `<pre><code>${code.trim()}</code></pre>`
    );

  /*
  Inline code
  */

  safe =
    safe.replace(
      /`([^`]+)`/g,
      "<code>$1</code>"
    );

  /*
  Bold
  */

  safe =
    safe.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );

  /*
  Italic
  */

  safe =
    safe.replace(
      /\*(.*?)\*/g,
      "<em>$1</em>"
    );

  /*
  Line breaks
  */

  safe =
    safe.replace(
      /\n/g,
      "<br>"
    );

  return safe;
}


function scrollToBottom() {

  requestAnimationFrame(() => {

    chatArea.scrollTop =
      chatArea.scrollHeight;

  });
}


function setLoading(value) {

  isGenerating = value;

  sendBtn.disabled = value;

  if (value) {

    sendBtn.innerHTML = "•";

  } else {

    sendBtn.innerHTML = "↑";

  }
}


/* ========================================================
   API
======================================================== */

async function apiFetch(
  endpoint,
  options = {}
) {

  const response =
    await fetch(
      `${API_URL}${endpoint}`,
      {
        ...options,
        headers: {
          "Content-Type":
            "application/json",

          ...(options.headers || {})
        }
      }
    );

  let data = null;

  try {

    data =
      await response.json();

  } catch {

    data = {};

  }

  if (!response.ok) {

    throw new Error(
      data.error ||
      `Request failed (${response.status})`
    );

  }

  return data;
}


/* ========================================================
   HEALTH
======================================================== */

async function checkBackend() {

  try {

    const data =
      await apiFetch(
        "/api/health"
      );

    backendStatus.textContent =
      data.status === "online"
        ? "Online"
        : "Unavailable";

    backendStatus.style.color =
      data.status === "online"
        ? "var(--success)"
        : "var(--danger)";

    aiStatus.textContent =
      data.ai
        ? "Available"
        : "Unavailable";

    dbStatus.textContent =
      data.database
        ? "Connected"
        : "Unavailable";

  } catch (error) {

    backendStatus.textContent =
      "Offline";

    aiStatus.textContent =
      "Unavailable";

    dbStatus.textContent =
      "Unavailable";

    backendStatus.style.color =
      "var(--danger)";
  }
}


/* ========================================================
   CHAT HISTORY
======================================================== */

async function loadChats() {

  try {

    const data =
      await apiFetch(
        "/api/chats"
      );

    renderChatList(
      data.chats || []
    );

  } catch (error) {

    chatList.innerHTML = `
      <div class="empty-history">
        Unable to load chats
      </div>
    `;

  }
}


function renderChatList(chats) {

  if (!chats.length) {

    chatList.innerHTML = `
      <div class="empty-history">
        No conversations yet
      </div>
    `;

    return;
  }

  chatList.innerHTML = "";

  chats.forEach(chat => {

    const button =
      document.createElement("button");

    button.className =
      "chat-item" +
      (
        chat.id === currentChatId
          ? " active"
          : ""
      );

    button.innerHTML = `
      <span>○</span>
      <span class="chat-item-title">
        ${escapeHTML(
          chat.title || "New chat"
        )}
      </span>
    `;

    button.addEventListener(
      "click",
      () => loadChat(chat.id)
    );

    chatList.appendChild(button);

  });
}


async function loadChat(chatId) {

  try {

    const data =
      await apiFetch(
        `/api/chats/${encodeURIComponent(chatId)}`
      );

    currentChatId =
      chatId;

    messages.innerHTML = "";

    welcome.classList.add(
      "hidden"
    );

    const chatMessages =
      data.messages || [];

    chatMessages.forEach(
      item => {

        addMessage(
          item.role,
          item.content
        );

      }
    );

    renderChatListFromRefresh();

    closeMobileSidebar();

    scrollToBottom();

  } catch (error) {

    showToast(
      error.message
    );

  }
}


async function renderChatListFromRefresh() {

  await loadChats();

}


/* ========================================================
   NEW CHAT
======================================================== */

function newChat() {

  currentChatId = null;

  messages.innerHTML = "";

  welcome.classList.remove(
    "hidden"
  );

  selectedFile = null;

  updateAttachmentPreview();

  messageInput.value = "";

  messageInput.focus();

  loadChats();

}


/* ========================================================
   MESSAGE UI
======================================================== */

function addMessage(
  role,
  content,
  image = null
) {

  welcome.classList.add(
    "hidden"
  );

  const wrapper =
    document.createElement("div");

  wrapper.className =
    `message ${role}`;

  const contentDiv =
    document.createElement("div");

  contentDiv.className =
    "message-content";

  const roleLabel =
    role === "user"
      ? "You"
      : "LOGIC-LEAF";

  let html = `
    <div class="message-role">
      ${roleLabel}
    </div>

    <div class="message-text">
      ${renderText(content)}
    </div>
  `;

  if (image) {

    html += `
      <img
        class="message-image"
        src="${image}"
        alt="Generated image"
      >
    `;

  }

  if (role === "assistant") {

    html += `
      <div class="message-actions">

        <button
          class="message-action copy-answer"
        >
          Copy
        </button>

        <button
          class="message-action speak-answer"
        >
          Read aloud
        </button>

      </div>
    `;

  }

  contentDiv.innerHTML =
    html;

  wrapper.appendChild(
    contentDiv
  );

  messages.appendChild(
    wrapper
  );

  /*
  Copy
  */

  const copyButton =
    contentDiv.querySelector(
      ".copy-answer"
    );

  if (copyButton) {

    copyButton.addEventListener(
      "click",
      async () => {

        await navigator.clipboard.writeText(
          content || ""
        );

        showToast(
          "Copied"
        );

      }
    );

  }


  /*
  Speech
  */

  const speakButton =
    contentDiv.querySelector(
      ".speak-answer"
    );

  if (speakButton) {

    speakButton.addEventListener(
      "click",
      () => {

        speakText(
          content || ""
        );

      }
    );

  }

  scrollToBottom();

  return wrapper;
}


function addTyping() {

  const wrapper =
    document.createElement("div");

  wrapper.className =
    "message assistant";

  wrapper.id =
    "typingMessage";

  wrapper.innerHTML = `
    <div class="message-content">

      <div class="message-role">
        LOGIC-LEAF
      </div>

      <div class="typing">
        <span></span>
        <span></span>
        <span></span>
      </div>

    </div>
  `;

  messages.appendChild(
    wrapper
  );

  scrollToBottom();

}


function removeTyping() {

  const typing =
    document.getElementById(
      "typingMessage"
    );

  if (typing) {

    typing.remove();

  }
}


/* ========================================================
   SEND MESSAGE
======================================================== */

async function sendMessage(
  forcedMessage = null
) {

  if (isGenerating) {
    return;
  }

  const message =
    forcedMessage !== null
      ? forcedMessage.trim()
      : messageInput.value.trim();

  if (!message && !selectedFile) {

    showToast(
      "Write a message first."
    );

    return;
  }

  /*
  If image selected, use vision.
  */

  if (
    selectedFile &&
    selectedFile.type.startsWith(
      "image/"
    )
  ) {

    await sendVision(
      message ||
      "Analyze this image carefully."
    );

    return;
  }

  /*
  Normal AI chat.
  */

  if (messageInput) {
    messageInput.value = "";
    autoResizeTextarea();
  }

  addMessage(
    "user",
    message ||
    `Attached: ${selectedFile.name}`
  );

  const fileToSend =
    selectedFile;

  selectedFile = null;

  updateAttachmentPreview();

  addTyping();

  setLoading(true);

  try {

    const data =
      await apiFetch(
        "/v1/chat",
        {
          method: "POST",

          body:
            JSON.stringify({
              message,

              conversationId:
                currentChatId,

              mode:
                currentMode,

              max_tokens:
                8192
            })
        }
      );

    currentChatId =
      data.conversationId ||
      currentChatId;

    removeTyping();

    addMessage(
      "assistant",
      data.message ||
      "I didn't receive a response."
    );

    await loadChats();

  } catch (error) {

    removeTyping();

    addMessage(
      "assistant",
      `Sorry, something went wrong.\n\n${error.message}`
    );

  } finally {

    setLoading(false);

  }

}


/* ========================================================
   VISION
======================================================== */

async function sendVision(
  prompt
) {

  if (!selectedFile) {
    return;
  }

  addMessage(
    "user",
    prompt
  );

  addTyping();

  setLoading(true);

  try {

    const base64 =
      await fileToBase64(
        selectedFile
      );

    const cleanBase64 =
      base64.includes(",")
        ? base64.split(",")[1]
        : base64;

    selectedFile = null;

    updateAttachmentPreview();

    const data =
      await apiFetch(
        "/api/vision",
        {
          method: "POST",

          body:
            JSON.stringify({
              prompt,

              image:
                cleanBase64
            })
        }
      );

    removeTyping();

    addMessage(
      "assistant",
      data.message ||
      "Unable to analyze the image."
    );

  } catch (error) {

    removeTyping();

    addMessage(
      "assistant",
      `Vision error: ${error.message}`
    );

  } finally {

    setLoading(false);

  }

}


/* ========================================================
   IMAGE GENERATION
======================================================== */

async function generateImage(
  prompt
) {

  if (!prompt.trim()) {

    showToast(
      "Enter an image prompt."
    );

    return;
  }

  const button =
    document.getElementById(
      "generateImageBtn"
    );

  button.disabled = true;

  button.textContent =
    "Generating...";

  try {

    const data =
      await apiFetch(
        "/api/image",
        {
          method: "POST",

          body:
            JSON.stringify({
              prompt
            })
        }
      );

    const container =
      document.getElementById(
        "generatedImageContainer"
      );

    container.innerHTML = `
      <img
        src="${data.image}"
        alt="Generated image"
      >
    `;

    addMessage(
      "assistant",
      "Generated the requested image.",
      data.image
    );

    showToast(
      "Image generated."
    );

  } catch (error) {

    showToast(
      `Image generation failed: ${error.message}`
    );

  } finally {

    button.disabled = false;

    button.textContent =
      "Generate image";

  }

}


/* ========================================================
   FILE HANDLING
======================================================== */

function fileToBase64(file) {

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();

      reader.onload =
        () => resolve(
          reader.result
        );

      reader.onerror =
        reject;

      reader.readAsDataURL(
        file
      );

    }
  );

}


function updateAttachmentPreview() {

  if (!selectedFile) {

    attachmentPreview.classList.add(
      "hidden"
    );

    attachmentPreview.innerHTML =
      "";

    return;
  }

  attachmentPreview.classList.remove(
    "hidden"
  );

  attachmentPreview.innerHTML = `
    Attached:
    <strong>
      ${escapeHTML(
        selectedFile.name
      )}
    </strong>
  `;

}


/* ========================================================
   TEXTAREA
======================================================== */

function autoResizeTextarea() {

  messageInput.style.height =
    "auto";

  messageInput.style.height =
    Math.min(
      messageInput.scrollHeight,
      160
    ) + "px";

}


/* ========================================================
   SPEECH
======================================================== */

function speakText(text) {

  if (
    !("speechSynthesis" in window)
  ) {

    showToast(
      "Read aloud is not supported on this device."
    );

    return;
  }

  window.speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(
      text
    );

  utterance.rate =
    1;

  utterance.pitch =
    1;

  window.speechSynthesis.speak(
    utterance
  );

}


/* ========================================================
   VOICE INPUT
======================================================== */

async function toggleVoice() {

  if (isRecording) {

    stopRecording();

    return;
  }

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    showToast(
      "Microphone is not supported."
    );

    return;
  }

  try {

    const stream =
      await navigator.mediaDevices.getUserMedia(
        {
          audio: true
        }
      );

    audioChunks = [];

    mediaRecorder =
      new MediaRecorder(
        stream
      );

    mediaRecorder.ondataavailable =
      event => {

        if (event.data.size > 0) {

          audioChunks.push(
            event.data
          );

        }

      };

    mediaRecorder.onstop =
      async () => {

        stream
          .getTracks()
          .forEach(
            track =>
              track.stop()
          );

        const blob =
          new Blob(
            audioChunks,
            {
              type:
                "audio/webm"
            }
          );

        await transcribeAudio(
          blob
        );

      };

    mediaRecorder.start();

    isRecording = true;

    voiceBtn.textContent =
      "■";

    voiceBtn.style.color =
      "var(--danger)";

    showToast(
      "Listening..."
    );

  } catch (error) {

    showToast(
      "Microphone permission denied."
    );

  }

}


function stopRecording() {

  if (
    mediaRecorder &&
    mediaRecorder.state !==
      "inactive"
  ) {

    mediaRecorder.stop();

  }

  isRecording = false;

  voiceBtn.textContent =
    "◉";

  voiceBtn.style.color =
    "";

}


async function transcribeAudio(
  blob
) {

  showToast(
    "Converting speech..."
  );

  try {

    const arrayBuffer =
      await blob.arrayBuffer();

    const bytes =
      Array.from(
        new Uint8Array(
          arrayBuffer
        )
      );

    const response =
      await fetch(
        `${API_URL}/api/transcribe`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/octet-stream"
          },

          body:
            new Uint8Array(
              bytes
            )
        }
      );

    const data =
      await response.json();

    if (!response.ok) {

      throw new Error(
        data.error ||
        "Transcription failed."
      );

    }

    if (data.transcript) {

      messageInput.value +=
        (
          messageInput.value
            ? " "
            : ""
        ) +
        data.transcript;

      autoResizeTextarea();

      messageInput.focus();

    }

  } catch (error) {

    showToast(
      `Voice error: ${error.message}`
    );

  }

}


/* ========================================================
   SETTINGS
======================================================== */

function openSettingsModal() {

  settingsOverlay.classList.remove(
    "hidden"
  );

  loadUser();

  loadApiKeys();

}


function closeSettingsModal() {

  settingsOverlay.classList.add(
    "hidden"
  );

}


async function loadUser() {

  try {

    const data =
      await apiFetch(
        "/api/user"
      );

    if (
      data.user
    ) {

      document.getElementById(
        "userName"
      ).textContent =
        data.user.name ||
        "Guest User";

      document.getElementById(
        "userEmail"
      ).textContent =
        data.user.email ||
        "Not signed in";

    }

  } catch {

    document.getElementById(
      "userName"
    ).textContent =
      "Guest User";

  }

}


/* ========================================================
   API KEY SYSTEM UI
======================================================== */

async function loadApiKeys() {

  /*
  This expects the final Worker API-key routes:

  GET /api/keys

  If the current Worker does not have them yet,
  the UI will simply report that API management
  is not available.
  */

  try {

    const data =
      await apiFetch(
        "/api/keys"
      );

    renderApiKeys(
      data.keys || []
    );

  } catch {

    apiKeysList.innerHTML = `
      <div class="empty-api">
        API-key management is not enabled
        on the current Worker yet.
      </div>
    `;

  }

}


function renderApiKeys(keys) {

  if (!keys.length) {

    apiKeysList.innerHTML = `
      <div class="empty-api">
        No API keys.
      </div>
    `;

    return;
  }

  apiKeysList.innerHTML = "";

  keys.forEach(key => {

    const card =
      document.createElement(
        "div"
      );

    card.className =
      "api-key-card";

    card.innerHTML = `
      <div>

        <div class="api-key-name">
          ${escapeHTML(
            key.name ||
            "API Key"
          )}
        </div>

        <div class="api-key-meta">
          ${escapeHTML(
            key.prefix ||
            "logic"
          )}
          ·
          ${escapeHTML(
            key.created_at ||
            ""
          )}
        </div>

      </div>

      <div class="api-key-actions">

        <button
          class="small-button danger"
          data-revoke="${escapeHTML(
            key.id
          )}"
        >
          Revoke
        </button>

      </div>
    `;

    const revoke =
      card.querySelector(
        "[data-revoke]"
      );

    revoke.addEventListener(
      "click",
      () =>
        revokeApiKey(
          key.id
        )
    );

    apiKeysList.appendChild(
      card
    );

  });

}


async function createApiKey() {

  const name =
    prompt(
      "Enter a name for this API key:"
    );

  if (!name) {
    return;
  }

  try {

    const data =
      await apiFetch(
        "/api/keys",
        {
          method: "POST",

          body:
            JSON.stringify({
              name
            })
        }
      );

    if (
      data.key
    ) {

      apiKeyResult.classList.remove(
        "hidden"
      );

      apiKeyResult.innerHTML = `
        <strong>
          New API key
        </strong>
        <br><br>
        ${escapeHTML(
          data.key
        )}
        <br><br>
        <small>
          Copy this now. Secret keys may only
          be displayed once.
        </small>
      `;

    }

    await loadApiKeys();

  } catch (error) {

    apiKeyResult.classList.remove(
      "hidden"
    );

    apiKeyResult.innerHTML =
      escapeHTML(
        error.message
      );

  }

}


async function revokeApiKey(
  keyId
) {

  if (
    !confirm(
      "Revoke this API key?"
    )
  ) {

    return;
  }

  try {

    await apiFetch(
      `/api/keys/${encodeURIComponent(
        keyId
      )}`,
      {
        method:
          "DELETE"
      }
    );

    showToast(
      "API key revoked."
    );

    await loadApiKeys();

  } catch (error) {

    showToast(
      error.message
    );

  }

}


/* ========================================================
   GOOGLE LOGIN
======================================================== */

async function googleLogin() {

  try {

    const response =
      await fetch(
        `${API_URL}/api/auth/google`
      );

    const data =
      await response.json();

    if (
      data.configured &&
      data.url
    ) {

      window.location.href =
        data.url;

      return;
    }

    showToast(
      "Google Login is not configured on the Worker yet."
    );

  } catch {

    showToast(
      "Google Login is unavailable."
    );

  }

}


/* ========================================================
   MOBILE SIDEBAR
======================================================== */

function closeMobileSidebar() {

  sidebar.classList.remove(
    "open"
  );

}


/* ========================================================
   EVENT LISTENERS
======================================================== */

openSidebar.addEventListener(
  "click",
  () => {

    sidebar.classList.add(
      "open"
    );

  }
);


closeSidebar.addEventListener(
  "click",
  closeMobileSidebar
);


newChatBtn.addEventListener(
  "click",
  newChat
);


sendBtn.addEventListener(
  "click",
  () =>
    sendMessage()
);


messageInput.addEventListener(
  "input",
  autoResizeTextarea
);


messageInput.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      sendMessage();

    }

  }
);


attachBtn.addEventListener(
  "click",
  () =>
    fileInput.click()
);


fileInput.addEventListener(
  "change",
  event => {

    const file =
      event.target.files[0];

    if (!file) {
      return;
    }

    selectedFile =
      file;

    updateAttachmentPreview();

    showToast(
      `${file.name} attached`
    );

  }
);


voiceBtn.addEventListener(
  "click",
  toggleVoice
);


/* ================================= */
/* MODES */
/* ================================= */

document
  .querySelectorAll(
    ".mode-button"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(
            ".mode-button"
          )
          .forEach(
            item =>
              item.classList.remove(
                "active"
              )
          );

        button.classList.add(
          "active"
        );

        currentMode =
          button.dataset.mode;

        messageInput.focus();

      }
    );

  });


/* ================================= */
/* QUICK PROMPTS */
/* ================================= */

document
  .querySelectorAll(
    ".quick-card"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        messageInput.value =
          button.dataset.prompt;

        autoResizeTextarea();

        messageInput.focus();

      }
    );

  });


/* ================================= */
/* SETTINGS */
/* ================================= */

settingsBtn.addEventListener(
  "click",
  openSettingsModal
);


settingsTopBtn.addEventListener(
  "click",
  openSettingsModal
);


closeSettings.addEventListener(
  "click",
  closeSettingsModal
);


settingsOverlay.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      settingsOverlay
    ) {

      closeSettingsModal();

    }

  }
);


/* ================================= */
/* CLEAR */
/* ================================= */

clearChatBtn.addEventListener(
  "click",
  () => {

    if (
      !currentChatId &&
      !messages.children.length
    ) {

      return;
    }

    newChat();

  }
);


/* ================================= */
/* GOOGLE */
/* ================================= */

googleLoginBtn.addEventListener(
  "click",
  googleLogin
);


/* ================================= */
/* API KEY */
/* ================================= */

createApiKeyBtn.addEventListener(
  "click",
  createApiKey
);


/* ========================================================
   KEYBOARD SHORTCUT
======================================================== */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.ctrlKey &&
      event.key.toLowerCase() ===
        "k"
    ) {

      event.preventDefault();

      newChat();

    }

    if (
      event.key === "Escape"
    ) {

      closeSettingsModal();

      closeMobileSidebar();

    }

  }
);


/* ========================================================
   STARTUP
======================================================== */

async function startApp() {

  console.log(
    "LOGIC-LEAF frontend starting..."
  );

  console.log(
    "Worker:",
    API_URL
  );

  await checkBackend();

  await loadChats();

  messageInput.focus();

}


startApp();
