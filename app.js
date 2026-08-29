/* =========================================
   QTM AI
   Firebase + Google Authentication
========================================= */


/* FIREBASE */

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";


import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


/* =========================================
   FIREBASE CONFIG
========================================= */

const firebaseConfig = {

  apiKey:
    "AIzaSyC_C_ACJcRupgX9jEUON1FsS58igSA45aw",

  authDomain:
    "logic-leaf.firebaseapp.com",

  projectId:
    "logic-leaf",

  storageBucket:
    "logic-leaf.firebasestorage.app",

  messagingSenderId:
    "288673697563",

  appId:
    "1:288673697563:web:c14d08452b01568d1c8dbe",

  measurementId:
    "G-Z30K3K85LX"

};


/* =========================================
   INITIALIZE FIREBASE
========================================= */

const firebaseApp =
  initializeApp(firebaseConfig);


const auth =
  getAuth(firebaseApp);


const googleProvider =
  new GoogleAuthProvider();


/* =========================================
   QTM AI WORKER
========================================= */

const API_URL =
  "https://qtm-ai-new.qtmkiller6.workers.dev";


/* =========================================
   ELEMENTS
========================================= */

const welcome =
  document.getElementById("welcome");

const messages =
  document.getElementById("messages");

const chatArea =
  document.getElementById("chatArea");

const messageInput =
  document.getElementById("messageInput");

const heroMessage =
  document.getElementById("heroMessage");

const chatForm =
  document.getElementById("chatForm");

const heroForm =
  document.getElementById("heroForm");

const sendButton =
  document.getElementById("sendButton");

const heroSend =
  document.getElementById("heroSend");

const newChatBtn =
  document.getElementById("newChatBtn");

const chatHistory =
  document.getElementById("chatHistory");

const chatSearch =
  document.getElementById("chatSearch");

const sidebar =
  document.getElementById("sidebar");

const mobileMenu =
  document.getElementById("mobileMenu");

const loginBtn =
  document.getElementById("loginBtn");

const loginText =
  document.getElementById("loginText");

const account =
  document.getElementById("account");

const googleButton =
  document.getElementById("googleButton");

const loginModal =
  document.getElementById("loginModal");

const closeLogin =
  document.getElementById("closeLogin");

const loginStatus =
  document.getElementById("loginStatus");

const settingsBtn =
  document.getElementById("settingsBtn");

const settingsModal =
  document.getElementById("settingsModal");

const closeSettings =
  document.getElementById("closeSettings");

const settingsAccount =
  document.getElementById("settingsAccount");


/* =========================================
   USER
========================================= */

let currentUser = null;


/* =========================================
   LOCAL CHAT HISTORY
========================================= */

let chats =
  JSON.parse(
    localStorage.getItem("qtm_ai_chats") || "[]"
  );


/* =========================================
   GOOGLE LOGIN
========================================= */

async function googleLogin() {

  loginStatus.textContent =
    "Connecting to Google...";


  try {

    const result =
      await signInWithPopup(
        auth,
        googleProvider
      );


    currentUser =
      result.user;


    loginStatus.textContent =
      `Welcome, ${currentUser.displayName || "QTM AI user"}`;


    setTimeout(() => {

      loginModal.classList.add(
        "hidden"
      );

    }, 800);


  } catch (error) {

    console.error(
      "Google login error:",
      error
    );


    if (
      error.code ===
      "auth/popup-closed-by-user"
    ) {

      loginStatus.textContent =
        "Login window was closed.";

    } else {

      loginStatus.textContent =
        "Google sign-in failed. Check Firebase Authentication settings.";

    }

  }

}


/* =========================================
   SIGN OUT
========================================= */

async function logout() {

  try {

    await signOut(auth);

    currentUser = null;

  } catch (error) {

    console.error(
      "Logout error:",
      error
    );

  }

}


/* =========================================
   AUTH STATE
========================================= */

