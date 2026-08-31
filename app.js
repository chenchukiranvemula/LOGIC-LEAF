/* =========================================================
   QTM AI — APP.JS
   Chat + Firebase Google Login + Local History
========================================================= */

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

import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================================
   CONFIGURATION
========================================================= */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC_C_ACJcRupgX9jEUON1FsS58igSA45aw",
  authDomain: "logic-leaf.firebaseapp.com",
  projectId: "logic-leaf",
  storageBucket: "logic-leaf.firebasestorage.app",
  messagingSenderId: "288673697563",
  appId: "1:288673697563:web:c14d08452b01568d1c8dbe",
  measurementId: "G-Z30K3K85LX"
};


/*
   CHANGE ONLY THIS VALUE.

   Example:
   https://qtm-ai.username.workers.dev

   Do NOT add /api/chat here.
*/
const WORKER_URL =
  "YOUR_CLOUDFLARE_WORKER_URL";


/* =========================================================
   FIREBASE
========================================================= */

const firebaseApp =
  initializeApp(FIREBASE_CONFIG);

const auth =
  getAuth(firebaseApp);

const db =
  getFirestore(firebaseApp);

const googleProvider =
  new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account"
});


/* =========================================================
   DOM
========================================================= */

const sidebar =
  document.getElementById("sidebar");

const mobileOverlay =
  document.getElementById("mobileOverlay");

const menuBtn =
  document.getElementById("menuBtn");

const newChatBtn =
  document.getElementById("newChatBtn");

const searchBtn =
  document.getElementById("searchBtn");

const settingsBtn =
  document.getElementById("settingsBtn");

const accountBtn =
  document.getElementById("accountBtn");

const googleBtn =
  document.getElementById("googleBtn");

const signOutBtn =
  document.getElementById("signOutBtn");

const clearLocalBtn =
  document.getElementById("clearLocalBtn");

const chatHistory =
  document.getElementById("chatHistory");

const chatScroll =
  document.getElementById("chatScroll");

const chatContent =
  document.getElementById("chatContent");

const welcome =
  document.getElementById("welcome");

const messages =
  document.getElementById("messages");

const composer =
  document.getElementById("composer");

const chatInput =
  document.getElementById("chatInput");

const sendBtn =
  document.getElementById("sendBtn");

const attachBtn =
  document.getElementById("attachBtn");

const fileInput =
  document.getElementById("fileInput");

const attachmentPreview =
  document.getElementById("attachmentPreview");

const searchModal =
  document.getElementById("searchModal");

const searchInput =
  document.getElementById("searchInput");

const searchResults =
  document.getElementById("searchResults");

const settingsModal =
  document.getElementById("settingsModal");

const accountAvatar =
  document.getElementById("accountAvatar");

const accountName =
  document.getElementById("accountName");

const accountEmail =
  document.getElementById("accountEmail");

const settingsAccountText =
  document.getElementById("settingsAccountText");

const toast =
  document.getElementById("toast");


/* =========================================================
   STATE
========================================================= */

let currentUser = null;

let sending = false;

let unsubscribeChats = null;

let selectedFiles = [];

let localChats =
  loadLocalChats();


/* =========================================================
   INITIAL STATE
========================================================= */

updateSendButton();

renderLocalHistory();


/* =========================================================
   MOBILE SIDEBAR
========================================================= */

function openSidebar() {

  sidebar.classList.add("open");

  mobileOverlay.classList.add("show");
}

function closeSidebar() {

  sidebar.classList.remove("open");

  mobileOverlay.classList.remove("show");
}

menuBtn.addEventListener(
  "click",
  openSidebar
);

mobileOverlay.addEventListener(
  "click",
  closeSidebar
);


/* =========================================================
   MODALS
========================================================= */

function openModal(modal) {

  modal.classList.remove("hidden");
}

function closeModal(modal) {

  modal.classList.add("hidden");
}

document
  .querySelectorAll("[data-close]")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const id =
          button.dataset.close;

        const modal =
          document.getElementById(id);

        if (modal) {
          closeModal(modal);
        }
      }
    );

  });


searchBtn.addEventListener(
  "click",
  () => {

    closeSidebar();

    openModal(searchModal);

    setTimeout(
      () => searchInput.focus(),
      50
    );
  }
);


settingsBtn.addEventListener(
  "click",
  () => {

    closeSidebar();

    updateSettingsAccount();

    openModal(settingsModal);
  }
);


