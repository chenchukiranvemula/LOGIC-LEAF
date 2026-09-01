/* =========================================================
   LOGIC-LEAF — app.js
   Firebase Google Login + Cloudflare Worker AI
========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

/* =========================================================
   CONFIG
========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyB5bg4U8aMJlAhbWgU0sL37BN4JTTRpmMw",
  authDomain: "logic-leaf-64d0d.firebaseapp.com",
  projectId: "logic-leaf-64d0d",
  storageBucket: "logic-leaf-64d0d.firebasestorage.app",
  messagingSenderId: "346443954182",
  appId: "1:346443954182:web:2ab5bb71b5e52206e62b87",
  measurementId: "G-ZVVBH04E9M"
};

/* Your deployed Worker */
const API_URL = "https://ck.qtmkiller6.workers.dev";

/* =========================================================
   FIREBASE
========================================================= */

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account"
});

/* =========================================================
   STATE
========================================================= */

let currentUser = null;
let currentChatId = null;
let chats = JSON.parse(localStorage.getItem("logic_leaf_chats") || "{}");
let isGenerating = false;

/* =========================================================
   DOM HELPERS
========================================================= */

const $ = (selector) => document.querySelector(selector);

const messages = $("#messages");
const welcomeScreen = $("#welcomeScreen");
const chatInput = $("#chatInput");
const sendBtn = $("#sendBtn");
const historyList = $("#historyList");

const loginModal = $("#loginModal");
const settingsModal = $("#settingsModal");

const loginBtn = $("#loginBtn");
const googleLoginBtn = $("#googleLoginBtn");
const logoutBtn = $("#logoutBtn");

const menuBtn = $("#menuBtn");
const sidebar = $("#sidebar");

const newChatBtn = $("#newChatBtn");

const attachBtn = $("#attachBtn");
const attachmentMenu = $("#attachmentMenu");

const fileInput = $("#fileInput");
const imageInput = $("#imageInput");

const modelBtn = $("#modelBtn");
const modelMenu = $("#modelMenu");

const toast = $("#toast");

/* =========================================================
   SAFE ELEMENT FUNCTIONS
========================================================= */

function show(element) {
  if (element) element.classList.remove("hidden");
}

function hide(element) {
  if (element) element.classList.add("hidden");
}

function text(element, value) {
  if (element) element.textContent = value;
}

/* =========================================================
   TOAST
========================================================= */

let toastTimer;

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

/* =========================================================
   SIDEBAR
========================================================= */

if (menuBtn) {
  menuBtn.addEventListener("click", () => {
    sidebar?.classList.toggle("closed");
  });
}

/* =========================================================
   LOGIN MODAL
========================================================= */

function openLogin() {
  show(loginModal);
}

function closeLogin() {
  hide(loginModal);
}

if (loginBtn) {
  loginBtn.addEventListener("click", openLogin);
}

/* Close buttons */

document.querySelectorAll("[data-close-login]").forEach((button) => {
  button.addEventListener("click", closeLogin);
});

document.querySelectorAll("[data-close-settings]").forEach((button) => {
  button.addEventListener("click", () => hide(settingsModal));
});

/* =========================================================
   GOOGLE LOGIN
========================================================= */

if (googleLoginBtn) {
  googleLoginBtn.addEventListener("click", async () => {

    try {

      googleLoginBtn.disabled = true;
      googleLoginBtn.textContent = "Signing in…";

      const result = await signInWithPopup(
        auth,
        googleProvider
      );

      currentUser = result.user;

      closeLogin();

      showToast(`Welcome, ${currentUser.displayName || "User"}`);

      updateUserUI();

    } catch (error) {

      console.error("Google login error:", error);

      let message = "Google login failed.";

      if (error.code === "auth/popup-closed-by-user") {
        message = "Login window was closed.";
      }

      if (error.code === "auth/unauthorized-domain") {
        message =
          "This website is not added to Firebase Authorized Domains.";
      }

      if (error.code === "auth/api-key-not-valid") {
        message =
          "Firebase API key is invalid. Check the Firebase project configuration.";
      }

      showToast(message);

    } finally {

      googleLoginBtn.disabled = false;
      googleLoginBtn.textContent = "Continue with Google";

    }

  });
}

