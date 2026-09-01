// ============================================================
// LOGIC-LEAF — APP.JS
// Firebase Google Login + Worker + Chat + History + Settings
// ============================================================

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


// ============================================================
// CONFIG
// ============================================================

const API_URL = "https://logic-leaf.qtmkiller6.workers.dev";

const firebaseConfig = {
  apiKey: "AIzaSyC_C_ACjRupgX9jEUON1FsS58igSA45aw",
  authDomain: "logic-leaf.firebaseapp.com",
  databaseURL: "https://logic-leaf-default-rtdb.firebaseio.com",
  projectId: "logic-leaf",
  storageBucket: "logic-leaf.firebasestorage.app",
  messagingSenderId: "288673697563",
  appId: "1:288673697563:web:c14d08452b01568d1c8dbe",
  measurementId: "G-Z30K3K85LX"
};


// ============================================================
// FIREBASE
// ============================================================

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const provider = new GoogleAuthProvider();


// ============================================================
// DOM
// ============================================================

const $ = (id) => document.getElementById(id);

const loginScreen = $("loginScreen");
const appScreen = $("appScreen");

const googleLoginBtn = $("googleLoginBtn");
const loginError = $("loginError");

const sidebar = $("sidebar");
const openSidebarBtn = $("openSidebarBtn");
const closeSidebarBtn = $("closeSidebarBtn");

const newChatBtn = $("newChatBtn");
const chatHistory = $("chatHistory");

const messages = $("messages");
const welcomeView = $("welcomeView");

const messageInput = $("messageInput");
const sendBtn = $("sendBtn");

const attachBtn = $("attachBtn");
const fileInput = $("fileInput");

const imageBtn = $("imageBtn");
const imageInput = $("imageInput");

const voiceBtn = $("voiceBtn");

const settingsBtn = $("settingsBtn");
const profileBtn = $("profileBtn");

const settingsOverlay = $("settingsOverlay");
const closeSettingsBtn = $("closeSettingsBtn");

const apiKeysBtn = $("apiKeysBtn");
const apiOverlay = $("apiOverlay");
const closeApiBtn = $("closeApiBtn");

const logoutBtn = $("logoutBtn");

const createApiKeyBtn = $("createApiKeyBtn");
const copyApiKeyBtn = $("copyApiKeyBtn");

const newKeyBox = $("newKeyBox");
const newApiKey = $("newApiKey");

const apiKeyList = $("apiKeyList");

const attachmentPreview = $("attachmentPreview");

const imagePreviewOverlay = $("imagePreviewOverlay");
const imagePreview = $("imagePreview");
const closeImagePreviewBtn = $("closeImagePreviewBtn");
const useImageBtn = $("useImageBtn");


// ============================================================
// STATE
// ============================================================

let currentUser = null;
let currentChatId = null;
let selectedFile = null;
let selectedImage = null;
let recognition = null;

const STORAGE_KEY = "logic_leaf_chats";


// ============================================================
// CHAT STORAGE
// ============================================================

