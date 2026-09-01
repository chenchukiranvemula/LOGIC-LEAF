// ============================================================
// LOGIC-LEAF APP
// Firebase: logic-leaf-64d0d
// Worker: logic-leaf.qtmkiller6.workers.dev
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

const API_URL =
"https://logic-leaf.qtmkiller6.workers.dev";


const firebaseConfig = {

  apiKey:
  "AIzaSyB5bg4U8aMJlAhbWgU0sL37BN4JTTRpmMw",

  authDomain:
  "logic-leaf-64d0d.firebaseapp.com",

  projectId:
  "logic-leaf-64d0d",

  storageBucket:
  "logic-leaf-64d0d.firebasestorage.app",

  messagingSenderId:
  "346443954182",

  appId:
  "1:346443954182:web:2ab5bb71b5e52206e62b87",

  measurementId:
  "G-ZVVBH04E9M"

};


// ============================================================
// FIREBASE
// ============================================================

const firebaseApp =
initializeApp(firebaseConfig);

const auth =
getAuth(firebaseApp);

const googleProvider =
new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account"
});


// ============================================================
// DOM
// ============================================================

const $ = id =>
document.getElementById(id);


const loginScreen =
$("loginScreen");

const appScreen =
$("appScreen");

const googleLoginBtn =
$("googleLoginBtn");

const loginError =
$("loginError");

const messages =
$("messages");

const welcomeView =
$("welcomeView");

const messageInput =
$("messageInput");

const sendBtn =
$("sendBtn");

const sidebar =
$("sidebar");

const chatHistory =
$("chatHistory");


// ============================================================
// STATE
// ============================================================

let currentUser = null;

let currentChatId = null;

let recognition = null;

let selectedImage = null;

let selectedFile = null;


const STORAGE_KEY =
"logic_leaf_chats_v2";


// ============================================================
// CHAT STORAGE
// ============================================================

function getChats() {

  try {

    return JSON.parse(
      localStorage.getItem(
        STORAGE_KEY
      )
    ) || [];

  } catch {

    return [];

  }

}


function saveChats(chats) {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(chats)
  );

}


// ============================================================
// CREATE CHAT
// ============================================================

function createChat() {

  const chat = {

    id:
    "chat_" +
    Date.now(),

    title:
    "New chat",

    messages:
    [],

    createdAt:
    Date.now()

  };


  const chats =
  getChats();


  chats.unshift(chat);


  saveChats(chats);


  currentChatId =
  chat.id;


  renderHistory();

  renderCurrentChat();


  return chat;

}


// ============================================================
// CURRENT CHAT
// ============================================================

function currentChat() {

  return getChats().find(
    chat =>
    chat.id === currentChatId
  );

}


// ============================================================
// HISTORY
// ============================================================

function renderHistory() {

  if (!chatHistory)
    return;


  chatHistory.innerHTML =
  "";


  const chats =
  getChats();


  if (!chats.length) {

    chatHistory.innerHTML =
    `<div class="empty-state">
      No chats yet.
    </div>`;

    return;

  }


  chats.forEach(chat => {

    const button =
    document.createElement("button");


    button.className =
    "history-item";


    if (
      chat.id ===
      currentChatId
    ) {

      button.classList.add(
        "active"
      );

    }


    button.textContent =
    chat.title ||
    "New chat";


    button.onclick = () => {

      currentChatId =
      chat.id;

      renderHistory();

      renderCurrentChat();

      sidebar?.classList.remove(
        "open"
      );

    };


    chatHistory.appendChild(
      button
    );

  });

}


// ============================================================
// RENDER CHAT
// ============================================================

function renderCurrentChat() {

  if (!messages)
    return;


  messages.innerHTML =
  "";


  const chat =
  currentChat();


  if (
    !chat ||
    !chat.messages.length
  ) {

    welcomeView?.classList.remove(
      "hidden"
    );

    return;

  }


  welcomeView?.classList.add(
    "hidden"
  );


  chat.messages.forEach(
    message => {

      addMessage(
        message.role,
        message.content,
        false
      );

    }
  );

}


// ============================================================
// ADD MESSAGE
// ============================================================

function addMessage(
  role,
  content,
  scroll = true
) {

  welcomeView?.classList.add(
    "hidden"
  );


  const wrapper =
  document.createElement(
    "div"
  );


  wrapper.className =
  `message ${role === "user" ? "user" : "ai"}`;


  const box =
  document.createElement(
    "div"
  );


  box.className =
  "message-content";


  const label =
  document.createElement(
    "div"
  );


  label.className =
  "message-role";


  label.textContent =
  role === "user"
  ? "YOU"
  : "LOGIC-LEAF";


  const text =
  document.createElement(
    "div"
  );


  text.className =
  "message-text";


  text.textContent =
  content;


  box.appendChild(label);

  box.appendChild(text);

  wrapper.appendChild(box);

  messages.appendChild(wrapper);


  if (scroll) {

    messages.scrollTop =
    messages.scrollHeight;

  }

}