/* =========================================================
   AUTH STATE
========================================================= */

onAuthStateChanged(auth, (user) => {

  currentUser = user || null;

  updateUserUI();

});

/* =========================================================
   USER UI
========================================================= */

function updateUserUI() {

  const nameElements = document.querySelectorAll(
    "[data-user-name]"
  );

  const emailElements = document.querySelectorAll(
    "[data-user-email]"
  );

  const avatarElements = document.querySelectorAll(
    "[data-user-avatar]"
  );

  if (!currentUser) {

    nameElements.forEach(el => {
      el.textContent = "Guest";
    });

    emailElements.forEach(el => {
      el.textContent = "Sign in to continue";
    });

    avatarElements.forEach(el => {
      el.textContent = "G";
    });

    return;
  }

  nameElements.forEach(el => {
    el.textContent =
      currentUser.displayName ||
      currentUser.email?.split("@")[0] ||
      "User";
  });

  emailElements.forEach(el => {
    el.textContent =
      currentUser.email || "";
  });

  avatarElements.forEach(el => {

    if (currentUser.photoURL) {

      el.innerHTML = "";

      const img = document.createElement("img");

      img.src = currentUser.photoURL;
      img.alt = "User";

      el.appendChild(img);

    } else {

      el.textContent =
        (currentUser.displayName ||
          currentUser.email ||
          "U")
          .charAt(0)
          .toUpperCase();

    }

  });

}

/* =========================================================
   LOGOUT
========================================================= */

if (logoutBtn) {

  logoutBtn.addEventListener("click", async () => {

    try {

      await signOut(auth);

      showToast("Signed out");

      hide(settingsModal);

    } catch (error) {

      console.error(error);

      showToast("Could not sign out.");

    }

  });

}

/* =========================================================
   SETTINGS
========================================================= */

document.querySelectorAll("[data-open-settings]").forEach((button) => {

  button.addEventListener("click", () => {

    show(settingsModal);

  });

});

document.querySelectorAll(".settings-nav-btn").forEach((button) => {

  button.addEventListener("click", () => {

    document
      .querySelectorAll(".settings-nav-btn")
      .forEach(btn => btn.classList.remove("active"));

    document
      .querySelectorAll(".settings-page")
      .forEach(page => page.classList.remove("active"));

    button.classList.add("active");

    const target = button.dataset.target;

    const page = document.querySelector(
      `[data-page="${target}"]`
    );

    if (page) {
      page.classList.add("active");
    }

  });

});

/* =========================================================
   MODEL MENU
========================================================= */

if (modelBtn) {

  modelBtn.addEventListener("click", () => {

    modelMenu?.classList.toggle("hidden");

  });

}

document.querySelectorAll(".model-option").forEach((option) => {

  option.addEventListener("click", () => {

    document
      .querySelectorAll(".model-option")
      .forEach(item => item.classList.remove("active"));

    option.classList.add("active");

    const name = option.dataset.modelName;

    const modelName = $("#selectedModel");

    if (modelName && name) {
      modelName.textContent = name;
    }

    hide(modelMenu);

  });

});

/* =========================================================
   NEW CHAT
========================================================= */

function createNewChat() {

  currentChatId =
    "chat_" +
    Date.now();

  chats[currentChatId] = {
    id: currentChatId,
    title: "New chat",
    messages: []
  };

  saveChats();

  renderChatHistory();

  renderMessages();

  welcomeScreen?.classList.remove("hidden");

  chatInput?.focus();

}

if (newChatBtn) {
  newChatBtn.addEventListener("click", createNewChat);
}

/* =========================================================
   STORAGE
========================================================= */