accountBtn.addEventListener(
  "click",
  () => {

    closeSidebar();

    updateSettingsAccount();

    openModal(settingsModal);
  }
);


/* =========================================================
   ESCAPE KEY
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (event.key !== "Escape") {
      return;
    }

    closeModal(searchModal);

    closeModal(settingsModal);

    closeSidebar();
  }
);


/* =========================================================
   GOOGLE LOGIN
========================================================= */

googleBtn.addEventListener(
  "click",
  async () => {

    if (currentUser) {
      showToast("Already signed in.");
      return;
    }

    googleBtn.disabled = true;

    googleBtn.textContent =
      "Signing in...";

    try {

      await signInWithPopup(
        auth,
        googleProvider
      );

      showToast(
        "Google sign-in successful."
      );

      closeModal(settingsModal);

    } catch (error) {

      console.error(
        "Google login error:",
        error
      );

      showToast(
        firebaseAuthError(error)
      );

    } finally {

      googleBtn.disabled = false;

      googleBtn.textContent =
        currentUser
          ? "Signed in"
          : "Continue with Google";
    }
  }
);


/* =========================================================
   SIGN OUT
========================================================= */

signOutBtn.addEventListener(
  "click",
  async () => {

    try {

      await signOut(auth);

      showToast("Signed out.");

    } catch (error) {

      console.error(error);

      showToast(
        "Could not sign out."
      );
    }
  }
);


/* =========================================================
   AUTH STATE
========================================================= */

onAuthStateChanged(
  auth,
  user => {

    currentUser = user;

    updateAccountUI();

    updateSettingsAccount();

    if (unsubscribeChats) {

      unsubscribeChats();

      unsubscribeChats = null;
    }

    if (user) {

      subscribeToCloudChats(user);

    } else {

      renderLocalHistory();
    }
  }
);


/* =========================================================
   ACCOUNT UI
========================================================= */

function updateAccountUI() {

  if (!currentUser) {

    accountName.textContent =
      "Sign in";

    accountEmail.textContent =
      "Google account";

    accountAvatar.textContent =
      "G";

    accountAvatar.innerHTML =
      "G";

    googleBtn.textContent =
      "Continue with Google";

    return;
  }

  const name =
    currentUser.displayName ||
    "Google user";

  const email =
    currentUser.email ||
    "";

  accountName.textContent =
    name;

  accountEmail.textContent =
    email;

  settingsAccountText.textContent =
    email
      ? `Signed in as ${email}`
      : "Google account connected.";

  googleBtn.textContent =
    "Signed in";

  if (currentUser.photoURL) {

    accountAvatar.innerHTML =
      `<img src="${escapeAttribute(
        currentUser.photoURL
      )}" alt="">`;

  } else {

    accountAvatar.textContent =
      getInitial(name);
  }
}


function updateSettingsAccount() {

  if (!currentUser) {

    settingsAccountText.textContent =
      "Not signed in.";

    googleBtn.textContent =
      "Continue with Google";

    return;
  }

  settingsAccountText.textContent =
    currentUser.email
      ? `Signed in as ${currentUser.email}`
      : "Google account connected.";

  googleBtn.textContent =
    "Signed in";
}


/* =========================================================
   NEW CHAT
========================================================= */

newChatBtn.addEventListener(
  "click",
  () => {

    messages.innerHTML = "";

    welcome.style.display = "";

    chatInput.value = "";

    selectedFiles = [];

    renderAttachments();

    updateSendButton();

    chatInput.focus();

    closeSidebar();

    scrollToBottom();
  }
);


/* =========================================================
   QUICK PROMPTS
========================================================= */

document
  .querySelectorAll(".prompt-card")
  .forEach(card => {

    card.addEventListener(
      "click",
      () => {

        const prompt =
          card.dataset.prompt || "";

        chatInput.value =
          prompt;

        autoResize();

        updateSendButton();

        chatInput.focus();
      }
    );
  });


/* =========================================================
   TEXT INPUT
========================================================= */

chatInput.addEventListener(
  "input",
  () => {

    autoResize();

    updateSendButton();
  }
);


chatInput.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      if (!sending) {
        composer.requestSubmit();
      }
    }
  }
);


/* =========================================================
   AUTO RESIZE
========================================================= */

function autoResize() {

  chatInput.style.height =
    "auto";

  chatInput.style.height =
    Math.min(
      chatInput.scrollHeight,
      140
    ) + "px";
}


/* =========================================================
   SEND BUTTON
========================================================= */