// ============================================================
// GOOGLE LOGIN
// ============================================================

googleLoginBtn?.addEventListener(
  "click",
  async () => {

    loginError.textContent =
    "";

    googleLoginBtn.disabled =
    true;


    try {

      const result =
      await signInWithPopup(
        auth,
        googleProvider
      );


      console.log(
        "Google login:",
        result.user.email
      );


    } catch (error) {

      console.error(
        error
      );


      loginError.textContent =
      firebaseError(error);


    } finally {

      googleLoginBtn.disabled =
      false;

    }

  }
);


// ============================================================
// FIREBASE ERRORS
// ============================================================

function firebaseError(error) {

  const code =
  error?.code || "";


  if (
    code ===
    "auth/api-key-not-valid"
  ) {

    return (
      "Firebase API key is not valid. " +
      "Check the API key in Firebase Project Settings."
    );

  }


  if (
    code ===
    "auth/unauthorized-domain"
  ) {

    return (
      "Unauthorized domain. Add " +
      "chenchukiranvemula.github.io " +
      "to Firebase Authentication → Authorized domains."
    );

  }


  if (
    code ===
    "auth/popup-blocked"
  ) {

    return "Google Login popup was blocked.";

  }


  if (
    code ===
    "auth/popup-closed-by-user"
  ) {

    return "Google Login was cancelled.";

  }


  return (
    code +
    (
      error?.message
      ? " — " + error.message
      : ""
    )
  );

}


// ============================================================
// AUTH STATE
// ============================================================

onAuthStateChanged(
  auth,
  user => {

    currentUser =
    user;


    if (user) {

      loginScreen?.classList.add(
        "hidden"
      );

      appScreen?.classList.remove(
        "hidden"
      );


      updateUser(
        user
      );


      const chats =
      getChats();


      if (!currentChatId) {

        if (chats.length) {

          currentChatId =
          chats[0].id;

        } else {

          createChat();

        }

      }


      renderHistory();

      renderCurrentChat();

    } else {

      loginScreen?.classList.remove(
        "hidden"
      );

      appScreen?.classList.add(
        "hidden"
      );

    }

  }
);


// ============================================================
// USER UI
// ============================================================

function updateUser(user) {

  const name =
  user.displayName ||
  "User";

  const email =
  user.email ||
  "";

  const photo =
  user.photoURL ||
  "";


  if ($("userName"))
    $("userName").textContent =
    name;


  if ($("userEmail"))
    $("userEmail").textContent =
    email;


  if ($("settingsName"))
    $("settingsName").textContent =
    name;


  if ($("settingsEmail"))
    $("settingsEmail").textContent =
    email;


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


function setAvatar(
  element,
  photo,
  name
) {

  if (!element)
    return;


  element.innerHTML =
  "";


  if (photo) {

    const image =
    document.createElement(
      "img"
    );

    image.src =
    photo;

    image.alt =
    "";

    element.appendChild(
      image
    );

  } else {

    element.textContent =
    name
    .charAt(0)
    .toUpperCase();

  }

}


// ============================================================
// LOGOUT
// ============================================================

$("logoutBtn")?.addEventListener(
  "click",
  async () => {

    await signOut(auth);

  }
);


// ============================================================
// SIDEBAR
// ============================================================

$("openSidebarBtn")?.addEventListener(
  "click",
  () => {

    sidebar?.classList.add(
      "open"
    );

  }
);


$("closeSidebarBtn")?.addEventListener(
  "click",
  () => {

    sidebar?.classList.remove(
      "open"
    );

  }
);


// ============================================================
// NEW CHAT
// ============================================================

$("newChatBtn")?.addEventListener(
  "click",
  () => {

    createChat();

    messageInput?.focus();

  }
);


// ============================================================
// SETTINGS
// ============================================================

$("settingsBtn")?.addEventListener(
  "click",
  () => {

    $("settingsOverlay")
    ?.classList.remove(
      "hidden"
    );

  }
);


$("profileBtn")?.addEventListener(
  "click",
  () => {

    $("settingsOverlay")
    ?.classList.remove(
      "hidden"
    );

  }
);


$("closeSettingsBtn")?.addEventListener(
  "click",
  () => {

    $("settingsOverlay")
    ?.classList.add(
      "hidden"
    );

  }
);


// ============================================================
// API KEYS
// ============================================================

$("apiKeysBtn")?.addEventListener(
  "click",
  () => {

    $("apiOverlay")
    ?.classList.remove(
      "hidden"
    );

    loadApiKeys();

  }
);


$("closeApiBtn")?.addEventListener(
  "click",
  () => {

    $("apiOverlay")
    ?.classList.add(
      "hidden"
    );

  }
);


// ============================================================
// WORKER REQUEST
// ============================================================

async function workerRequest(
  path,
  options = {}
) {

  if (!currentUser) {

    throw new Error(
      "Please sign in with Google first."
    );

  }


  const token =
  await currentUser.getIdToken(
    true
  );


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

    data =
    JSON.parse(text);

  } catch {

    data = {
      error: text
    };

  }


  if (!response.ok) {

    throw new Error(
      data?.error ||
      data?.message ||
      `Request failed: ${response.status}`
    );

  }


  return data;

}