function saveChats() {

  localStorage.setItem(
    "logic_leaf_chats",
    JSON.stringify(chats)
  );

}

/* =========================================================
   CHAT HISTORY
========================================================= */

function renderChatHistory() {

  if (!historyList) return;

  historyList.innerHTML = "";

  const chatEntries =
    Object.values(chats)
      .sort((a, b) => b.id.localeCompare(a.id));

  if (!chatEntries.length) {

    const empty = document.createElement("div");

    empty.className = "history-empty";

    empty.textContent = "No conversations yet.";

    historyList.appendChild(empty);

    return;

  }

  chatEntries.forEach(chat => {

    const button =
      document.createElement("button");

    button.className =
      "history-item" +
      (chat.id === currentChatId ? " active" : "");

    button.innerHTML = `
      <span>◌</span>
      <span class="history-item-title">
        ${escapeHTML(chat.title || "New chat")}
      </span>
    `;

    button.addEventListener("click", () => {

      currentChatId = chat.id;

      renderMessages();

      renderChatHistory();

      if (window.innerWidth <= 850) {
        sidebar?.classList.add("closed");
      }

    });

    historyList.appendChild(button);

  });

}

/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}

/* =========================================================
   MESSAGE RENDERING
========================================================= */

function renderMessages() {

  if (!messages) return;

  messages.innerHTML = "";

  const chat =
    chats[currentChatId];

  if (!chat || !chat.messages.length) {

    show(welcomeScreen);

    return;

  }

  hide(welcomeScreen);

  chat.messages.forEach(message => {

    addMessageToDOM(
      message.role,
      message.content,
      false
    );

  });

  scrollToBottom();

}

/* =========================================================
   ADD MESSAGE
========================================================= */

function addMessageToDOM(
  role,
  content,
  animate = true
) {

  if (!messages) return;

  const wrapper =
    document.createElement("div");

  wrapper.className =
    `message ${role}`;

  if (!animate) {
    wrapper.style.animation = "none";
  }

  const contentBox =
    document.createElement("div");

  contentBox.className =
    "message-content";

  if (role === "ai") {

    contentBox.innerHTML = `
      <div class="message-role">
        <span class="message-role-dot"></span>
        LOGIC-LEAF
      </div>

      <div class="message-text">
        ${formatAIResponse(content)}
      </div>

      <div class="message-actions">
        <button data-copy>Copy</button>
      </div>
    `;

  } else {

    contentBox.innerHTML = `
      <div class="message-text">
        ${escapeHTML(content)}
      </div>
    `;

  }

  wrapper.appendChild(contentBox);

  messages.appendChild(wrapper);

  const copyButton =
    wrapper.querySelector("[data-copy]");

  if (copyButton) {

    copyButton.addEventListener("click", async () => {

      try {

        await navigator.clipboard.writeText(content);

        showToast("Copied");

      } catch {

        showToast("Copy failed");

      }

    });

  }

}

/* =========================================================
   FORMAT AI RESPONSE
========================================================= */