function updateSendButton() {

  const hasText =
    chatInput.value.trim().length > 0;

  sendBtn.disabled =
    !hasText ||
    sending;
}


/* =========================================================
   SEND MESSAGE
========================================================= */

composer.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    if (sending) {
      return;
    }

    const message =
      chatInput.value.trim();

    if (!message) {
      return;
    }

    if (
      !WORKER_URL ||
      WORKER_URL.includes(
        "YOUR_CLOUDFLARE_WORKER_URL"
      )
    ) {

      showToast(
        "Add your Cloudflare Worker URL in app.js."
      );

      return;
    }

    sending = true;

    updateSendButton();

    welcome.style.display =
      "none";


    /* User message */

    addMessage(
      "user",
      message
    );


    chatInput.value = "";

    autoResize();

    updateSendButton();

    scrollToBottom();


    /* AI typing */

    const typing =
      addTypingMessage();


    try {

      const answer =
        await askQtmAI(message);


      typing.remove();


      if (!answer) {

        addMessage(
          "error",
          "QTM AI returned an empty response."
        );

        return;
      }


      addMessage(
        "assistant",
        answer
      );


      saveLocalChat(
        message,
        answer
      );


      if (currentUser) {

        await saveCloudChat(
          message,
          answer
        );
      }

    } catch (error) {

      console.error(
        "QTM AI:",
        error
      );

      typing.remove();

      addMessage(
        "error",
        error.message ||
        "QTM AI encountered a server error."
      );

    } finally {

      sending = false;

      updateSendButton();

      scrollToBottom();
    }
  }
);


/* =========================================================
   CLOUDFLARE AI REQUEST
========================================================= */

async function askQtmAI(message) {

  const endpoint =
    WORKER_URL.replace(
      /\/+$/,
      ""
    ) + "/api/chat";


  let response;

  try {

    response =
      await fetch(
        endpoint,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            message
          })
        }
      );

  } catch (error) {

    throw new Error(
      "Could not connect to QTM AI."
    );
  }


  const text =
    await response.text();


  let data;

  try {

    data =
      JSON.parse(text);

  } catch {

    throw new Error(
      `Server returned invalid JSON (${response.status}).`
    );
  }


  if (!response.ok) {

    throw new Error(
      data?.detail ||
      data?.error ||
      `Server error ${response.status}.`
    );
  }


  if (!data.ok) {

    throw new Error(
      data.error ||
      "QTM AI request failed."
    );
  }


  return (
    data.response ||
    data.answer ||
    ""
  );
}


/* =========================================================
   MESSAGE RENDERING
========================================================= */

function addMessage(
  role,
  text
) {

  const wrapper =
    document.createElement("div");

  wrapper.className =
    `message message-${role}`;


  const row =
    document.createElement("div");

  row.className =
    `message-row ${role}`;


  if (role === "assistant") {

    const avatar =
      document.createElement("div");

    avatar.className =
      "message-avatar";

    avatar.textContent =
      "Q";

    row.appendChild(
      avatar
    );
  }


  const body =
    document.createElement("div");

  body.className =
    "message-body";


  if (role === "assistant") {

    body.innerHTML =
      formatAIText(text);

  } else {

    body.textContent =
      text;
  }


  row.appendChild(body);

  wrapper.appendChild(row);

  messages.appendChild(wrapper);

  scrollToBottom();

  return wrapper;
}


/* =========================================================
   TYPING
========================================================= */

function addTypingMessage() {

  const wrapper =
    document.createElement("div");

  wrapper.className =
    "message";


  const row =
    document.createElement("div");

  row.className =
    "message-row";


  const avatar =
    document.createElement("div");

  avatar.className =
    "message-avatar";

  avatar.textContent =
    "Q";


  const body =
    document.createElement("div");

  body.className =
    "message-body";


  const typing =
    document.createElement("div");

  typing.className =
    "typing";

  typing.innerHTML =
    "<span></span><span></span><span></span>";


  body.appendChild(
    typing
  );

  row.appendChild(
    avatar
  );

  row.appendChild(
    body
  );

  wrapper.appendChild(
    row
  );

  messages.appendChild(
    wrapper
  );

  scrollToBottom();

  return wrapper;
}


/* =========================================================
   BASIC AI TEXT FORMATTER
========================================================= */