function getChats() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveChats(chats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

function createChat() {

  const id =
    "chat_" +
    Date.now() +
    "_" +
    Math.random().toString(36).slice(2, 8);

  const chat = {
    id,
    title: "New chat",
    messages: [],
    createdAt: Date.now()
  };

  const chats = getChats();

  chats.unshift(chat);

  saveChats(chats);

  currentChatId = id;

  renderHistory();
  renderCurrentChat();

  return chat;
}

function getCurrentChat() {

  const chats = getChats();

  return chats.find(
    chat => chat.id === currentChatId
  );
}

function saveCurrentChat() {

  if (!currentChatId) return;

  const chats = getChats();

  const index = chats.findIndex(
    chat => chat.id === currentChatId
  );

  if (index === -1) return;

  saveChats(chats);
}


// ============================================================
// HISTORY UI
// ============================================================

function renderHistory() {

  if (!chatHistory) return;

  const chats = getChats();

  chatHistory.innerHTML = "";

  if (!chats.length) {

    const empty = document.createElement("div");

    empty.className = "empty-state";
    empty.textContent = "No chats yet.";

    chatHistory.appendChild(empty);

    return;
  }

  chats.forEach(chat => {

    const button = document.createElement("button");

    button.className = "history-item";

    if (chat.id === currentChatId) {
      button.classList.add("active");
    }

    button.textContent =
      chat.title || "New chat";

    button.addEventListener("click", () => {

      currentChatId = chat.id;

      renderHistory();
      renderCurrentChat();

      if (window.innerWidth <= 760) {
        sidebar.classList.remove("open");
      }
    });

    chatHistory.appendChild(button);

  });
}


// ============================================================
// CHAT RENDER
// ============================================================

function renderCurrentChat() {

  if (!messages) return;

  messages.innerHTML = "";

  const chat = getCurrentChat();

  if (!chat || !chat.messages.length) {

    welcomeView?.classList.remove("hidden");

    return;
  }

  welcomeView?.classList.add("hidden");

  chat.messages.forEach(message => {

    addMessageToDOM(
      message.role,
      message.content,
      false
    );

  });

}

function addMessageToDOM(
  role,
  content,
  scroll = true
) {

  welcomeView?.classList.add("hidden");

  const wrapper = document.createElement("div");

  wrapper.className =
    "message " +
    (role === "user" ? "user" : "ai");

  const box = document.createElement("div");

  box.className = "message-content";

  const roleLabel = document.createElement("div");

  roleLabel.className = "message-role";

  roleLabel.textContent =
    role === "user"
      ? "YOU"
      : "LOGIC-LEAF";

  const text = document.createElement("div");

  text.textContent = content;

  box.appendChild(roleLabel);
  box.appendChild(text);

  wrapper.appendChild(box);

  messages.appendChild(wrapper);

  if (scroll) {

    setTimeout(() => {

      const area = document.querySelector(".chat-area");

      if (area) {
        area.scrollTop = area.scrollHeight;
      }

    }, 20);
  }
}


// ============================================================
// LOGIN
// ============================================================

googleLoginBtn?.addEventListener(
  "click",
  async () => {

    loginError.textContent = "";

    googleLoginBtn.disabled = true;

    try {

      await signInWithPopup(
        auth,
        provider
      );

    } catch (error) {

      console.error(error);

      loginError.textContent =
        error?.message ||
        "Google login failed.";

      googleLoginBtn.disabled = false;
    }
  }
);


// ============================================================
// AUTH STATE
// ============================================================

onAuthStateChanged(
  auth,
  user => {

    currentUser = user;

    if (user) {

      loginScreen?.classList.add("hidden");
      appScreen?.classList.remove("hidden");

      updateUserUI(user);

      const chats = getChats();

      if (!currentChatId) {

        if (chats.length) {
          currentChatId = chats[0].id;
        } else {
          createChat();
        }

      }

      renderHistory();
      renderCurrentChat();

    } else {

      loginScreen?.classList.remove("hidden");
      appScreen?.classList.add("hidden");

    }

  }
);


// ============================================================
// USER UI
// ============================================================

function updateUserUI(user) {

  const name =
    user.displayName ||
    "User";

  const email =
    user.email ||
    "";

  const photo =
    user.photoURL ||
    "";

  $("userName").textContent = name;
  $("userEmail").textContent = email;

  $("settingsName").textContent = name;
  $("settingsEmail").textContent = email;

  setAvatar(
    $("userAvatar"),
    photo,
    name
  );

  setAvatar(
    $("headerAvatar"),
    photo,
    name
  );

  setAvatar(
    $("settingsAvatar"),
    photo,
    name
  );
}

function setAvatar(element, photo, name) {

  if (!element) return;

  element.innerHTML = "";

  if (photo) {

    const img =
      document.createElement("img");

    img.src = photo;
    img.alt = "";

    element.appendChild(img);

  } else {

    element.textContent =
      (name || "U")
        .trim()
        .charAt(0)
        .toUpperCase();
  }
}


// ============================================================
// SIGN OUT
// ============================================================

logoutBtn?.addEventListener(
  "click",
  async () => {

    try {

      await signOut(auth);

      currentUser = null;
      currentChatId = null;

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

    }
  }
);


// ============================================================
// SIDEBAR
// ============================================================

openSidebarBtn?.addEventListener(
  "click",
  () => {
    sidebar?.classList.add("open");
  }
);

closeSidebarBtn?.addEventListener(
  "click",
  () => {
    sidebar?.classList.remove("open");
  }
);


// ============================================================
// NEW CHAT
// ============================================================

newChatBtn?.addEventListener(
  "click",
  () => {

    createChat();

    if (window.innerWidth <= 760) {
      sidebar?.classList.remove("open");
    }

    messageInput?.focus();
  }
);


// ============================================================
// SETTINGS
// ============================================================

settingsBtn?.addEventListener(
  "click",
  () => {

    settingsOverlay?.classList.remove("hidden");

  }
);

profileBtn?.addEventListener(
  "click",
  () => {

    settingsOverlay?.classList.remove("hidden");

  }
);

closeSettingsBtn?.addEventListener(
  "click",
  () => {

    settingsOverlay?.classList.add("hidden");

  }
);


// ============================================================
// API PANEL
// ============================================================

apiKeysBtn?.addEventListener(
  "click",
  () => {

    settingsOverlay?.classList.add("hidden");
    apiOverlay?.classList.remove("hidden");

    loadApiKeys();

  }
);

closeApiBtn?.addEventListener(
  "click",
  () => {

    apiOverlay?.classList.add("hidden");

  }
);


// ============================================================
// API REQUEST HELPER
// ============================================================

async function workerRequest(
  path,
  options = {}
) {

  if (!currentUser) {
    throw new Error("Please sign in first.");
  }

  const token =
    await currentUser.getIdToken();

  const headers = {
    ...(options.headers || {}),
    Authorization:
      `Bearer ${token}`
  };

  if (
    options.body &&
    !(options.body instanceof FormData)
  ) {

    headers["Content-Type"] =
      "application/json";
  }

  const response =
    await fetch(
      API_URL + path,
      {
        ...options,
        headers
      }
    );

  const text =
    await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = {
      error: text
    };
  }

  if (!response.ok) {

    throw new Error(
      data?.error ||
      data?.message ||
      `Request failed (${response.status})`
    );
  }

  return data;
}