onAuthStateChanged(
  auth,
  user => {

    currentUser =
      user;


    if (user) {

      loginText.textContent =
        "Sign out";


      account.textContent =
        `${user.displayName || "QTM AI user"}`;


      settingsAccount.textContent =
        user.email || "Google account";

    } else {

      loginText.textContent =
        "Sign in with Google";


      account.textContent =
        "Guest mode";


      settingsAccount.textContent =
        "Guest";

    }

  }
);


/* =========================================
   LOGIN BUTTON
========================================= */

loginBtn.addEventListener(
  "click",
  async () => {

    if (currentUser) {

      await logout();

    } else {

      loginModal.classList.remove(
        "hidden"
      );

    }

  }
);


googleButton.addEventListener(
  "click",
  googleLogin
);


closeLogin.addEventListener(
  "click",
  () => {

    loginModal.classList.add(
      "hidden"
    );

  }
);


/* =========================================
   SETTINGS
========================================= */

settingsBtn.addEventListener(
  "click",
  () => {

    settingsModal.classList.remove(
      "hidden"
    );

  }
);


closeSettings.addEventListener(
  "click",
  () => {

    settingsModal.classList.add(
      "hidden"
    );

  }
);


/* =========================================
   MODAL OUTSIDE CLICK
========================================= */

document
  .querySelectorAll(".modal")
  .forEach(modal => {

    modal.addEventListener(
      "click",
      event => {

        if (
          event.target === modal
        ) {

          modal.classList.add(
            "hidden"
          );

        }

      }
    );

  });


/* =========================================
   ADD MESSAGE
========================================= */

function addMessage(
  text,
  role
) {

  welcome.style.display =
    "none";


  const row =
    document.createElement("div");


  row.className =
    `message-row ${role}`;


  const wrapper =
    document.createElement("div");


  wrapper.className =
    "message-wrapper";


  const label =
    document.createElement("div");


  label.className =
    "message-label";


  label.textContent =
    role === "user"
      ? "YOU"
      : "QTM AI";


  const bubble =
    document.createElement("div");


  bubble.className =
    "message";


  bubble.textContent =
    text;


  wrapper.appendChild(label);

  wrapper.appendChild(bubble);

  row.appendChild(wrapper);

  messages.appendChild(row);


  scrollBottom();

}


/* =========================================
   SCROLL
========================================= */

function scrollBottom() {

  chatArea.scrollTop =
    chatArea.scrollHeight;

}


/* =========================================
   ASK AI
========================================= */

async function askAI(text) {

  text =
    String(text || "").trim();


  if (!text) return;


  addMessage(
    text,
    "user"
  );


  saveChat(text);


  messageInput.value =
    "";

  heroMessage.value =
    "";


  messageInput.style.height =
    "auto";

  heroMessage.style.height =
    "auto";


  sendButton.disabled =
    true;

  heroSend.disabled =
    true;


  const loading =
    document.createElement("div");


  loading.className =
    "message-row ai";


  loading.innerHTML = `
    <div class="message-wrapper">

      <div class="message-label">
        QTM AI
      </div>

      <div class="message">
        Thinking...
      </div>

    </div>
  `;


  messages.appendChild(
    loading
  );


  scrollBottom();


  try {

    const response =
      await fetch(
        `${API_URL}/api/chat`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              message: text
            })
        }
      );


    const raw =
      await response.text();


    let data;


    try {

      data =
        JSON.parse(raw);

    } catch {

      throw new Error(
        "Worker did not return JSON."
      );

    }


    loading.remove();


    if (
      response.ok &&
      data.response
    ) {

      addMessage(
        data.response,
        "ai"
      );

    } else {

      addMessage(
        data.error ||
        "QTM AI couldn't answer.",
        "ai"
      );

    }

  } catch (error) {

    console.error(
      "QTM AI error:",
      error
    );


    loading.remove();


    addMessage(
      "Unable to connect to QTM AI. Please check your Cloudflare Worker.",
      "ai"
    );

  }


  sendButton.disabled =
    false;

  heroSend.disabled =
    false;


  messageInput.focus();

}