function formatAIResponse(textValue) {

  if (!textValue) return "";

  let html =
    escapeHTML(textValue);

  /* Code blocks */

  html = html.replace(
    /```([\s\S]*?)```/g,
    (_, code) => {

      return `
        <div class="code-block">

          <div class="code-header">

            <span>Code</span>

            <button
              class="code-copy"
              data-code="${encodeURIComponent(code.trim())}">
              Copy
            </button>

          </div>

          <pre>${code.trim()}</pre>

        </div>
      `;

    }
  );

  /* Bold */

  html = html.replace(
    /\*\*(.*?)\*\*/g,
    "<strong>$1</strong>"
  );

  /* Inline code */

  html = html.replace(
    /`([^`]+)`/g,
    "<code>$1</code>"
  );

  return html;

}

/* =========================================================
   CODE COPY
========================================================= */

document.addEventListener("click", async (event) => {

  const button =
    event.target.closest(".code-copy");

  if (!button) return;

  try {

    const code =
      decodeURIComponent(
        button.dataset.code || ""
      );

    await navigator.clipboard.writeText(code);

    button.textContent = "Copied";

    setTimeout(() => {
      button.textContent = "Copy";
    }, 1200);

  } catch {

    showToast("Copy failed");

  }

});

/* =========================================================
   SCROLL
========================================================= */

function scrollToBottom() {

  if (!messages) return;

  requestAnimationFrame(() => {

    messages.scrollTop =
      messages.scrollHeight;

  });

}

/* =========================================================
   ENSURE CHAT
========================================================= */

function ensureChat() {

  if (
    currentChatId &&
    chats[currentChatId]
  ) {
    return;
  }

  createNewChat();

}

/* =========================================================
   SEND MESSAGE
========================================================= */

async function sendMessage() {

  if (isGenerating) return;

  const prompt =
    chatInput?.value.trim();

  if (!prompt) return;

  ensureChat();

  isGenerating = true;

  if (sendBtn) {
    sendBtn.disabled = true;
  }

  hide(welcomeScreen);

  chats[currentChatId].messages.push({
    role: "user",
    content: prompt
  });

  if (
    chats[currentChatId].title === "New chat"
  ) {

    chats[currentChatId].title =
      prompt.slice(0, 45);

  }

  saveChats();

  addMessageToDOM(
    "user",
    prompt
  );

  chatInput.value = "";

  autoResizeTextarea();

  scrollToBottom();

  /* Typing */

  const typingWrapper =
    document.createElement("div");

  typingWrapper.className =
    "message ai";

  typingWrapper.innerHTML = `
    <div class="message-content">

      <div class="message-role">
        <span class="message-role-dot"></span>
        LOGIC-LEAF
      </div>

      <div class="typing">
        <span></span>
        <span></span>
        <span></span>
      </div>

    </div>
  `;

  messages.appendChild(typingWrapper);

  scrollToBottom();

  try {

    const response =
      await fetch(
        `${API_URL}/v1/chat`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            message: prompt,

            messages:
              chats[currentChatId]
                .messages
                .slice(-20),

            user: currentUser
              ? {
                  uid: currentUser.uid,
                  email: currentUser.email,
                  name: currentUser.displayName
                }
              : null

          })

        }
      );

    typingWrapper.remove();

    if (!response.ok) {

      throw new Error(
        `Worker returned ${response.status}`
      );

    }

    const data =
      await response.json();

    const answer =
      extractAnswer(data);

    chats[currentChatId].messages.push({
      role: "ai",
      content: answer
    });

    saveChats();

    addMessageToDOM(
      "ai",
      answer
    );

    renderChatHistory();

    scrollToBottom();

  } catch (error) {

    console.error(
      "Worker error:",
      error
    );

    typingWrapper.remove();

    const errorMessage =
      "Sorry, something went wrong while connecting to LOGIC-LEAF.";

    chats[currentChatId].messages.push({
      role: "ai",
      content: errorMessage
    });

    saveChats();

    addMessageToDOM(
      "ai",
      errorMessage
    );

    showToast("Failed to fetch");

  } finally {

    isGenerating = false;

    if (sendBtn) {
      sendBtn.disabled = false;
    }

    chatInput?.focus();

  }

}

/* =========================================================
   EXTRACT WORKER ANSWER
========================================================= */

function extractAnswer(data) {

  if (!data) {
    return "The AI returned an empty response.";
  }

  if (typeof data === "string") {
    return data;
  }

  if (data.response) {
    return data.response;
  }

  if (data.answer) {
    return data.answer;
  }

  if (data.text) {
    return data.text;
  }

  if (data.result) {

    if (typeof data.result === "string") {
      return data.result;
    }

    if (data.result.response) {
      return data.result.response;
    }

  }

  if (
    data.choices &&
    data.choices[0]
  ) {

    const choice =
      data.choices[0];

    if (choice.message?.content) {
      return choice.message.content;
    }

    if (choice.text) {
      return choice.text;
    }

  }

  return JSON.stringify(
    data,
    null,
    2
  );

}

/* =========================================================
   SEND BUTTON
========================================================= */

if (sendBtn) {

  sendBtn.addEventListener(
    "click",
    sendMessage
  );

}

/* =========================================================
   ENTER TO SEND
========================================================= */

if (chatInput) {

  chatInput.addEventListener(
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

}

/* =========================================================
   TEXTAREA AUTO RESIZE
========================================================= */

function autoResizeTextarea() {

  if (!chatInput) return;

  chatInput.style.height = "auto";

  chatInput.style.height =
    Math.min(
      chatInput.scrollHeight,
      170
    ) + "px";

}

if (chatInput) {

  chatInput.addEventListener(
    "input",
    autoResizeTextarea
  );

}

/* =========================================================
   SUGGESTIONS
========================================================= */

document.querySelectorAll(".suggestion").forEach(button => {

  button.addEventListener("click", () => {

    const prompt =
      button.dataset.prompt ||
      button.textContent.trim();

    if (chatInput) {

      chatInput.value =
        prompt;

      autoResizeTextarea();

      chatInput.focus();

    }

  });

});

/* =========================================================
   ATTACHMENT MENU
========================================================= */

if (attachBtn) {

  attachBtn.addEventListener("click", event => {

    event.stopPropagation();

    attachmentMenu?.classList.toggle(
      "hidden"
    );

  });

}

document.addEventListener("click", event => {

  if (
    attachmentMenu &&
    !attachmentMenu.contains(event.target) &&
    event.target !== attachBtn
  ) {

    hide(attachmentMenu);

  }

});

/* =========================================================
   FILE UPLOAD
========================================================= */

document.querySelectorAll("[data-file-upload]").forEach(button => {

  button.addEventListener("click", () => {

    fileInput?.click();

    hide(attachmentMenu);

  });

});

document.querySelectorAll("[data-image-upload]").forEach(button => {

  button.addEventListener("click", () => {

    imageInput?.click();

    hide(attachmentMenu);

  });

});

if (fileInput) {

  fileInput.addEventListener(
    "change",
    () => {

      const files =
        Array.from(
          fileInput.files || []
        );

      if (!files.length) return;

      showToast(
        `${files.length} file selected`
      );

      /*
       * The UI accepts files here.
       * Actual PDF/image AI processing
       * depends on the Worker endpoint.
       */

    }
  );

}

if (imageInput) {

  imageInput.addEventListener(
    "change",
    () => {

      const files =
        Array.from(
          imageInput.files || []
        );

      if (!files.length) return;

      showToast(
        "Image selected"
      );

    }
  );

}

/* =========================================================
   CLEAR CHAT HISTORY
========================================================= */

document.querySelectorAll("[data-clear-history]").forEach(button => {

  button.addEventListener("click", () => {

    if (
      !confirm(
        "Delete all local chat history?"
      )
    ) {
      return;
    }

    chats = {};

    currentChatId = null;

    saveChats();

    renderChatHistory();

    createNewChat();

    showToast(
      "Chat history cleared"
    );

  });

});

/* =========================================================
   WORKER HEALTH CHECK
========================================================= */

async function checkWorker() {

  try {

    const response =
      await fetch(
        API_URL,
        {
          method: "GET"
        }
      );

    if (!response.ok) {
      throw new Error("Worker offline");
    }

    const data =
      await response.json();

    console.log(
      "LOGIC-LEAF Worker:",
      data
    );

  } catch (error) {

    console.warn(
      "Worker health check failed:",
      error
    );

  }

}

/* =========================================================
   INITIALIZE
========================================================= */

renderChatHistory();

if (Object.keys(chats).length) {

  currentChatId =
    Object.keys(chats)[0];

  renderMessages();

} else {

  createNewChat();

}

updateUserUI();

checkWorker();

console.log(
  "%cLOGIC-LEAF%c online",
  "font-weight:800",
  "font-weight:400"
);
