// ============================================================
// LOGIC-LEAF
// Firebase + Cloudflare Worker
// ============================================================

import { initializeApp }
from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


// ============================================================
// CONFIGURATION
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
// ELEMENT HELPER
// ============================================================

const $ = id =>
  document.getElementById(id);


// ============================================================
// STATE
// ============================================================

let currentUser = null;

let currentChatId = null;

let selectedFile = null;

let selectedImage = null;

let recognition = null;


const STORAGE_KEY =
  "logic_leaf_chats_v3";


// ============================================================
// CHAT STORAGE
// ============================================================

function getChats() {

  try {

    return JSON.parse(
      localStorage.getItem(STORAGE_KEY)
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
      "chat_" + Date.now(),

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

  renderChat();

  return chat;
}


// ============================================================
// CURRENT CHAT
// ============================================================

function getCurrentChat() {

  return getChats().find(
    chat =>
      chat.id === currentChatId
  );

}


// ============================================================
// HISTORY
// ============================================================

function renderHistory() {

  const history =
    $("chatHistory");

  if (!history)
    return;


  history.innerHTML = "";


  const chats =
    getChats();


  if (!chats.length) {

    history.innerHTML =
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
      chat.id === currentChatId
    ) {

      button.classList.add("active");

    }


    button.textContent =
      chat.title || "New chat";


    button.title =
      chat.title || "New chat";


    button.addEventListener(
      "click",
      () => {

        currentChatId =
          chat.id;

        renderHistory();

        renderChat();

        $("sidebar")
          ?.classList.remove("open");

      }
    );


    history.appendChild(button);

  });

}


// ============================================================
// RENDER CHAT
// ============================================================

function renderChat() {

  const messageBox =
    $("messages");

  if (!messageBox)
    return;


  messageBox.innerHTML =
    "";


  const chat =
    getCurrentChat();


  if (
    !chat ||
    !chat.messages.length
  ) {

    $("welcomeView")
      ?.classList.remove("hidden");

    return;

  }


  $("welcomeView")
    ?.classList.add("hidden");


  chat.messages.forEach(
    message => {

      addMessage(
        message.role,
        message.content,
        false
      );

    }
  );


  scrollMessages();

}


// ============================================================
// ADD MESSAGE
// ============================================================

function addMessage(
  role,
  content,
  scroll = true
) {

  $("welcomeView")
    ?.classList.add("hidden");


  const wrapper =
    document.createElement("div");

  wrapper.className =
    role === "user"
      ? "message user"
      : "message ai";


  const contentBox =
    document.createElement("div");

  contentBox.className =
    "message-content";


  const roleLabel =
    document.createElement("div");

  roleLabel.className =
    "message-role";

  roleLabel.textContent =
    role === "user"
      ? "YOU"
      : "LOGIC-LEAF";


  const text =
    document.createElement("div");

  text.className =
    "message-text";

  text.textContent =
    content;


  contentBox.appendChild(
    roleLabel
  );

  contentBox.appendChild(
    text
  );

  wrapper.appendChild(
    contentBox
  );

  $("messages")
    ?.appendChild(wrapper);


  if (scroll)
    scrollMessages();

}


// ============================================================
// SCROLL
// ============================================================

function scrollMessages() {

  const area =
    $("chatArea");

  if (!area)
    return;


  requestAnimationFrame(
    () => {

      area.scrollTop =
        area.scrollHeight;

    }
  );

}


// ============================================================
// GOOGLE LOGIN
// ============================================================

$("googleLoginBtn")
  ?.addEventListener(
    "click",
    async () => {

      const button =
        $("googleLoginBtn");

      const error =
        $("loginError");


      error.textContent =
        "";

      button.disabled =
        true;


      try {

        await signInWithPopup(
          auth,
          googleProvider
        );

      } catch (err) {

        console.error(err);

        error.textContent =
          firebaseErrorMessage(err);

      } finally {

        button.disabled =
          false;

      }

    }
  );


// ============================================================
// FIREBASE ERROR
// ============================================================

function firebaseErrorMessage(error) {

  const code =
    error?.code || "";


  switch (code) {

    case "auth/api-key-not-valid":

      return "Firebase API key is invalid. Check Firebase Project Settings.";

    case "auth/unauthorized-domain":

      return "Add chenchukiranvemula.github.io to Firebase Authorized domains.";

    case "auth/popup-blocked":

      return "Google popup was blocked by the browser.";

    case "auth/popup-closed-by-user":

      return "Google sign-in was cancelled.";

    case "auth/network-request-failed":

      return "Network error. Check your internet connection.";

    default:

      return (
        error?.message ||
        "Google sign-in failed."
      );

  }

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

      $("loginScreen")
        ?.classList.add("hidden");

      $("appScreen")
        ?.classList.remove("hidden");


      updateUserUI(user);


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

      renderChat();

    } else {

      $("loginScreen")
        ?.classList.remove("hidden");

      $("appScreen")
        ?.classList.add("hidden");

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


  $("userName").textContent =
    name;

  $("userEmail").textContent =
    email;

  $("settingsName").textContent =
    name;

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

    const img =
      document.createElement("img");

    img.src =
      photo;

    img.alt =
      "";

    element.appendChild(img);

  } else {

    element.textContent =
      name.charAt(0).toUpperCase();

  }

}


