/* =========================================================
   LOGIC-LEAF
   Firebase Google Login
   ChatGPT-style frontend
   Cloudflare Worker connection
========================================================= */

import { initializeApp }
  from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

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


const API_URL =
  "https://ck.qtmkiller6.workers.dev";


/* =========================================================
   FIREBASE
========================================================= */

const firebaseApp =
  initializeApp(firebaseConfig);

const auth =
  getAuth(firebaseApp);

const googleProvider =
  new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account"
});


/* =========================================================
   STATE
========================================================= */

let currentUser = null;

let currentChatId = null;

let isGenerating = false;

let chats =
  JSON.parse(
    localStorage.getItem("logic_leaf_chats") || "{}"
  );


/* =========================================================
   DOM
========================================================= */

const $ = selector =>
  document.querySelector(selector);

const $$ = selector =>
  [...document.querySelectorAll(selector)];


const sidebar =
  $("#sidebar");

const menuBtn =
  $("#menuBtn");

const closeSidebar =
  $("#closeSidebar");

const newChatBtn =
  $("#newChatBtn");

const messages =
  $("#messages");

const welcomeScreen =
  $("#welcomeScreen");

const chatInput =
  $("#chatInput");

const sendBtn =
  $("#sendBtn");

const historyList =
  $("#historyList");

const searchChats =
  $("#searchChats");

const attachBtn =
  $("#attachBtn");

const attachmentMenu =
  $("#attachmentMenu");

const fileInput =
  $("#fileInput");

const imageInput =
  $("#imageInput");

const modelBtn =
  $("#modelBtn");

const modelMenu =
  $("#modelMenu");

const loginModal =
  $("#loginModal");

const loginBtn =
  $("#loginBtn");

const googleLoginBtn =
  $("#googleLoginBtn");

const logoutBtn =
  $("#logoutBtn");

const settingsModal =
  $("#settingsModal");

const toast =
  $("#toast");

const workerStatus =
  $("#workerStatus");


/* =========================================================
   HELPERS
========================================================= */

function show(element) {

  if (element)
    element.classList.remove("hidden");

}


function hide(element) {

  if (element)
    element.classList.add("hidden");

}


function escapeHTML(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function showToast(message) {

  if (!toast)
    return;

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer =
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2400);

}


function saveChats() {

  localStorage.setItem(
    "logic_leaf_chats",
    JSON.stringify(chats)
  );

}


/* =========================================================
   SIDEBAR
========================================================= */

menuBtn?.addEventListener(
  "click",
  () => {

    sidebar?.classList.add("open");

  }
);


closeSidebar?.addEventListener(
  "click",
  () => {

    sidebar?.classList.remove("open");

  }
);


/* =========================================================
   NEW CHAT
========================================================= */

function createNewChat() {

  const id =
    "chat_" +
    Date.now();

  currentChatId = id;

  chats[id] = {

    id,

    title:
      "New chat",

    messages: []

  };

  saveChats();

  renderHistory();

  renderMessages();

  chatInput.value = "";

  chatInput.focus();

  sidebar?.classList.remove("open");

}


newChatBtn?.addEventListener(
  "click",
  createNewChat
);


/* =========================================================
   HISTORY
========================================================= */

function renderHistory(filter = "") {

  if (!historyList)
    return;

  historyList.innerHTML = "";

  const list =
    Object.values(chats)
      .sort(
        (a, b) =>
          b.id.localeCompare(a.id)
      )
      .filter(chat =>
        (chat.title || "New chat")
          .toLowerCase()
          .includes(filter.toLowerCase())
      );


  if (!list.length) {

    const empty =
      document.createElement("div");

    empty.className =
      "history-empty";

    empty.style.cssText =
      "padding:12px;color:#666;font-size:11px;";

    empty.textContent =
      "No conversations";

    historyList.appendChild(empty);

    return;

  }


  list.forEach(chat => {

    const button =
      document.createElement("button");

    button.className =
      "history-item" +
      (
        chat.id === currentChatId
          ? " active"
          : ""
      );


    const icon =
      document.createElement("span");

    icon.textContent = "◌";


    const title =
      document.createElement("span");

    title.className =
      "history-item-title";

    title.textContent =
      chat.title || "New chat";


    button.appendChild(icon);
    button.appendChild(title);


    button.addEventListener(
      "click",
      () => {

        currentChatId =
          chat.id;

        renderHistory();

        renderMessages();

        sidebar?.classList.remove("open");

      }
    );


    historyList.appendChild(button);

  });

}