function formatAIText(text) {

  let safe =
    escapeHTML(text);


  /*
     Convert fenced code blocks.
  */

  safe =
    safe.replace(
      /```([\s\S]*?)```/g,
      "<pre><code>$1</code></pre>"
    );


  /*
     Convert bold.
  */

  safe =
    safe.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );


  /*
     Convert line breaks outside code.
  */

  safe =
    safe.replace(
      /\n/g,
      "<br>"
    );


  return safe;
}


/* =========================================================
   SCROLL
========================================================= */

function scrollToBottom() {

  requestAnimationFrame(
    () => {

      chatScroll.scrollTop =
        chatScroll.scrollHeight;
    }
  );
}


/* =========================================================
   FILE ATTACHMENT UI
========================================================= */

attachBtn.addEventListener(
  "click",
  () => {

    fileInput.click();
  }
);


fileInput.addEventListener(
  "change",
  () => {

    selectedFiles =
      Array.from(
        fileInput.files || []
      );

    renderAttachments();
  }
);


function renderAttachments() {

  attachmentPreview.innerHTML =
    "";

  selectedFiles.forEach(
    file => {

      const chip =
        document.createElement(
          "div"
        );

      chip.className =
        "attachment-chip";

      chip.textContent =
        file.name;

      attachmentPreview.appendChild(
        chip
      );
    }
  );
}


/* =========================================================
   LOCAL CHAT STORAGE
========================================================= */

function loadLocalChats() {

  try {

    const raw =
      localStorage.getItem(
        "qtm_ai_chats"
      );

    return raw
      ? JSON.parse(raw)
      : [];

  } catch {

    return [];
  }
}


function saveLocalChat(
  userMessage,
  aiMessage
) {

  const item = {

    id:
      Date.now(),

    title:
      userMessage.slice(
        0,
        60
      ),

    userMessage,

    aiMessage,

    createdAt:
      Date.now()
  };


  localChats.unshift(
    item
  );


  localChats =
    localChats.slice(
      0,
      50
    );


  try {

    localStorage.setItem(
      "qtm_ai_chats",
      JSON.stringify(
        localChats
      )
    );

  } catch (error) {

    console.warn(
      "Local storage unavailable:",
      error
    );
  }


  renderLocalHistory();
}


/* =========================================================
   LOCAL HISTORY
========================================================= */

function renderLocalHistory() {

  if (
    currentUser
  ) {
    return;
  }


  if (!localChats.length) {

    chatHistory.innerHTML =
      `<div class="history-empty">
        Your conversations will appear here.
      </div>`;

    return;
  }


  chatHistory.innerHTML =
    "";


  localChats.forEach(
    chat => {

      const button =
        document.createElement(
          "button"
        );

      button.className =
        "history-item";

      button.type =
        "button";

      button.textContent =
        chat.title ||
        "New conversation";


      button.addEventListener(
        "click",
        () => {

          loadChat(
            chat
          );

          closeSidebar();
        }
      );


      chatHistory.appendChild(
        button
      );
    }
  );
}


/* =========================================================
   LOAD CHAT
========================================================= */

function loadChat(chat) {

  welcome.style.display =
    "none";

  messages.innerHTML =
    "";


  if (chat.userMessage) {

    addMessage(
      "user",
      chat.userMessage
    );
  }


  if (chat.aiMessage) {

    addMessage(
      "assistant",
      chat.aiMessage
    );
  }


  scrollToBottom();
}


/* =========================================================
   FIRESTORE SAVE
========================================================= */

async function saveCloudChat(
  userMessage,
  aiMessage
) {

  if (!currentUser) {
    return;
  }


  try {

    await addDoc(
      collection(
        db,
        "users",
        currentUser.uid,
        "chats"
      ),
      {
        title:
          userMessage.slice(
            0,
            60
          ),

        userMessage,

        aiMessage,

        createdAt:
          serverTimestamp()
      }
    );

  } catch (error) {

    console.warn(
      "Cloud history save failed:",
      error
    );

    /*
       Chat still works even if
       Firestore isn't configured.
    */
  }
}


/* =========================================================
   FIRESTORE HISTORY
========================================================= */