// ============================================================
// LOGOUT
// ============================================================

$("logoutBtn")
  ?.addEventListener(
    "click",
    async () => {

      try {

        await signOut(auth);

      } catch (error) {

        console.error(error);

      }

    }
  );


// ============================================================
// SIDEBAR
// ============================================================

$("openSidebarBtn")
  ?.addEventListener(
    "click",
    () => {

      $("sidebar")
        ?.classList.add("open");

    }
  );


$("closeSidebarBtn")
  ?.addEventListener(
    "click",
    () => {

      $("sidebar")
        ?.classList.remove("open");

    }
  );


// ============================================================
// NEW CHAT
// ============================================================

$("newChatBtn")
  ?.addEventListener(
    "click",
    () => {

      createChat();

      $("messageInput")
        ?.focus();

    }
  );


// ============================================================
// SETTINGS
// ============================================================

$("settingsBtn")
  ?.addEventListener(
    "click",
    () => {

      $("settingsOverlay")
        ?.classList.remove("hidden");

    }
  );


$("profileBtn")
  ?.addEventListener(
    "click",
    () => {

      $("settingsOverlay")
        ?.classList.remove("hidden");

    }
  );


$("closeSettingsBtn")
  ?.addEventListener(
    "click",
    () => {

      $("settingsOverlay")
        ?.classList.add("hidden");

    }
  );


// ============================================================
// API MODAL
// ============================================================

$("apiKeysBtn")
  ?.addEventListener(
    "click",
    () => {

      $("apiOverlay")
        ?.classList.remove("hidden");

      loadApiKeys();

    }
  );


$("closeApiBtn")
  ?.addEventListener(
    "click",
    () => {

      $("apiOverlay")
        ?.classList.add("hidden");

    }
  );


// ============================================================
// WORKER REQUEST
// ============================================================

async function workerRequest(
  endpoint,
  options = {}
) {

  if (!currentUser) {

    throw new Error(
      "Please sign in with Google."
    );

  }


  const token =
    await currentUser.getIdToken(true);


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
      API_URL + endpoint,
      {
        ...options,
        headers
      }
    );


  const raw =
    await response.text();


  let data;


  try {

    data =
      JSON.parse(raw);

  } catch {

    data = {
      raw
    };

  }


  if (!response.ok) {

    throw new Error(
      data?.error ||
      data?.message ||
      data?.raw ||
      `HTTP ${response.status}`
    );

  }


  return data;

}


// ============================================================
// SEND MESSAGE
// ============================================================

async function sendMessage() {

  const input =
    $("messageInput");

  const text =
    input.value.trim();


  if (!text)
    return;


  if (!currentUser) {

    alert(
      "Please sign in with Google first."
    );

    return;

  }


  if (!currentChatId) {

    createChat();

  }


  const chat =
    getCurrentChat();


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
      text.length > 42
        ? text.substring(0, 42) + "..."
        : text;

  }


  saveChats(
    getChats()
  );


  renderHistory();


  addMessage(
    "user",
    text
  );


  input.value =
    "";

  input.style.height =
    "auto";


  const sendButton =
    $("sendBtn");

  sendButton.disabled =
    true;


  const loading =
    document.createElement("div");

  loading.className =
    "message ai";


  loading.innerHTML = `
    <div class="message-content">
      <div class="message-role">LOGIC-LEAF</div>
      <div class="message-text">Thinking…</div>
    </div>
  `;


  $("messages")
    .appendChild(loading);


  scrollMessages();


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
      extractAnswer(data);


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


  } catch (error) {

    loading.remove();


    const errorText =
      "Sorry, something went wrong.\n\n" +
      error.message;


    chat.messages.push({

      role:
        "assistant",

      content:
        errorText

    });


    saveChats(
      getChats()
    );


    addMessage(
      "assistant",
      errorText
    );

  } finally {

    sendButton.disabled =
      false;

    input.focus();

  }

}


// ============================================================
// EXTRACT AI RESPONSE
// ============================================================

function extractAnswer(data) {

  if (!data)
    return "The AI returned an empty response.";


  if (typeof data === "string")
    return data;


  return (
    data.response ||
    data.text ||
    data.output ||
    data.content ||
    data.result?.response ||
    data.result?.text ||
    data.message?.content ||
    data.choices?.[0]?.message?.content ||
    "The AI returned no response."
  );

}


// ============================================================
// SEND EVENTS
// ============================================================

$("sendBtn")
  ?.addEventListener(
    "click",
    sendMessage
  );