searchChats?.addEventListener(
  "input",
  () => {

    renderHistory(
      searchChats.value
    );

  }
);


/* =========================================================
   RENDER MESSAGES
========================================================= */

function renderMessages() {

  if (!messages)
    return;

  messages.innerHTML = "";

  const chat =
    chats[currentChatId];


  if (
    !chat ||
    !chat.messages ||
    !chat.messages.length
  ) {

    show(welcomeScreen);

    return;

  }


  hide(welcomeScreen);


  chat.messages.forEach(message => {

    addMessage(
      message.role,
      message.content,
      false
    );

  });


  scrollBottom();

}


/* =========================================================
   ADD MESSAGE
========================================================= */

function addMessage(
  role,
  content,
  animate = true
) {

  const wrapper =
    document.createElement("div");

  wrapper.className =
    `message ${role}`;


  if (!animate)
    wrapper.style.animation = "none";


  const box =
    document.createElement("div");

  box.className =
    "message-content";


  if (role === "ai") {

    box.innerHTML = `

      <div class="message-role">

        <span class="message-role-dot"></span>

        LOGIC-LEAF

      </div>

      <div class="message-text">

        ${formatAI(content)}

      </div>

      <div class="message-actions">

        <button data-copy>
          Copy
        </button>

        <button data-speak>
          Read aloud
        </button>

      </div>

    `;

  } else {

    box.innerHTML = `

      <div class="message-text">

        ${escapeHTML(content)}

      </div>

    `;

  }


  wrapper.appendChild(box);

  messages.appendChild(wrapper);


  const copy =
    wrapper.querySelector("[data-copy]");

  copy?.addEventListener(
    "click",
    async () => {

      try {

        await navigator.clipboard.writeText(
          content
        );

        showToast("Copied");

      } catch {

        showToast("Copy failed");

      }

    }
  );


  const speak =
    wrapper.querySelector("[data-speak]");

  speak?.addEventListener(
    "click",
    () => {

      if (
        "speechSynthesis"
        in window
      ) {

        speechSynthesis.cancel();

        const utterance =
          new SpeechSynthesisUtterance(
            content
          );

        speechSynthesis.speak(
          utterance
        );

      }

    }
  );

}


/* =========================================================
   AI FORMATTER
========================================================= */

