import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


// =====================================================
// CONFIG
// =====================================================

const API_URL =
  "https://ck.qtmkiller6.workers.dev";

const firebaseConfig = {
  apiKey: "AIzaSyC_C_ACJcRupgX9jEUON1FsS58igSA45aw",
  authDomain: "logic-leaf.firebaseapp.com",
  databaseURL: "https://logic-leaf-default-rtdb.firebaseio.com",
  projectId: "logic-leaf",
  storageBucket: "logic-leaf.firebasestorage.app",
  messagingSenderId: "288673697563",
  appId: "1:288673697563:web:c14d08452b01568d1c8dbe",
  measurementId: "G-Z30K3K85LX"
};


// =====================================================
// FIREBASE
// =====================================================

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();


// =====================================================
// ELEMENTS
// =====================================================

const sidebar =
  document.getElementById("sidebar");

const sidebarOverlay =
  document.getElementById("sidebarOverlay");

const menuButton =
  document.getElementById("menuButton");

const closeSidebar =
  document.getElementById("closeSidebar");

const newChatBtn =
  document.getElementById("newChatBtn");

const messageInput =
  document.getElementById("messageInput");

const sendBtn =
  document.getElementById("sendBtn");

const chatMessages =
  document.getElementById("chatMessages");

const welcome =
  document.getElementById("welcome");

const history =
  document.getElementById("chatHistory");

const attachmentBtn =
  document.getElementById("attachmentBtn");

const cameraBtn =
  document.getElementById("cameraBtn");

const imageBtn =
  document.getElementById("imageBtn");

const fileInput =
  document.getElementById("fileInput");

const cameraInput =
  document.getElementById("cameraInput");

const settingsBtn =
  document.getElementById("settingsBtn");

const settingsModal =
  document.getElementById("settingsModal");

const closeSettings =
  document.getElementById("closeSettings");

const loginBtn =
  document.getElementById("loginBtn");

const topLoginBtn =
  document.getElementById("topLoginBtn");

const loginModal =
  document.getElementById("loginModal");

const closeLogin =
  document.getElementById("closeLogin");

const googleLogin =
  document.getElementById("googleLogin");

const logoutBtn =
  document.getElementById("logoutBtn");

const loginStatus =
  document.getElementById("loginStatus");

const userName =
  document.getElementById("userName");

const userEmail =
  document.getElementById("userEmail");

const userAvatar =
  document.getElementById("userAvatar");

const topAvatar =
  document.getElementById("topAvatar");

const enterToSend =
  document.getElementById("enterToSend");

const animations =
  document.getElementById("animations");


// =====================================================
// SIDEBAR
// =====================================================

function openSidebar() {
  sidebar.classList.add("open");
  sidebarOverlay.classList.add("show");
}

function closeSidebarMenu() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("show");
}

menuButton.addEventListener("click", openSidebar);
closeSidebar.addEventListener("click", closeSidebarMenu);
sidebarOverlay.addEventListener("click", closeSidebarMenu);


// =====================================================
// NEW CHAT
// =====================================================

function startNewChat() {
  chatMessages.innerHTML = "";
  chatMessages.appendChild(welcome);

  welcome.style.display = "";

  messageInput.value = "";
  messageInput.style.height = "auto";

  messageInput.focus();

  closeSidebarMenu();
}

newChatBtn.addEventListener("click", startNewChat);


// =====================================================
// AUTO RESIZE
// =====================================================

messageInput.addEventListener("input", () => {
  messageInput.style.height = "auto";

  messageInput.style.height =
    Math.min(messageInput.scrollHeight, 180) + "px";
});


// =====================================================
// SUGGESTIONS
// =====================================================

document.querySelectorAll(".suggestion").forEach(button => {

  button.addEventListener("click", () => {

    messageInput.value =
      button.textContent.trim();

    messageInput.dispatchEvent(
      new Event("input")
    );

    messageInput.focus();
  });

});


// =====================================================
// CHAT UI
// =====================================================

function addMessage(role, text) {

  if (welcome.parentNode === chatMessages) {
    welcome.style.display = "none";
  }

  const row =
    document.createElement("div");

  row.className =
    `message-row ${
      role === "user"
        ? "user-message"
        : "ai-message"
    }`;

  const avatar =
    document.createElement("div");

  avatar.className =
    "message-avatar";

  avatar.textContent =
    role === "user" ? "U" : "L";

  const content =
    document.createElement("div");

  content.className =
    "message-content";

  content.textContent = text;

  row.appendChild(avatar);
  row.appendChild(content);

  chatMessages.appendChild(row);

  chatMessages.scrollTop =
    chatMessages.scrollHeight;

  return content;
}


function addTyping() {

  if (welcome.parentNode === chatMessages) {
    welcome.style.display = "none";
  }

  const row =
    document.createElement("div");

  row.className =
    "message-row ai-message";

  const avatar =
    document.createElement("div");

  avatar.className =
    "message-avatar";

  avatar.textContent = "L";

  const content =
    document.createElement("div");

  content.className =
    "message-content";

  content.innerHTML = `
    <span class="typing">
      <i></i>
      <i></i>
      <i></i>
    </span>
  `;

  row.appendChild(avatar);
  row.appendChild(content);

  chatMessages.appendChild(row);

  chatMessages.scrollTop =
    chatMessages.scrollHeight;

  return row;
}


// =====================================================
// SEND
// =====================================================

let sending = false;