// ============================================================
// SEND MESSAGE
// ============================================================

async function sendMessage() {

  const text =
  messageInput?.value.trim();


  if (!text)
    return;


  if (!currentUser) {

    alert(
      "Please sign in with Google."
    );

    return;

  }


  if (!currentChatId) {

    createChat();

  }


  const chat =
  currentChat();


  if (!chat)
    return;


  chat.messages.push({

    role:
    "user",

    content:
    text

  });


  if (
    chat.title ===
    "New chat"
  ) {

    chat.title =
    text.length > 45
    ? text.slice(0, 45) + "…"
    : text;

  }


  saveChats(
    getChats()
  );


  addMessage(
    "user",
    text
  );


  messageInput.value =
  "";


  sendBtn.disabled =
  true;


  const loading =
  document.createElement(
    "div"
  );


  loading.className =
  "message ai";


  loading.innerHTML = `
    <div class="message-content">
      <div class="message-role">
        LOGIC-LEAF
      </div>
      <div class="message-text">
        Thinking…
      </div>
    </div>
  `;


  messages.appendChild(
    loading
  );


  messages.scrollTop =
  messages.scrollHeight;


  try {

    const data =
    await workerRequest(
      "/v1/chat",
      {

        method:
        "POST",

        body:
        JSON.stringify({

          messages:
          chat.messages.map(
            item => ({

              role:
              item.role,

              content:
              item.content

            })
          )

        })

      }
    );


    loading.remove();


    const answer =
    data.response ||
    data.text ||
    data.output ||
    data.content ||
    data.message?.content ||
    data.result?.response ||
    "The AI returned no response.";


    chat.messages.push({

      role:
      "assistant",

      content:
      answer

    });


    saveChats(
      getChats()
    );


    addMessage(
      "assistant",
      answer
    );


    renderHistory();


  } catch (error) {

    loading.remove();


    const answer =
    "Sorry, something went wrong.\n\n" +
    error.message;


    chat.messages.push({

      role:
      "assistant",

      content:
      answer

    });


    saveChats(
      getChats()
    );


    addMessage(
      "assistant",
      answer
    );

  } finally {

    sendBtn.disabled =
    false;

    messageInput?.focus();

  }

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


// ============================================================
// INPUT RESIZE
// ============================================================

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
// QUICK PROMPTS
// ============================================================

document
.querySelectorAll(".quick-card")
.forEach(card => {

  card.addEventListener(
    "click",
    () => {

      messageInput.value =
      card.dataset.prompt ||
      "";

      messageInput.focus();

    }
  );

});


// ============================================================
// FILE
// ============================================================

$("attachBtn")?.addEventListener(
  "click",
  () => {

    $("fileInput")?.click();

  }
);


$("fileInput")?.addEventListener(
  "change",
  event => {

    selectedFile =
    event.target.files?.[0];


    if (!selectedFile)
      return;


    showAttachment(
      selectedFile.name
    );

  }
);


// ============================================================
// IMAGE
// ============================================================

$("imageBtn")?.addEventListener(
  "click",
  () => {

    $("imageInput")?.click();

  }
);


$("imageInput")?.addEventListener(
  "change",
  event => {

    selectedImage =
    event.target.files?.[0];


    if (!selectedImage)
      return;


    const url =
    URL.createObjectURL(
      selectedImage
    );


    $("imagePreview").src =
    url;


    $("imagePreviewOverlay")
    ?.classList.remove(
      "hidden"
    );

  }
);


$("closeImagePreviewBtn")
?.addEventListener(
  "click",
  () => {

    $("imagePreviewOverlay")
    ?.classList.add(
      "hidden"
    );

  }
);


$("useImageBtn")
?.addEventListener(
  "click",
  () => {

    if (!selectedImage)
      return;


    showAttachment(
      selectedImage.name
    );


    $("imagePreviewOverlay")
    ?.classList.add(
      "hidden"
    );

  }
);


function showAttachment(name) {

  $("attachmentPreview").innerHTML =
  `<div class="attachment-chip">
    Attached: ${escapeHTML(name)}
  </div>`;

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


  recognition.lang =
  "en-IN";


  recognition.continuous =
  false;


  recognition.interimResults =
  false;


  recognition.onstart =
  () => {

    $("voiceBtn")
    ?.classList.add(
      "recording"
    );

  };


  recognition.onend =
  () => {

    $("voiceBtn")
    ?.classList.remove(
      "recording"
    );

  };


  recognition.onresult =
  event => {

    const text =
    event.results[0][0]
    .transcript;


    messageInput.value +=
    (
      messageInput.value
      ? " "
      : ""
    ) + text;

  };


  recognition.onerror =
  error => {

    console.error(
      "Voice error:",
      error
    );

  };


  $("voiceBtn")
  ?.addEventListener(
    "click",
    () => {

      try {

        recognition.start();

      } catch {}

    }
  );

}


// ============================================================
// API KEYS
// ============================================================

async function loadApiKeys() {

  const list =
  $("apiKeyList");


  if (!list)
    return;


  list.innerHTML =
  `<div class="empty-state">
    Loading API keys…
  </div>`;


  try {

    const data =
    await workerRequest(
      "/v1/keys",
      {
        method:
        "GET"
      }
    );


    renderApiKeys(
      data.keys ||
      data.data ||
      []
    );


  } catch (error) {

    list.innerHTML =
    `<div class="empty-state">
      ${escapeHTML(error.message)}
    </div>`;

  }

}


function renderApiKeys(keys) {

  const list =
  $("apiKeyList");


  list.innerHTML =
  "";


  if (!keys.length) {

    list.innerHTML =
    `<div class="empty-state">
      No API keys created yet.
    </div>`;

    return;

  }


  keys.forEach(key => {

    const item =
    document.createElement(
      "div"
    );


    item.className =
    "api-key-item";


    item.innerHTML = `
      <div>
        <strong>
          ${escapeHTML(
            key.name ||
            "LOGIC-LEAF API Key"
          )}
        </strong>

        <small>
          ${escapeHTML(
            key.prefix ||
            key.status ||
            "active"
          )}
        </small>
      </div>
    `;


    list.appendChild(
      item
    );

  });

}


// ============================================================
// CREATE API KEY
// ============================================================

$("createApiKeyBtn")
?.addEventListener(
  "click",
  async () => {

    const button =
    $("createApiKeyBtn");


    button.disabled =
    true;


    button.textContent =
    "Creating…";


    try {

      const data =
      await workerRequest(
        "/v1/keys",
        {

          method:
          "POST",

          body:
          JSON.stringify({

            name:
            "LOGIC-LEAF API Key"

          })

        }
      );


      const key =
      data.key ||
      data.api_key ||
      data.apiKey;


      if (!key) {

        throw new Error(
          "Worker did not return an API key."
        );

      }


      $("newApiKey").textContent =
      key;


      $("newKeyBox")
      ?.classList.remove(
        "hidden"
      );


      loadApiKeys();


    } catch (error) {

      alert(
        error.message
      );

    } finally {

      button.disabled =
      false;

      button.textContent =
      "+ Create API key";

    }

  }
);


// ============================================================
// COPY API KEY
// ============================================================

$("copyApiKeyBtn")
?.addEventListener(
  "click",
  async () => {

    const key =
    $("newApiKey")
    ?.textContent;


    if (!key || key === "—")
      return;


    try {

      await navigator.clipboard.writeText(
        key
      );


      $("copyApiKeyBtn").textContent =
      "Copied";


      setTimeout(
        () => {

          $("copyApiKeyBtn").textContent =
          "Copy";

        },
        1500
      );

    } catch {

      alert(
        "Copy failed."
      );

    }

  }
);


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHTML(value) {

  return String(value)

  .replaceAll(
    "&",
    "&amp;"
  )

  .replaceAll(
    "<",
    "&lt;"
  )

  .replaceAll(
    ">",
    "&gt;"
  )

  .replaceAll(
    '"',
    "&quot;"
  )

  .replaceAll(
    "'",
    "&#039;"
  );

}


// ============================================================
// START
// ============================================================

renderHistory();

console.log(
  "LOGIC-LEAF loaded"
);

console.log(
  "Worker:",
  API_URL
);

console.log(
  "Firebase project:",
  firebaseConfig.projectId
);