$("messageInput")
  ?.addEventListener(
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
// TEXTAREA AUTO SIZE
// ============================================================

$("messageInput")
  ?.addEventListener(
    "input",
    event => {

      const input =
        event.target;

      input.style.height =
        "auto";

      input.style.height =
        Math.min(
          input.scrollHeight,
          150
        ) + "px";

    }
  );


// ============================================================
// QUICK CARDS
// ============================================================

document
  .querySelectorAll(".quick-card")
  .forEach(card => {

    card.addEventListener(
      "click",
      () => {

        const input =
          $("messageInput");

        input.value =
          card.dataset.prompt || "";

        input.focus();

      }
    );

  });


// ============================================================
// FILE PICKER
// ============================================================

$("attachBtn")
  ?.addEventListener(
    "click",
    () => {

      $("fileInput")
        ?.click();

    }
  );


$("fileInput")
  ?.addEventListener(
    "change",
    event => {

      const file =
        event.target.files?.[0];


      if (!file)
        return;


      selectedFile =
        file;

      selectedImage =
        null;


      showAttachment(
        file.name
      );

    }
  );


// ============================================================
// IMAGE PICKER
// ============================================================

$("imageBtn")
  ?.addEventListener(
    "click",
    () => {

      $("imageInput")
        ?.click();

    }
  );


$("imageInput")
  ?.addEventListener(
    "change",
    event => {

      const file =
        event.target.files?.[0];


      if (!file)
        return;


      selectedImage =
        file;

      selectedFile =
        null;


      const url =
        URL.createObjectURL(file);


      $("imagePreview").src =
        url;


      $("imageOverlay")
        ?.classList.remove("hidden");

    }
  );


// ============================================================
// IMAGE PREVIEW
// ============================================================

$("closeImageBtn")
  ?.addEventListener(
    "click",
    () => {

      $("imageOverlay")
        ?.classList.add("hidden");

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


      $("imageOverlay")
        ?.classList.add("hidden");

    }
  );


// ============================================================
// ATTACHMENT
// ============================================================

function showAttachment(name) {

  $("attachmentInfo").textContent =
    "Attached: " + name;

  $("attachmentBar")
    ?.classList.remove("hidden");

}


$("removeAttachmentBtn")
  ?.addEventListener(
    "click",
    () => {

      selectedFile =
        null;

      selectedImage =
        null;


      $("fileInput").value =
        "";

      $("imageInput").value =
        "";


      $("attachmentBar")
        ?.classList.add("hidden");

    }
  );


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
        ?.classList.add("recording");

    };


  recognition.onend =
    () => {

      $("voiceBtn")
        ?.classList.remove("recording");

    };


  recognition.onresult =
    event => {

      const text =
        event.results[0][0]
          .transcript;


      const input =
        $("messageInput");


      input.value +=
        (
          input.value
            ? " "
            : ""
        ) + text;


      input.dispatchEvent(
        new Event("input")
      );

    };


  recognition.onerror =
    error => {

      console.error(
        "Speech recognition:",
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

} else {

  $("voiceBtn")
    ?.addEventListener(
      "click",
      () => {

        alert(
          "Voice input is not supported by this browser."
        );

      }
    );

}


// ============================================================
// API KEYS
// ============================================================

async function loadApiKeys() {

  const list =
    $("apiKeyList");


  list.innerHTML =
    `<div class="empty-state">
      Loading...
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
        No API keys yet.
      </div>`;

    return;

  }


  keys.forEach(key => {

    const item =
      document.createElement("div");


    item.className =
      "api-key-item";


    const left =
      document.createElement("div");


    const name =
      document.createElement("strong");

    name.textContent =
      key.name ||
      "LOGIC-LEAF API Key";


    const status =
      document.createElement("small");

    status.textContent =
      key.prefix ||
      key.status ||
      "active";


    left.appendChild(name);

    left.appendChild(status);

    item.appendChild(left);

    list.appendChild(item);

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
        "Creating...";


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
          data.apiKey ||
          data.api_key;


        if (!key) {

          throw new Error(
            "Worker did not return an API key."
          );

        }


        $("newApiKey").textContent =
          key;


        $("newKeyBox")
          ?.classList.remove("hidden");


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


      if (
        !key ||
        key === "—"
      )
        return;


      try {

        await navigator.clipboard
          .writeText(key);


        const button =
          $("copyApiKeyBtn");


        button.textContent =
          "Copied";


        setTimeout(
          () => {

            button.textContent =
              "Copy";

          },
          1500
        );


      } catch {

        alert(
          "Could not copy the API key."
        );

      }

    }
  );


// ============================================================
// ESCAPE HTML
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
// STARTUP
// ============================================================

console.log(
  "LOGIC-LEAF frontend loaded."
);

console.log(
  "Firebase project:",
  firebaseConfig.projectId
);

console.log(
  "Worker:",
  API_URL
);

renderHistory();