async function sendMessage() {

  if (sending) return;

  const message =
    messageInput.value.trim();

  if (!message) return;

  sending = true;
  sendBtn.disabled = true;

  addMessage("user", message);

  messageInput.value = "";
  messageInput.style.height = "auto";

  const typing =
    addTyping();

  try {

    const response =
      await fetch(`${API_URL}/v1/chat`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          message
        })
      });

    const data =
      await response.json();

    typing.remove();

    if (!response.ok || !data.ok) {

      addMessage(
        "assistant",
        data?.error ||
        "The AI could not respond."
      );

      return;
    }

    addMessage(
      "assistant",
      data.reply ||
      "I couldn't generate a response."
    );

    addHistory(message);

  } catch (error) {

    typing.remove();

    addMessage(
      "assistant",
      "Connection failed. Please check the Worker and try again."
    );

    console.error(error);

  } finally {

    sending = false;
    sendBtn.disabled = false;
    messageInput.focus();
  }
}

sendBtn.addEventListener(
  "click",
  sendMessage
);


// =====================================================
// ENTER TO SEND
// =====================================================

messageInput.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      enterToSend.checked
    ) {

      event.preventDefault();
      sendMessage();
    }

  }
);


// =====================================================
// CHAT HISTORY
// =====================================================

function addHistory(message) {

  const empty =
    history.querySelector(".history-empty");

  if (empty) {
    empty.remove();
  }

  const item =
    document.createElement("button");

  item.type = "button";
  item.className = "history-item";

  item.textContent =
    message.length > 42
      ? message.slice(0, 42) + "..."
      : message;

  item.addEventListener(
    "click",
    () => closeSidebarMenu()
  );

  history.prepend(item);
}


// =====================================================
// ATTACHMENTS
// =====================================================

attachmentBtn.addEventListener(
  "click",
  () => fileInput.click()
);

cameraBtn.addEventListener(
  "click",
  () => cameraInput.click()
);

fileInput.addEventListener(
  "change",
  () => {

    if (!fileInput.files.length) return;

    const names =
      [...fileInput.files]
        .map(file => file.name)
        .join(", ");

    messageInput.value =
      `Attached: ${names}\n\n`;

    messageInput.dispatchEvent(
      new Event("input")
    );

    messageInput.focus();
  }
);

cameraInput.addEventListener(
  "change",
  () => {

    if (!cameraInput.files.length) return;

    messageInput.value =
      "Camera image attached.";

    messageInput.focus();
  }
);


// =====================================================
// IMAGE BUTTON
// =====================================================

imageBtn.addEventListener(
  "click",
  () => {

    messageInput.value =
      "Create an image of ";

    messageInput.dispatchEvent(
      new Event("input")
    );

    messageInput.focus();
  }
);


// =====================================================
// SETTINGS
// =====================================================

settingsBtn.addEventListener(
  "click",
  () => {
    settingsModal.classList.remove("hidden");
    closeSidebarMenu();
  }
);

closeSettings.addEventListener(
  "click",
  () => {
    settingsModal.classList.add("hidden");
  }
);

settingsModal.addEventListener(
  "click",
  event => {

    if (event.target === settingsModal) {
      settingsModal.classList.add("hidden");
    }

  }
);


// =====================================================
// GOOGLE LOGIN UI
// =====================================================

function openLogin() {
  loginModal.classList.remove("hidden");
}

loginBtn.addEventListener(
  "click",
  openLogin
);

topLoginBtn.addEventListener(
  "click",
  openLogin
);

closeLogin.addEventListener(
  "click",
  () => {
    loginModal.classList.add("hidden");
  }
);

loginModal.addEventListener(
  "click",
  event => {

    if (event.target === loginModal) {
      loginModal.classList.add("hidden");
    }

  }
);


// =====================================================
// GOOGLE AUTH
// =====================================================

googleLogin.addEventListener(
  "click",
  async () => {

    loginStatus.textContent =
      "Opening Google sign-in...";

    try {

      await signInWithPopup(
        auth,
        googleProvider
      );

      loginStatus.textContent =
        "Signed in successfully.";

    } catch (error) {

      console.error(error);

      loginStatus.textContent =
        error?.message ||
        "Google sign-in failed.";

    }

  }
);


logoutBtn.addEventListener(
  "click",
  async () => {

    try {
      await signOut(auth);

      loginStatus.textContent =
        "Signed out.";

    } catch (error) {
      console.error(error);
    }

  }
);


// =====================================================
// AUTH STATE
// =====================================================

onAuthStateChanged(
  auth,
  user => {

    if (user) {

      userName.textContent =
        user.displayName ||
        "Google User";

      userEmail.textContent =
        user.email ||
        "";

      if (user.photoURL) {

        userAvatar.innerHTML =
          `<img src="${user.photoURL}" alt="">`;

        topAvatar.innerHTML =
          `<img src="${user.photoURL}" alt="">`;

      } else {

        userAvatar.textContent =
          (user.displayName || "G")
            .charAt(0)
            .toUpperCase();

        topAvatar.textContent =
          (user.displayName || "G")
            .charAt(0)
            .toUpperCase();
      }

      googleLogin.classList.add("hidden");
      logoutBtn.classList.remove("hidden");

    } else {

      userName.textContent = "Guest";
      userEmail.textContent =
        "Sign in with Google";

      userAvatar.textContent = "G";
      topAvatar.textContent = "G";

      googleLogin.classList.remove("hidden");
      logoutBtn.classList.add("hidden");
    }

  }
);


// =====================================================
// ANIMATION SETTING
// =====================================================

animations.addEventListener(
  "change",
  () => {

    document.body.style.setProperty(
      "--animation-state",
      animations.checked ? "1" : "0"
    );

  }
);


// =====================================================
// CLOSE SIDEBAR AFTER MOBILE ACTION
// =====================================================

window.addEventListener(
  "resize",
  () => {

    if (window.innerWidth > 760) {
      closeSidebarMenu();
    }

  }
);