function subscribeToCloudChats(
  user
) {

  const chatsRef =
    collection(
      db,
      "users",
      user.uid,
      "chats"
    );


  const chatsQuery =
    query(
      chatsRef,
      orderBy(
        "createdAt",
        "desc"
      )
    );


  unsubscribeChats =
    onSnapshot(
      chatsQuery,

      snapshot => {

        if (
          snapshot.empty
        ) {

          chatHistory.innerHTML =
            `<div class="history-empty">
              No cloud conversations yet.
            </div>`;

          return;
        }


        chatHistory.innerHTML =
          "";


        snapshot.docs
          .slice(0, 50)
          .forEach(
            docSnap => {

              const data =
                docSnap.data();


              const button =
                document.createElement(
                  "button"
                );

              button.type =
                "button";

              button.className =
                "history-item";

              button.textContent =
                data.title ||
                "Conversation";


              button.addEventListener(
                "click",
                () => {

                  loadChat(
                    data
                  );

                  closeSidebar();
                }
              );


              chatHistory.appendChild(
                button
              );
            }
          );
      },

      error => {

        console.warn(
          "Firestore history error:",
          error
        );

        renderLocalHistory();
      }
    );
}


/* =========================================================
   SEARCH
========================================================= */

searchInput.addEventListener(
  "input",
  () => {

    const term =
      searchInput.value
        .trim()
        .toLowerCase();


    if (!term) {

      searchResults.innerHTML =
        `<div class="search-empty">
          Start typing to search your conversations.
        </div>`;

      return;
    }


    const matches =
      localChats.filter(
        chat =>
          String(
            chat.title || ""
          )
            .toLowerCase()
            .includes(term) ||

          String(
            chat.userMessage || ""
          )
            .toLowerCase()
            .includes(term) ||

          String(
            chat.aiMessage || ""
          )
            .toLowerCase()
            .includes(term)
      );


    if (!matches.length) {

      searchResults.innerHTML =
        `<div class="search-empty">
          No conversations found.
        </div>`;

      return;
    }


    searchResults.innerHTML =
      "";


    matches.forEach(
      chat => {

        const button =
          document.createElement(
            "button"
          );

        button.type =
          "button";

        button.className =
          "history-item";

        button.textContent =
          chat.title;


        button.addEventListener(
          "click",
          () => {

            closeModal(
              searchModal
            );

            loadChat(
              chat
            );
          }
        );


        searchResults.appendChild(
          button
        );
      }
    );
  }
);


/* =========================================================
   CLEAR LOCAL CACHE
========================================================= */

clearLocalBtn.addEventListener(
  "click",
  () => {

    const confirmed =
      window.confirm(
        "Clear conversations saved on this device?"
      );

    if (!confirmed) {
      return;
    }


    localChats = [];


    localStorage.removeItem(
      "qtm_ai_chats"
    );


    if (!currentUser) {
      renderLocalHistory();
    }


    showToast(
      "Local chat cache cleared."
    );
  }
);


/* =========================================================
   SHARE
========================================================= */

shareBtn.addEventListener(
  "click",
  async () => {

    const text =
      "QTM AI — Intelligent AI Workspace";


    try {

      if (
        navigator.share
      ) {

        await navigator.share({
          title: "QTM AI",
          text,
          url: location.href
        });

      } else if (
        navigator.clipboard
      ) {

        await navigator.clipboard.writeText(
          location.href
        );

        showToast(
          "QTM AI link copied."
        );
      }

    } catch {
      /* User cancelled share. */
    }
  }
);


/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;

function showToast(
  message
) {

  toast.textContent =
    message;

  toast.classList.add(
    "show"
  );


  clearTimeout(
    toastTimer
  );


  toastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      3000
    );
}


/* =========================================================
   HELPERS
========================================================= */

function getInitial(
  name
) {

  return (
    name
      ?.trim()
      ?.charAt(0)
      ?.toUpperCase() ||
    "G"
  );
}


function escapeHTML(
  value
) {

  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}


function escapeAttribute(
  value
) {

  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    );
}


function firebaseAuthError(
  error
) {

  const code =
    error?.code || "";


  if (
    code ===
    "auth/popup-blocked"
  ) {
    return "Google sign-in popup was blocked.";
  }


  if (
    code ===
    "auth/popup-closed-by-user"
  ) {
    return "Google sign-in was cancelled.";
  }


  if (
    code ===
    "auth/unauthorized-domain"
  ) {
    return "This website domain is not authorized in Firebase.";
  }


  if (
    code ===
    "auth/operation-not-allowed"
  ) {
    return "Google Sign-In is not enabled in Firebase.";
  }


  return (
    error?.message ||
    "Google sign-in failed."
  );
}


/* =========================================================
   STARTUP
========================================================= */

chatInput.focus();

autoResize();

console.log(
  "QTM AI frontend loaded."
);