// ============================================================
// SEND CHAT
// ============================================================

async function sendMessage() {

  const text =
    messageInput.value.trim();

  if (!text) return;

  if (!currentUser) {

    alert("Please sign in first.");

    return;
  }

  if (!currentChatId) {
    createChat();
  }

  const chat = getCurrentChat();

  if (!chat) return;

  chat.messages.push({
    role: "user",
    content: text
  });

  if (
    chat.title === "New chat"
  ) {

    chat.title =
      text.length > 45
        ? text.slice(0, 45) + "…"
        : text;
  }

  saveChats(getChats());

  addMessageToDOM(
    "user",
    text
  );

  messageInput.value = "";
  messageInput.style.height = "auto";

  renderHistory();

  sendBtn.disabled = true;

  const loading = document.createElement("div");

  loading.className =
    "message ai";

  loading.id =
    "ai-loading";

  loading.innerHTML = `
    <div class="message-content">
      <div class="message-role">LOGIC-LEAF</div>
      <div>Thinking…</div>
    </div>
  `;

  messages.appendChild(loading);

  try {

    const result =
      await workerRequest(
        "/v1/chat",
        {
          method: "POST",
          body: JSON.stringify({
            messages: chat.messages.map(
              m => ({
                role: m.role,
                content: m.content
              })
            )
          })
        }
      );

    loading.remove();

    const answer =
      extractAIResponse(result);

    chat.messages.push({
      role: "assistant",
      content: answer
    });

    saveChats(getChats());

    addMessageToDOM(
      "assistant",
      answer
    );

  } catch (error) {

    loading.remove();

    const errorMessage =
      "Sorry, something went wrong.\n\n" +
      error.message;

    chat.messages.push({
      role: "assistant",
      content: errorMessage
    });

    saveChats(getChats());

    addMessageToDOM(
      "assistant",
      errorMessage
    );

    console.error(
      "Worker error:",
      error
    );

  } finally {

    sendBtn.disabled = false;

    messageInput.focus();
  }
}


// ============================================================
// RESPONSE PARSER
// ============================================================