function formatAI(value) {

  let html =
    escapeHTML(value);


  /*
    Temporarily protect code blocks.
  */

  const blocks = [];


  html =
    html.replace(
      /```([\s\S]*?)```/g,
      (_, code) => {

        const index =
          blocks.length;

        blocks.push(
          code.trim()
        );

        return `___CODEBLOCK_${index}___`;

      }
    );


  html =
    html.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );


  html =
    html.replace(
      /`([^`]+)`/g,
      "<code>$1</code>"
    );


  html =
    html.replace(
      /\n/g,
      "<br>"
    );


  blocks.forEach(
    (code, index) => {

      const block = `

        <div class="code-block">

          <div class="code-header">

            <span>Code</span>

            <button
              class="code-copy"
              data-code="${encodeURIComponent(code)}"
            >
              Copy
            </button>

          </div>

          <pre>${escapeHTML(code)}</pre>

        </div>

      `;

      html =
        html.replace(
          `___CODEBLOCK_${index}___`,
          block
        );

    }
  );


  return html;

}


/* =========================================================
   CODE COPY
========================================================= */

document.addEventListener(
  "click",
  async event => {

    const button =
      event.target.closest(
        ".code-copy"
      );

    if (!button)
      return;

    try {

      const code =
        decodeURIComponent(
          button.dataset.code
        );

      await navigator.clipboard.writeText(
        code
      );

      button.textContent =
        "Copied";

      setTimeout(
        () => {
          button.textContent =
            "Copy";
        },
        1200
      );

    } catch {

      showToast("Copy failed");

    }

  }
);


/* =========================================================
   SCROLL
========================================================= */

function scrollBottom() {

  requestAnimationFrame(
    () => {

      if (messages)
        messages.scrollTop =
          messages.scrollHeight;

    }
  );

}


/* =========================================================
   ENSURE CHAT
========================================================= */

function ensureChat() {

  if (
    currentChatId &&
    chats[currentChatId]
  )
    return;


  createNewChat();

}


/* =========================================================
   SEND
========================================================= */

async function sendMessage() {

  if (isGenerating)
    return;


  const prompt =
    chatInput.value.trim();


  if (!prompt)
    return;


  ensureChat();


  isGenerating = true;

  sendBtn.disabled = true;


  hide(welcomeScreen);


  const chat =
    chats[currentChatId];


  chat.messages.push({

    role: "user",

    content: prompt

  });


  if (
    chat.title === "New chat"
  ) {

    chat.title =
      prompt.length > 42
        ? prompt.slice(0, 42) + "…"
        : prompt;

  }


  saveChats();

  renderHistory();


  addMessage(
    "user",
    prompt
  );


  chatInput.value = "";

  resizeInput();

  scrollBottom();


  /* Typing indicator */

  const typing =
    document.createElement("div");

  typing.className =
    "message ai";

  typing.innerHTML = `

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


  messages.appendChild(typing);

  scrollBottom();


  try {

    const history =
      chat.messages
        .slice(-20)
        .map(item => ({
          role: item.role === "ai"
            ? "assistant"
            : "user",
          content: item.content
        }));


    const response =
      await fetch(
        `${API_URL}/v1/chat`,
        {

          method: "POST",

          headers: {

            "Content-Type":
              "application/json"

          },

          body:
            JSON.stringify({

              message: prompt,

              messages: history,

              user:
                currentUser
                  ? {
                      uid:
                        currentUser.uid,

                      email:
                        currentUser.email,

                      name:
                        currentUser.displayName
                    }
                  : null

            })

        }
      );


    typing.remove();


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );

    }


    const data =
      await response.json();


    const answer =
      extractAnswer(data);


    chat.messages.push({

      role: "ai",

      content: answer

    });


    saveChats();


    addMessage(
      "ai",
      answer
    );


    renderHistory();

    scrollBottom();


  } catch (error) {

    console.error(
      "LOGIC-LEAF Worker error:",
      error
    );


    typing.remove();


    const message =
      "I couldn't connect to the LOGIC-LEAF AI service right now. Please check the Worker connection and try again.";


    chat.messages.push({

      role: "ai",

      content: message

    });


    saveChats();


    addMessage(
      "ai",
      message
    );


    showToast(
      "Failed to connect to AI"
    );

  } finally {

    isGenerating = false;

    sendBtn.disabled = false;

    chatInput.focus();

  }

}


/* =========================================================
   EXTRACT RESPONSE
========================================================= */

function extractAnswer(data) {

  if (!data)
    return "The AI returned an empty response.";


  if (typeof data === "string")
    return data;


  if (
    typeof data.response === "string"
  )
    return data.response;


  if (
    typeof data.answer === "string"
  )
    return data.answer;


  if (
    typeof data.text === "string"
  )
    return data.text;


  if (
    data.result &&
    typeof data.result === "string"
  )
    return data.result;


  if (
    data.result?.response
  )
    return data.result.response;


  if (
    data.choices?.[0]?.message?.content
  )
    return data.choices[0].message.content;


  if (
    data.choices?.[0]?.text
  )
    return data.choices[0].text;


  return JSON.stringify(
    data,
    null,
    2
  );

}


/* =========================================================
   SEND BUTTON
========================================================= */

sendBtn?.addEventListener(
  "click",
  sendMessage
);


/* =========================================================
   ENTER
========================================================= */

chatInput?.addEventListener(
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


/* =========================================================
   RESIZE INPUT
========================================================= */

function resizeInput() {

  chatInput.style.height =
    "auto";

  chatInput.style.height =
    Math.min(
      chatInput.scrollHeight,
      170
    ) + "px";

}


chatInput?.addEventListener(
  "input",
  resizeInput
);


/* =========================================================
   SUGGESTIONS
========================================================= */

$$(".suggestion").forEach(
  button => {

    button.addEventListener(
      "click",
      () => {

        chatInput.value =
          button.dataset.prompt || "";

        resizeInput();

        chatInput.focus();

      }
    );

  }
);


/* =========================================================
   ATTACHMENTS
========================================================= */

attachBtn?.addEventListener(
  "click",
  event => {

    event.stopPropagation();

    attachmentMenu.classList.toggle(
      "hidden"
    );

  }
);


document.addEventListener(
  "click",
  event => {

    if (
      attachmentMenu &&
      !attachmentMenu.contains(
        event.target
      ) &&
      event.target !== attachBtn
    ) {

      hide(attachmentMenu);

    }

  }
);


$$("[data-file-upload]")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        fileInput?.click();

        hide(attachmentMenu);

      }
    );

  });