/* =========================================
   CHAT FORM
========================================= */

chatForm.addEventListener(
  "submit",
  event => {

    event.preventDefault();

    askAI(
      messageInput.value
    );

  }
);


/* =========================================
   HERO FORM
========================================= */

heroForm.addEventListener(
  "submit",
  event => {

    event.preventDefault();

    askAI(
      heroMessage.value
    );

  }
);


/* =========================================
   ENTER TO SEND
========================================= */

function setupEnter(
  input,
  form
) {

  input.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {

        event.preventDefault();

        form.requestSubmit();

      }

    }
  );

}


setupEnter(
  messageInput,
  chatForm
);


setupEnter(
  heroMessage,
  heroForm
);


/* =========================================
   AUTO RESIZE
========================================= */

function autoResize(
  input
) {

  input.addEventListener(
    "input",
    () => {

      input.style.height =
        "auto";


      input.style.height =
        Math.min(
          input.scrollHeight,
          150
        ) + "px";

    }
  );

}


autoResize(
  messageInput
);

autoResize(
  heroMessage
);


/* =========================================
   QUICK ACTIONS
========================================= */

document
  .querySelectorAll(
    ".quick-actions button"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        askAI(
          button.dataset.prompt
        );

      }
    );

  });


/* =========================================
   NEW CHAT
========================================= */

newChatBtn.addEventListener(
  "click",
  () => {

    messages.innerHTML =
      "";

    welcome.style.display =
      "block";

    messageInput.value =
      "";

    heroMessage.value =
      "";

    messageInput.style.height =
      "auto";

    heroMessage.style.height =
      "auto";

    sidebar.classList.remove(
      "open"
    );

  }
);


/* =========================================
   SAVE CHAT
========================================= */

function saveChat(text) {

  chats.unshift({

    id:
      Date.now(),

    text:
      text,

    created:
      new Date().toISOString()

  });


  chats =
    chats.slice(
      0,
      100
    );


  localStorage.setItem(
    "qtm_ai_chats",
    JSON.stringify(chats)
  );


  renderHistory();

}


/* =========================================
   RENDER HISTORY
========================================= */

function renderHistory(
  search = ""
) {

  chatHistory.innerHTML =
    "";


  const query =
    search
      .toLowerCase()
      .trim();


  const results =
    chats.filter(
      chat =>
        chat.text
          .toLowerCase()
          .includes(query)
    );


  if (!results.length) {

    const empty =
      document.createElement(
        "div"
      );


    empty.className =
      "history-item";


    empty.textContent =
      query
        ? "No matching conversations"
        : "No conversations yet";


    chatHistory.appendChild(
      empty
    );


    return;

  }


  results.forEach(
    chat => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "history-item";


      item.textContent =
        chat.text;


      item.title =
        chat.text;


      item.addEventListener(
        "click",
        () => {

          messageInput.value =
            chat.text;

          messageInput.focus();

          sidebar.classList.remove(
            "open"
          );

        }
      );


      chatHistory.appendChild(
        item
      );

    }
  );

}


renderHistory();


/* =========================================
   SEARCH
========================================= */

chatSearch.addEventListener(
  "input",
  () => {

    renderHistory(
      chatSearch.value
    );

  }
);


/* =========================================
   MOBILE MENU
========================================= */

mobileMenu.addEventListener(
  "click",
  () => {

    sidebar.classList.toggle(
      "open"
    );

  }
);


/* =========================================
   WORKER HEALTH
========================================= */

async function checkWorker() {

  try {

    const response =
      await fetch(
        `${API_URL}/api/health`
      );


    const data =
      await response.json();


    console.log(
      "QTM AI Worker:",
      data
    );

  } catch (error) {

    console.warn(
      "Worker health check failed:",
      error
    );

  }

}


checkWorker();