function extractAIResponse(data) {

  if (!data) {
    return "The AI returned an empty response.";
  }

  if (typeof data === "string") {
    return data;
  }

  return (
    data.response ||
    data.text ||
    data.output ||
    data.content ||
    data.message?.content ||
    data.result?.response ||
    "The AI returned no text."
  );
}


// ============================================================
// SEND EVENTS
// ============================================================

sendBtn?.addEventListener(
  "click",
  sendMessage
);

messageInput?.addEventListener(
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

messageInput?.addEventListener(
  "input",
  () => {

    messageInput.style.height =
      "auto";

    messageInput.style.height =
      Math.min(
        messageInput.scrollHeight,
        160
      ) + "px";

  }
);


// ============================================================
// QUICK ACTIONS
// ============================================================

document
  .querySelectorAll(".quick-card")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const prompt =
          button.dataset.prompt || "";

        messageInput.value =
          prompt;

        messageInput.focus();

        messageInput.dispatchEvent(
          new Event("input")
        );

      }
    );

  });


// ============================================================
// FILE CONTROL
// ============================================================

attachBtn?.addEventListener(
  "click",
  () => {
    fileInput?.click();
  }
);

fileInput?.addEventListener(
  "change",
  () => {

    const file =
      fileInput.files?.[0];

    if (!file) return;

    selectedFile = file;

    addAttachmentChip(
      file.name
    );

  }
);


// ============================================================
// IMAGE CONTROL
// ============================================================

imageBtn?.addEventListener(
  "click",
  () => {
    imageInput?.click();
  }
);

imageInput?.addEventListener(
  "change",
  () => {

    const file =
      imageInput.files?.[0];

    if (!file) return;

    selectedImage = file;

    const url =
      URL.createObjectURL(file);

    imagePreview.src = url;

    imagePreviewOverlay.classList.remove(
      "hidden"
    );

  }
);

closeImagePreviewBtn?.addEventListener(
  "click",
  () => {

    imagePreviewOverlay.classList.add(
      "hidden"
    );

    imagePreview.src = "";

  }
);

useImageBtn?.addEventListener(
  "click",
  () => {

    if (!selectedImage) return;

    addAttachmentChip(
      selectedImage.name
    );

    imagePreviewOverlay.classList.add(
      "hidden"
    );

  }
);


// ============================================================
// ATTACHMENT UI
// ============================================================

function addAttachmentChip(name) {

  attachmentPreview.innerHTML = "";

  const chip =
    document.createElement("div");

  chip.className =
    "attachment-chip";

  chip.textContent =
    "Attached: " + name;

  attachmentPreview.appendChild(
    chip
  );
}


// ============================================================
// VOICE INPUT
// ============================================================

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

if (SpeechRecognition) {

  recognition =
    new SpeechRecognition();

  recognition.lang = "en-IN";

  recognition.continuous = false;

  recognition.interimResults = false;

  recognition.onstart = () => {

    voiceBtn.textContent = "●";

  };

  recognition.onend = () => {

    voiceBtn.textContent = "◉";

  };

  recognition.onerror = error => {

    console.error(
      "Voice error:",
      error
    );

    voiceBtn.textContent = "◉";

  };

  recognition.onresult =
    event => {

      const transcript =
        event.results[0][0].transcript;

      messageInput.value +=
        (
          messageInput.value
            ? " "
            : ""
        ) + transcript;

      messageInput.dispatchEvent(
        new Event("input")
      );

    };

} else {

  voiceBtn.disabled = true;

  voiceBtn.title =
    "Voice input is not supported by this browser.";

}

voiceBtn?.addEventListener(
  "click",
  () => {

    if (!recognition) return;

    try {

      recognition.start();

    } catch {

      // Prevent duplicate start errors.

    }

  }
);


// ============================================================
// API KEY LIST
// ============================================================

async function loadApiKeys() {

  apiKeyList.innerHTML = `
    <div class="empty-state">
      Loading API keys…
    </div>
  `;

  try {

    const data =
      await workerRequest(
        "/v1/keys",
        {
          method: "GET"
        }
      );

    renderApiKeys(
      data.keys || data.data || []
    );

  } catch (error) {

    apiKeyList.innerHTML = `
      <div class="empty-state">
        ${escapeHTML(error.message)}
      </div>
    `;

  }
}