$$("[data-image-upload]")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        imageInput?.click();

        hide(attachmentMenu);

      }
    );

  });


fileInput?.addEventListener(
  "change",
  () => {

    if (!fileInput.files.length)
      return;

    showToast(
      `${fileInput.files.length} file selected`
    );

  }
);


imageInput?.addEventListener(
  "change",
  () => {

    if (!imageInput.files.length)
      return;

    showToast(
      "Image selected"
    );

  }
);


/* =========================================================
   IMAGE GENERATION UI
========================================================= */

$("#generateImageBtn")
  ?.addEventListener(
    "click",
    () => {

      hide(attachmentMenu);

      chatInput.value =
        "Generate an image of ";

      resizeInput();

      chatInput.focus();

      showToast(
        "Describe the image you want"
      );

    }
  );


/* =========================================================
   CAMERA
========================================================= */

$("#cameraBtn")
  ?.addEventListener(
    "click",
    () => {

      hide(attachmentMenu);

      imageInput?.click();

    }
  );


/* =========================================================
   MICROPHONE
========================================================= */

$("#micBtn")
  ?.addEventListener(
    "click",
    startVoiceInput
  );


function startVoiceInput() {

  const Recognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


  if (!Recognition) {

    showToast(
      "Voice input isn't supported by this browser"
    );

    return;

  }


  const recognition =
    new Recognition();

  recognition.lang =
    navigator.language || "en-IN";

  recognition.interimResults =
    false;

  recognition.maxAlternatives =
    1;


  showToast(
    "Listening…"
  );


  recognition.start();


  recognition.onresult =
    event => {

      const transcript =
        event.results[0][0].transcript;

      chatInput.value =
        transcript;

      resizeInput();

      chatInput.focus();

    };


  recognition.onerror =
    () => {

      showToast(
        "Voice input failed"
      );

    };

}


/* =========================================================
   MODEL MENU
========================================================= */

modelBtn?.addEventListener(
  "click",
  event => {

    event.stopPropagation();

    modelMenu.classList.toggle(
      "hidden"
    );

  }
);


$$(".model-option")
  .forEach(option => {

    option.addEventListener(
      "click",
      () => {

        $$(".model-option")
          .forEach(
            item =>
              item.classList.remove(
                "active"
              )
          );

        option.classList.add(
          "active"
        );


        $("#selectedModel")
          .textContent =
          option.dataset.modelName;


        hide(modelMenu);

      }
    );

  });


document.addEventListener(
  "click",
  event => {

    if (
      modelMenu &&
      !modelMenu.contains(
        event.target
      ) &&
      event.target !== modelBtn
    ) {

      hide(modelMenu);

    }

  }
);


/* =========================================================
   LOGIN
========================================================= */

function openLogin() {

  show(loginModal);

}


function closeLogin() {

  hide(loginModal);

}


loginBtn?.addEventListener(
  "click",
  openLogin
);


$$("[data-close-login]")
  .forEach(button => {

    button.addEventListener(
      "click",
      closeLogin
    );

  });


googleLoginBtn?.addEventListener(
  "click",
  async () => {

    try {

      googleLoginBtn.disabled =
        true;

      googleLoginBtn.textContent =
        "Signing in…";


      const result =
        await signInWithPopup(
          auth,
          googleProvider
        );


      currentUser =
        result.user;


      closeLogin();

      updateUserUI();

      showToast(
        `Welcome, ${
          currentUser.displayName ||
          "User"
        }`
      );


    } catch (error) {

      console.error(
        "Google login:",
        error
      );


      let message =
        "Google login failed.";


      if (
        error.code ===
        "auth/popup-closed-by-user"
      ) {

        message =
          "Login window was closed.";

      }


      if (
        error.code ===
        "auth/unauthorized-domain"
      ) {

        message =
          "Add this GitHub Pages domain to Firebase Authorized Domains.";

      }


      if (
        error.code ===
        "auth/api-key-not-valid"
      ) {

        message =
          "Firebase API configuration is invalid.";

      }


      showToast(message);

    } finally {

      googleLoginBtn.disabled =
        false;

      googleLoginBtn.textContent =
        "Continue with Google";

    }

  }
);


/* =========================================================
   AUTH STATE
========================================================= */

onAuthStateChanged(
  auth,
  user => {

    currentUser =
      user || null;

    updateUserUI();

  }
);


/* =========================================================
   USER UI
========================================================= */

function updateUserUI() {

  const names =
    $$("[data-user-name]");

  const emails =
    $$("[data-user-email]");

  const avatars =
    $$("[data-user-avatar]");


  if (!currentUser) {

    names.forEach(
      element =>
        element.textContent =
          "Guest"
    );

    emails.forEach(
      element =>
        element.textContent =
          "Sign in to continue"
    );

    avatars.forEach(
      element =>
        element.textContent =
          "G"
    );

    return;

  }


  names.forEach(
    element =>
      element.textContent =
        currentUser.displayName ||
        "User"
  );


  emails.forEach(
    element =>
      element.textContent =
        currentUser.email ||
        ""
  );


  avatars.forEach(
    element => {

      if (currentUser.photoURL) {

        element.innerHTML =
          `<img src="${
            escapeHTML(
              currentUser.photoURL
            )
          }" alt="User">`;

      } else {

        element.textContent =
          (
            currentUser.displayName ||
            currentUser.email ||
            "U"
          )
          .charAt(0)
          .toUpperCase();

      }

    }
  );

}


/* =========================================================
   LOGOUT
========================================================= */

logoutBtn?.addEventListener(
  "click",
  async () => {

    try {

      await signOut(auth);

      showToast(
        "Signed out"
      );

    } catch {

      showToast(
        "Could not sign out"
      );

    }

  }
);


/* =========================================================
   SETTINGS
========================================================= */

$$("[data-open-settings]")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        show(settingsModal);

      }
    );

  });


$$("[data-close-settings]")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        hide(settingsModal);

      }
    );

  });


$$(".settings-nav-btn")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        $$(".settings-nav-btn")
          .forEach(
            item =>
              item.classList.remove(
                "active"
              )
          );

        $$(".settings-page")
          .forEach(
            page =>
              page.classList.remove(
                "active"
              )
          );


        button.classList.add(
          "active"
        );


        const page =
          document.querySelector(
            `[data-page="${
              button.dataset.target
            }"]`
          );


        page?.classList.add(
          "active"
        );

      }
    );

  });


/* =========================================================
   CLEAR HISTORY
========================================================= */

$("#clearHistoryBtn")
  ?.addEventListener(
    "click",
    () => {

      if (
        !confirm(
          "Clear all local conversations?"
        )
      )
        return;


      chats = {};

      currentChatId =
        null;

      saveChats();

      createNewChat();

      showToast(
        "History cleared"
      );

    }
  );


/* =========================================================
   READ ALOUD TEST
========================================================= */

$("#readAloudBtn")
  ?.addEventListener(
    "click",
    () => {

      if (
        !("speechSynthesis" in window)
      ) {

        showToast(
          "Speech isn't supported"
        );

        return;

      }


      speechSynthesis.cancel();


      const speech =
        new SpeechSynthesisUtterance(
          "LOGIC-LEAF voice is ready."
        );


      speechSynthesis.speak(
        speech
      );

    }
  );


/* =========================================================
   COPY API
========================================================= */

$("#copyApiBtn")
  ?.addEventListener(
    "click",
    async () => {

      try {

        await navigator.clipboard.writeText(
          `${API_URL}/v1/chat`
        );

        showToast(
          "API endpoint copied"
        );

      } catch {

        showToast(
          "Copy failed"
        );

      }

    }
  );


/* =========================================================
   WORKER HEALTH
========================================================= */

async function checkWorker() {

  if (!workerStatus)
    return;


  try {

    const response =
      await fetch(
        API_URL,
        {
          method: "GET"
        }
      );


    if (!response.ok)
      throw new Error(
        "Worker offline"
      );


    const data =
      await response.json();


    workerStatus.textContent =
      data.ai
        ? "Online"
        : "Connected";


    workerStatus.style.background =
      "#202a20";

    workerStatus.style.color =
      "#9fce9f";


    console.log(
      "LOGIC-LEAF Worker:",
      data
    );


  } catch (error) {

    console.warn(
      "Worker health:",
      error
    );


    workerStatus.textContent =
      "Unavailable";


    workerStatus.style.background =
      "#302020";

    workerStatus.style.color =
      "#ffaaaa";

  }

}


/* =========================================================
   INITIALIZE
========================================================= */

renderHistory();


const existingChats =
  Object.keys(chats);


if (existingChats.length) {

  currentChatId =
    existingChats[0];

  renderMessages();

} else {

  createNewChat();

}


updateUserUI();

checkWorker();

chatInput?.focus();


console.log(
  "LOGIC-LEAF frontend initialized"
);