function renderApiKeys(keys) {

  apiKeyList.innerHTML = "";

  if (!keys.length) {

    apiKeyList.innerHTML = `
      <div class="empty-state">
        No API keys created yet.
      </div>
    `;

    return;
  }

  keys.forEach(key => {

    const item =
      document.createElement("div");

    item.className =
      "api-key-item";

    const top =
      document.createElement("div");

    top.className =
      "api-key-item-top";

    const info =
      document.createElement("div");

    const name =
      document.createElement("div");

    name.className =
      "api-key-name";

    name.textContent =
      key.name ||
      "LOGIC-LEAF API key";

    const meta =
      document.createElement("div");

    meta.className =
      "api-key-meta";

    meta.textContent =
      key.prefix
        ? `${key.prefix} • ${key.status || "active"}`
        : key.status || "active";

    info.appendChild(name);
    info.appendChild(meta);

    const revoke =
      document.createElement("button");

    revoke.className =
      "revoke-key-btn";

    revoke.textContent =
      "Revoke";

    revoke.addEventListener(
      "click",
      () => revokeApiKey(key)
    );

    top.appendChild(info);
    top.appendChild(revoke);

    item.appendChild(top);

    apiKeyList.appendChild(item);

  });
}


// ============================================================
// CREATE API KEY
// ============================================================

createApiKeyBtn?.addEventListener(
  "click",
  async () => {

    createApiKeyBtn.disabled = true;

    createApiKeyBtn.textContent =
      "Creating…";

    try {

      const data =
        await workerRequest(
          "/v1/keys",
          {
            method: "POST",
            body: JSON.stringify({
              name: "LOGIC-LEAF API Key"
            })
          }
        );

      const key =
        data.key ||
        data.api_key ||
        data.apiKey;

      if (!key) {

        throw new Error(
          "The Worker did not return an API key."
        );
      }

      newApiKey.textContent =
        key;

      newKeyBox.classList.remove(
        "hidden"
      );

      await loadApiKeys();

    } catch (error) {

      alert(
        "Could not create API key:\n\n" +
        error.message
      );

    } finally {

      createApiKeyBtn.disabled =
        false;

      createApiKeyBtn.textContent =
        "+ Create API key";

    }
  }
);


// ============================================================
// COPY API KEY
// ============================================================

copyApiKeyBtn?.addEventListener(
  "click",
  async () => {

    const value =
      newApiKey.textContent.trim();

    if (!value || value === "—") {
      return;
    }

    try {

      await navigator.clipboard.writeText(
        value
      );

      copyApiKeyBtn.textContent =
        "Copied";

      setTimeout(() => {

        copyApiKeyBtn.textContent =
          "Copy";

      }, 1500);

    } catch {

      alert(
        "Copy failed. Please copy it manually."
      );

    }
  }
);


// ============================================================
// REVOKE API KEY
// ============================================================

async function revokeApiKey(key) {

  const id =
    key.id ||
    key.key_id ||
    key.keyId;

  if (!id) {

    alert(
      "This API key has no revocation ID."
    );

    return;
  }

  const confirmed =
    confirm(
      "Revoke this API key?"
    );

  if (!confirmed) return;

  try {

    await workerRequest(
      `/v1/keys/${encodeURIComponent(id)}`,
      {
        method: "DELETE"
      }
    );

    await loadApiKeys();

  } catch (error) {

    alert(
      "Could not revoke key:\n\n" +
      error.message
    );

  }
}


// ============================================================
// SECURITY HELPERS
// ============================================================

function escapeHTML(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


// ============================================================
// CLOSE OVERLAYS WHEN CLICKING BACKDROP
// ============================================================

settingsOverlay?.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      settingsOverlay
    ) {

      settingsOverlay.classList.add(
        "hidden"
      );

    }

  }
);

apiOverlay?.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      apiOverlay
    ) {

      apiOverlay.classList.add(
        "hidden"
      );

    }

  }
);

imagePreviewOverlay?.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      imagePreviewOverlay
    ) {

      imagePreviewOverlay.classList.add(
        "hidden"
      );

    }

  }
);


// ============================================================
// STARTUP
// ============================================================

renderHistory();

console.log(
  "LOGIC-LEAF frontend initialized."
);

console.log(
  "Worker:",
  API_URL
);
