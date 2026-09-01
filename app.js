/* =========================================================
   LOGIC-LEAF AI
   Frontend controller
========================================================= */

"use strict";


/* =========================================================
   CONFIG
========================================================= */

const API_URL =
  "https://ck.qtmkiller6.workers.dev";


const API = {

  chat:
    `${API_URL}/v1/chat`,

  chats:
    `${API_URL}/api/chats`,

  vision:
    `${API_URL}/api/vision`,

  image:
    `${API_URL}/api/image`,

  transcribe:
    `${API_URL}/api/transcribe`,

  speech:
    `${API_URL}/api/speech`,

  user:
    `${API_URL}/api/user`,

  config:
    `${API_URL}/api/config`,

  keys:
    `${API_URL}/api/keys`

};


/* =========================================================
   STATE
========================================================= */

const state = {

  user: null,

  currentChatId: null,

  chats: [],

  messages: [],

  selectedFile: null,

  isGenerating: false,

  isRecording: false,

  recognition: null,

  firebaseReady: false,

  settings: {

    autoRead: false,

    darkMode: true

  }

};


/* =========================================================
   DOM
========================================================= */

const $ = id =>
  document.getElementById(id);


const sidebar =
  $("sidebar");

const chatList =
  $("chatList");

const messages =
  $("messages");

const welcomeScreen =
  $("welcomeScreen");

const messageInput =
  $("messageInput");

const chatForm =
  $("chatForm");

const sendBtn =
  $("sendBtn");

const fileInput =
  $("fileInput");

const attachmentPreview =
  $("attachmentPreview");

const toast =
  $("toast");

const toastText =
  $("toastText");


/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;


function showToast(text) {

  toastText.textContent = text;

  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer =
    setTimeout(() => {

      toast.classList.remove("show");

    }, 2600);

}


/* =========================================================
   AUTH TOKEN
========================================================= */

async function getAuthToken() {

  try {

    const firebase =
      window.logicLeafFirebase;

    if (
      !firebase ||
      !firebase.auth ||
      !firebase.auth.currentUser
    ) {
      return null;
    }

    return await firebase.auth.currentUser
      .getIdToken();

  } catch (error) {

    console.error(
      "Token error:",
      error
    );

    return null;
  }

}


/* =========================================================
   FETCH HELPER
========================================================= */

async function apiFetch(
  url,
  options = {}
) {

  const token =
    await getAuthToken();


  const headers = {

    ...(options.headers || {})

  };


  if (
    options.body &&
    !(options.body instanceof FormData)
  ) {

    headers["Content-Type"] =
      "application/json";

  }


  if (token) {

    headers["Authorization"] =
      `Bearer ${token}`;

  }


  const response =
    await fetch(
      url,
      {
        ...options,
        headers
      }
    );


  const contentType =
    response.headers.get(
      "content-type"
    ) || "";


  let data;


  if (
    contentType.includes(
      "application/json"
    )
  ) {

    data =
      await response.json();

  } else {

    data =
      await response.text();

  }


  if (!response.ok) {

    throw new Error(
      data?.error ||
      `Request failed (${response.status})`
    );

  }


  return data;

}


/* =========================================================
   SIDEBAR
========================================================= */

$("openSidebarBtn")
  .addEventListener(
    "click",
    () => {

      sidebar.classList.add(
        "open"
      );

    }
  );


$("closeSidebarBtn")
  .addEventListener(
    "click",
    () => {

      sidebar.classList.remove(
        "open"
      );

    }
  );


/* =========================================================
   MODAL
========================================================= */

function openModal(id) {

  $(id).classList.remove(
    "hidden"
  );

}


function closeModal(id) {

  $(id).classList.add(
    "hidden"
  );

}


document
  .querySelectorAll(
    "[data-close-modal]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        closeModal(
          button.dataset.closeModal
        );

      }
    );

  });


document
  .querySelectorAll(
    ".modal-backdrop"
  )
  .forEach(backdrop => {

    backdrop.addEventListener(
      "click",
      () => {

        const modal =
          backdrop.parentElement;

        modal.classList.add(
          "hidden"
        );

      }
    );

  });


/* =========================================================
   SETTINGS
========================================================= */

function openSettings() {

  openModal(
    "settingsModal"
  );

}


$("settingsBtn")
  .addEventListener(
    "click",
    openSettings
  );


$("topSettingsBtn")
  .addEventListener(
    "click",
    openSettings
  );


$("menuSettings")
  .addEventListener(
    "click",
    () => {

      $("accountMenu")
        .classList.add(
          "hidden"
        );

      openSettings();

    }
  );


$("developerBtn")
  .addEventListener(
    "click",
    openDeveloper
  );


$("openDeveloperFromSettings")
  .addEventListener(
    "click",
    () => {

      closeModal(
        "settingsModal"
      );

      openDeveloper();

    }
  );


function openDeveloper() {

  openModal(
    "developerModal"
  );

  loadApiKeys();

}


/* =========================================================
   ACCOUNT MENU
========================================================= */

$("accountMenuBtn")
  .addEventListener(
    "click",
    event => {

      event.stopPropagation();

      $("accountMenu")
        .classList.toggle(
          "hidden"
        );

    }
  );


document.addEventListener(
  "click",
  () => {

    $("accountMenu")
      .classList.add(
        "hidden"
      );

  }
);


/* =========================================================
   FIREBASE AUTH
========================================================= */

async function signInGoogle() {

  if (
    !window.logicLeafFirebase
  ) {

    showToast(
      "Firebase is still loading."
    );

    return;

  }


  try {

    await window
      .logicLeafFirebase
      .signInWithPopup(
        window.logicLeafFirebase.auth,
        window.logicLeafFirebase.googleProvider
      );

  } catch (error) {

    console.error(
      "Google login:",
      error
    );


    if (
      error.code ===
      "auth/popup-blocked"
    ) {

      showToast(
        "Google popup was blocked."
      );

    } else if (
      error.code ===
      "auth/unauthorized-domain"
    ) {

      showToast(
        "Add this GitHub domain to Firebase Authorized domains."
      );

    } else {

      showToast(
        error.message ||
        "Google sign-in failed."
      );

    }

  }

}


async function logout() {

  try {

    await window
      .logicLeafFirebase
      .signOut(
        window.logicLeafFirebase.auth
      );

    state.user = null;

    updateAccountUI();

    showToast(
      "Signed out."
    );

  } catch (error) {

    console.error(error);

    showToast(
      "Could not sign out."
    );

  }

}


$("loginBtn")
  .addEventListener(
    "click",
    signInGoogle
  );


$("settingsLoginBtn")
  .addEventListener(
    "click",
    signInGoogle
  );


$("logoutBtn")
  .addEventListener(
    "click",
    logout
  );


$("menuLogout")
  .addEventListener(
    "click",
    logout
  );


window.addEventListener(
  "firebase-ready",
  () => {

    state.firebaseReady = true;

    window
      .logicLeafFirebase
      .onAuthStateChanged(
        window.logicLeafFirebase.auth,
        async user => {

          state.user = user;

          updateAccountUI();

          if (user) {

            showToast(
              `Welcome, ${user.displayName || "User"}`
            );

            await loadChats();

            await loadUser();

          } else {

            renderChats();

          }

        }
      );

  }
);


/* =========================================================
   ACCOUNT UI
========================================================= */

function setAvatar(
  element,
  user
) {

  element.innerHTML = "";


  if (
    user &&
    user.photoURL
  ) {

    const img =
      document.createElement(
        "img"
      );

    img.src =
      user.photoURL;

    img.alt = "";

    element.appendChild(
      img
    );

  } else {

    element.textContent =
      user
        ? (
            user.displayName ||
            "U"
          )
          .charAt(0)
          .toUpperCase()
        : "G";

  }

}


function updateAccountUI() {

  const user =
    state.user;


  const name =
    user?.displayName ||
    "Guest";


  const email =
    user?.email ||
    "Not signed in";


  $("accountName")
    .textContent =
      name;


  $("accountEmail")
    .textContent =
      email;


  $("settingsName")
    .textContent =
      name;


  $("settingsEmail")
    .textContent =
      email;


  setAvatar(
    $("accountAvatar"),
    user
  );


  setAvatar(
    $("settingsAvatar"),
    user
  );


  if (user) {

    $("loginBtn")
      .textContent =
        "Signed in";

    $("settingsLoginBtn")
      .classList.add(
        "hidden"
      );

    $("logoutBtn")
      .classList.remove(
        "hidden"
      );

  } else {

    $("loginBtn")
      .textContent =
        "Sign in with Google";

    $("settingsLoginBtn")
      .classList.remove(
        "hidden"
      );

    $("logoutBtn")
      .classList.add(
        "hidden"
      );

  }

}


/* =========================================================
   USER
========================================================= */

async function loadUser() {

  try {

    await apiFetch(
      API.user
    );

  } catch (error) {

    console.warn(
      "User endpoint:",
      error.message
    );

  }

}


/* =========================================================
   CHAT HISTORY
========================================================= */

async function loadChats() {

  if (!state.user) {

    renderChats();

    return;

  }


  try {

    const data =
      await apiFetch(
        API.chats
      );


    state.chats =
      data.chats ||
      [];


    renderChats();

  } catch (error) {

    console.error(
      "Chats:",
      error
    );

    showToast(
      "Could not load chat history."
    );

  }

}


function renderChats() {

  chatList.innerHTML = "";


  if (!state.chats.length) {

    const empty =
      document.createElement(
        "div"
      );

    empty.className =
      "empty-chats";

    empty.textContent =
      "No conversations yet";

    chatList.appendChild(
      empty
    );

    return;

  }


  state.chats.forEach(
    chat => {

      const item =
        document.createElement(
          "button"
        );

      item.className =
        "chat-item";


      if (
        chat.id ===
        state.currentChatId
      ) {

        item.classList.add(
          "active"
        );

      }


      const title =
        document.createElement(
          "span"
        );

      title.className =
        "chat-item-title";

      title.textContent =
        chat.title ||
        "New chat";


      item.appendChild(
        title
      );


      item.addEventListener(
        "click",
        () => {

          loadChat(
            chat.id
          );

          sidebar.classList.remove(
            "open"
          );

        }
      );


      chatList.appendChild(
        item
      );

    }
  );

}


/* =========================================================
   NEW CHAT
========================================================= */

$("newChatBtn")
  .addEventListener(
    "click",
    newChat
  );


async function newChat() {

  state.currentChatId =
    null;

  state.messages =
    [];

  messages.innerHTML =
    "";

  welcomeScreen
    .classList.remove(
      "hidden"
    );

  renderChats();

  messageInput.focus();

}


/* =========================================================
   LOAD CHAT
========================================================= */

async function loadChat(
  chatId
) {

  try {

    const data =
      await apiFetch(
        `${API.chats}/${encodeURIComponent(chatId)}`
      );


    state.currentChatId =
      chatId;


    state.messages =
      data.messages ||
      [];


    welcomeScreen
      .classList.add(
        "hidden"
      );


    renderMessages();

    renderChats();

    scrollBottom();

  } catch (error) {

    console.error(
      error
    );

    showToast(
      "Could not open conversation."
    );

  }

}


/* =========================================================
   SEND MESSAGE
========================================================= */

chatForm.addEventListener(
  "submit",
  event => {

    event.preventDefault();

    sendMessage();

  }
);


async function sendMessage(
  forcedMessage = null
) {

  if (
    state.isGenerating
  ) {

    return;

  }


  const text =
    forcedMessage !== null
      ? forcedMessage.trim()
      : messageInput.value.trim();


  if (!text) {

    if (!state.selectedFile) {

      return;

    }

  }


  state.isGenerating =
    true;


  sendBtn.disabled =
    true;


  welcomeScreen
    .classList.add(
      "hidden"
    );


  let displayText =
    text ||
    `Analyze this file: ${state.selectedFile?.name || ""}`;


  addMessage(
    "user",
    displayText
  );


  messageInput.value =
    "";


  resizeTextarea();


  const typingId =
    showTyping();


  try {

    let answer;


    if (
      state.selectedFile &&
      state.selectedFile.type.startsWith(
        "image/"
      )
    ) {

      answer =
        await sendVision(
          displayText,
          state.selectedFile
        );

    } else {

      answer =
        await sendChat(
          displayText
        );

    }


    removeTyping(
      typingId
    );


    addMessage(
      "assistant",
      answer
    );


    if (
      state.settings.autoRead
    ) {

      speakText(
        answer
      );

    }


    clearAttachment();

  } catch (error) {

    removeTyping(
      typingId
    );


    addMessage(
      "assistant",
      `**Error:** ${error.message}`
    );


    console.error(
      error
    );

  } finally {

    state.isGenerating =
      false;

    sendBtn.disabled =
      false;

    messageInput.focus();

  }

}


/* =========================================================
   CHAT API
========================================================= */

async function sendChat(
  text
) {

  const data =
    await apiFetch(
      API.chat,
      {
        method: "POST",

        body: JSON.stringify({

          message: text,

          conversationId:
            state.currentChatId,

          mode: detectMode(text),

          max_tokens: 4096

        })

      }
    );


  state.currentChatId =
    data.conversationId;


  await loadChats();


  return (
    data.message ||
    data.response ||
    "No response returned."
  );

}


/* =========================================================
   MODE
========================================================= */

function detectMode(
  text
) {

  const value =
    text.toLowerCase();


  if (
    value.includes(
      "code"
    ) ||
    value.includes(
      "javascript"
    ) ||
    value.includes(
      "python"
    ) ||
    value.includes(
      "html"
    ) ||
    value.includes(
      "css"
    ) ||
    value.includes(
      "debug"
    )
  ) {

    return "code";

  }


  if (
    value.includes(
      "study"
    ) ||
    value.includes(
      "learn"
    ) ||
    value.includes(
      "explain"
    ) ||
    value.includes(
      "jee"
    )
  ) {

    return "study";

  }


  return "general";

}


/* =========================================================
   VISION
========================================================= */

async function sendVision(
  prompt,
  file
) {

  const base64 =
    await fileToBase64(
      file
    );


  const data =
    await apiFetch(
      API.vision,
      {
        method: "POST",

        body: JSON.stringify({

          prompt,

          image: base64

        })

      }
    );


  return (
    data.message ||
    data.response ||
    "I couldn't analyze that image."
  );

}


function fileToBase64(
  file
) {

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();


      reader.onload = () => {

        const result =
          reader.result;


        const comma =
          result.indexOf(",");


        resolve(
          comma >= 0
            ? result.slice(
                comma + 1
              )
            : result
        );

      };


      reader.onerror =
        reject;


      reader.readAsDataURL(
        file
      );

    }
  );

}


/* =========================================================
   MESSAGE RENDERING
========================================================= */

function addMessage(
  role,
  content
) {

  const message = {

    id:
      crypto.randomUUID(),

    role,

    content,

    created_at:
      Date.now()

  };


  state.messages.push(
    message
  );


  renderMessages();

  scrollBottom();

}


function renderMessages() {

  messages.innerHTML =
    "";


  state.messages.forEach(
    message => {

      const wrapper =
        document.createElement(
          "div"
        );


      wrapper.className =
        `message ${message.role}`;


      const inner =
        document.createElement(
          "div"
        );


      inner.className =
        "message-inner";


      const avatar =
        document.createElement(
          "div"
        );


      avatar.className =
        "message-avatar";


      avatar.textContent =
        message.role ===
        "assistant"
          ? "L"
          : "U";


      const body =
        document.createElement(
          "div"
        );


      body.className =
        "message-body";


      const role =
        document.createElement(
          "div"
        );


      role.className =
        "message-role";


      role.textContent =
        message.role ===
        "assistant"
          ? "LOGIC-LEAF"
          : "You";


      const content =
        document.createElement(
          "div"
        );


      content.className =
        "message-content";


      content.innerHTML =
        markdownToHtml(
          message.content ||
          ""
        );


      body.appendChild(
        role
      );

      body.appendChild(
        content
      );


      if (
        message.role ===
        "assistant"
      ) {

        const actions =
          document.createElement(
            "div"
          );


        actions.className =
          "message-actions";


        const copy =
          document.createElement(
            "button"
          );


        copy.className =
          "message-action";

        copy.textContent =
          "Copy";


        copy.onclick =
          () => {

            navigator.clipboard
              .writeText(
                message.content
              );

            showToast(
              "Copied."
            );

          };


        const read =
          document.createElement(
            "button"
          );


        read.className =
          "message-action";

        read.textContent =
          "Read aloud";


        read.onclick =
          () => {

            speakText(
              message.content
            );

          };


        actions.appendChild(
          copy
        );

        actions.appendChild(
          read
        );


        body.appendChild(
          actions
        );

      }


      inner.appendChild(
        avatar
      );

      inner.appendChild(
        body
      );

      wrapper.appendChild(
        inner
      );

      messages.appendChild(
        wrapper
      );

    }
  );

}


/* =========================================================
   BASIC MARKDOWN
========================================================= */

function escapeHtml(
  text
) {

  return text
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
    );

}


function markdownToHtml(
  markdown
) {

  let text =
    escapeHtml(
      String(markdown)
    );


  const blocks = [];


  text =
    text.replace(
      /```([\s\S]*?)```/g,
      (_, code) => {

        const id =
          `CODEBLOCK_${blocks.length}`;

        blocks.push(
          `<pre><code>${code.trim()}</code></pre>`
        );

        return id;

      }
    );


  text =
    text.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );


  text =
    text.replace(
      /`([^`]+)`/g,
      "<code>$1</code>"
    );


  text =
    text.replace(
      /^### (.*)$/gm,
      "<h4>$1</h4>"
    );


  text =
    text.replace(
      /^## (.*)$/gm,
      "<h3>$1</h3>"
    );


  text =
    text.replace(
      /^# (.*)$/gm,
      "<h2>$1</h2>"
    );


  text =
    text.replace(
      /\n/g,
      "<br>"
    );


  blocks.forEach(
    (html, index) => {

      text =
        text.replace(
          `CODEBLOCK_${index}`,
          html
        );

    }
  );


  return text;

}


/* =========================================================
   TYPING
========================================================= */

let typingCounter =
  0;


function showTyping() {

  const id =
    `typing_${++typingCounter}`;


  const wrapper =
    document.createElement(
      "div"
    );


  wrapper.className =
    "message assistant";


  wrapper.id =
    id;


  wrapper.innerHTML = `
    <div class="message-inner">
      <div class="message-avatar">L</div>

      <div class="message-body">

        <div class="message-role">
          LOGIC-LEAF
        </div>

        <div class="message-content">

          <div class="typing">
            <span></span>
            <span></span>
            <span></span>
          </div>

        </div>

      </div>
    </div>
  `;


  messages.appendChild(
    wrapper
  );


  scrollBottom();


  return id;

}


function removeTyping(
  id
) {

  const element =
    document.getElementById(
      id
    );


  if (element) {

    element.remove();

  }

}


/* =========================================================
   SCROLL
========================================================= */

function scrollBottom() {

  const area =
    $("chatArea");


  requestAnimationFrame(
    () => {

      area.scrollTop =
        area.scrollHeight;

    }
  );

}


/* =========================================================
   TEXTAREA
========================================================= */

messageInput.addEventListener(
  "input",
  resizeTextarea
);


function resizeTextarea() {

  messageInput.style.height =
    "auto";


  messageInput.style.height =
    Math.min(
      messageInput.scrollHeight,
      160
    ) + "px";

}


messageInput.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      sendMessage();

    }

  }
);


/* =========================================================
   QUICK PROMPTS
========================================================= */

document
  .querySelectorAll(
    ".quick-card"
  )
  .forEach(card => {

    card.addEventListener(
      "click",
      () => {

        const prompt =
          card.dataset.prompt;

        sendMessage(
          prompt
        );

      }
    );

  });


/* =========================================================
   FILES
========================================================= */

$("attachBtn")
  .addEventListener(
    "click",
    () => {

      fileInput.click();

    }
  );


fileInput.addEventListener(
  "change",
  () => {

    const file =
      fileInput.files?.[0];


    if (!file) {

      return;

    }


    state.selectedFile =
      file;


    renderAttachment(
      file
    );

  }
);


function renderAttachment(
  file
) {

  attachmentPreview.innerHTML =
    "";


  const chip =
    document.createElement(
      "div"
    );


  chip.className =
    "attachment-chip";


  chip.innerHTML = `
    <span>📎 ${escapeHtml(file.name)}</span>
    <button type="button">×</button>
  `;


  chip
    .querySelector(
      "button"
    )
    .onclick =
      clearAttachment;


  attachmentPreview.appendChild(
    chip
  );

}


function clearAttachment() {

  state.selectedFile =
    null;

  fileInput.value =
    "";

  attachmentPreview.innerHTML =
    "";

}


/* =========================================================
   IMAGE GENERATION
========================================================= */

$("imageBtn")
  .addEventListener(
    "click",
    () => {

      openModal(
        "imageModal"
      );

      $("imagePrompt")
        .focus();

    }
  );


$("generateImageBtn")
  .addEventListener(
    "click",
    generateImage
  );


async function generateImage() {

  const prompt =
    $("imagePrompt")
      .value
      .trim();


  if (!prompt) {

    showToast(
      "Enter an image description."
    );

    return;

  }


  const button =
    $("generateImageBtn");


  button.disabled =
    true;

  button.textContent =
    "Generating...";


  $("imageResult")
    .innerHTML =
      "";


  try {

    const data =
      await apiFetch(
        API.image,
        {
          method: "POST",

          body: JSON.stringify({
            prompt
          })

        }
      );


    const image =
      document.createElement(
        "img"
      );


    image.src =
      data.image;


    image.alt =
      prompt;


    $("imageResult")
      .appendChild(
        image
      );


    showToast(
      "Image generated."
    );

  } catch (error) {

    $("imageResult")
      .textContent =
        error.message;


  } finally {

    button.disabled =
      false;

    button.textContent =
      "Generate";

  }

}


/* =========================================================
   VOICE INPUT
========================================================= */

$("voiceBtn")
  .addEventListener(
    "click",
    toggleVoice
  );


function toggleVoice() {

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


  if (!SpeechRecognition) {

    showToast(
      "Voice input is not supported by this browser."
    );

    return;

  }


  if (
    state.isRecording &&
    state.recognition
  ) {

    state.recognition.stop();

    return;

  }


  const recognition =
    new SpeechRecognition();


  recognition.lang =
    "en-IN";


  recognition.continuous =
    false;


  recognition.interimResults =
    true;


  state.recognition =
    recognition;

  state.isRecording =
    true;


  $("voiceBtn")
    .classList.add(
      "recording"
    );


  recognition.onresult =
    event => {

      let transcript =
        "";


      for (
        let i =
          event.resultIndex;

        i <
          event.results.length;

        i++
      ) {

        transcript +=
          event.results[i][0]
            .transcript;

      }


      messageInput.value =
        transcript;


      resizeTextarea();

    };


  recognition.onerror =
    error => {

      console.error(
        error
      );

    };


  recognition.onend =
    () => {

      state.isRecording =
        false;

      state.recognition =
        null;


      $("voiceBtn")
        .classList.remove(
          "recording"
        );

    };


  recognition.start();

}


/* =========================================================
   READ ALOUD
========================================================= */

function speakText(
  text
) {

  if (
    !("speechSynthesis" in window)
  ) {

    showToast(
      "Read aloud is not supported."
    );

    return;

  }


  window.speechSynthesis.cancel();


  const clean =
    String(text)
      .replace(
        /```[\s\S]*?```/g,
        ""
      )
      .replace(
        /[*#`]/g,
        ""
      );


  const utterance =
    new SpeechSynthesisUtterance(
      clean
    );


  utterance.rate =
    .95;


  utterance.pitch =
    1;


  utterance.volume =
    1;


  window.speechSynthesis
    .speak(
      utterance
    );

}


/* =========================================================
   SETTINGS STORAGE
========================================================= */

function loadSettings() {

  try {

    const saved =
      JSON.parse(
        localStorage.getItem(
          "logic_leaf_settings"
        ) || "{}"
      );


    state.settings = {

      ...state.settings,

      ...saved

    };

  } catch {

    // defaults

  }


  $("autoReadToggle")
    .checked =
      !!state.settings.autoRead;


  $("darkModeToggle")
    .checked =
      !!state.settings.darkMode;

}


function saveSettings() {

  localStorage.setItem(
    "logic_leaf_settings",
    JSON.stringify(
      state.settings
    )
  );

}


$("autoReadToggle")
  .addEventListener(
    "change",
    event => {

      state.settings.autoRead =
        event.target.checked;

      saveSettings();

    }
  );


$("darkModeToggle")
  .addEventListener(
    "change",
    event => {

      state.settings.darkMode =
        event.target.checked;

      saveSettings();

      document.body.style.filter =
        state.settings.darkMode
          ? ""
          : "brightness(1.15)";

    }
  );


/* =========================================================
   API KEY SYSTEM
========================================================= */

$("createApiKeyBtn")
  .addEventListener(
    "click",
    createApiKey
  );


async function loadApiKeys() {

  const list =
    $("apiKeyList");


  if (!state.user) {

    list.innerHTML = `
      <div class="empty-developer">
        Sign in with Google to manage API keys.
      </div>
    `;

    $("dailyUsage")
      .textContent =
        "—";

    return;

  }


  try {

    const data =
      await apiFetch(
        API.keys
      );


    const keys =
      data.keys ||
      [];


    renderApiKeys(
      keys
    );


    $("dailyUsage")
      .textContent =
        data.usage ??
        "0";


    $("dailyLimit")
      .textContent =
        Number(
          data.limit ||
          300000
        ).toLocaleString();


  } catch (error) {

    console.warn(
      "API key endpoint:",
      error.message
    );


    list.innerHTML = `
      <div class="empty-developer">
        API-key management is not available on the current Worker yet.
      </div>
    `;

  }

}


function renderApiKeys(
  keys
) {

  const list =
    $("apiKeyList");


  list.innerHTML =
    "";


  if (!keys.length) {

    list.innerHTML = `
      <div class="empty-developer">
        No API keys created yet.
      </div>
    `;

    return;

  }


  keys.forEach(
    key => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "api-key-item";


      const info =
        document.createElement(
          "div"
        );


      info.className =
        "key-info";


      const name =
        document.createElement(
          "div"
        );


      name.className =
        "key-name";


      name.textContent =
        key.name ||
        "LOGIC-LEAF API key";


      const prefix =
        document.createElement(
          "div"
        );


      prefix.className =
        "key-prefix";


      prefix.textContent =
        key.prefix ||
        "••••••••";


      info.appendChild(
        name
      );

      info.appendChild(
        prefix
      );


      const revoke =
        document.createElement(
          "button"
        );


      revoke.className =
        "revoke-btn";

      revoke.textContent =
        "Revoke";


      revoke.onclick =
        () => revokeApiKey(
          key.id
        );


      item.appendChild(
        info
      );

      item.appendChild(
        revoke
      );


      list.appendChild(
        item
      );

    }
  );

}


async function createApiKey() {

  if (!state.user) {

    showToast(
      "Sign in with Google first."
    );

    return;

  }


  const name =
    prompt(
      "API key name:",
      "My application"
    );


  if (!name) {

    return;

  }


  try {

    const data =
      await apiFetch(
        API.keys,
        {
          method: "POST",

          body: JSON.stringify({
            name
          })

        }
      );


    if (
      data.key
    ) {

      $("newApiKey")
        .textContent =
          data.key;


      $("newKeyBox")
        .classList.remove(
          "hidden"
        );


      showToast(
        "API key created."
      );

    }


    await loadApiKeys();

  } catch (error) {

    showToast(
      error.message ||
      "Could not create API key."
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
      `${API.keys}/${encodeURIComponent(keyId)}`,
      {
        method: "DELETE"
      }
    );


    showToast(
      "API key revoked."
    );


    await loadApiKeys();

  } catch (error) {

    showToast(
      error.message ||
      "Could not revoke key."
    );

  }

}


/* =========================================================
   COPY API KEY
========================================================= */

$("copyApiKeyBtn")
  .addEventListener(
    "click",
    async () => {

      const key =
        $("newApiKey")
          .textContent;


      try {

        await navigator
          .clipboard
          .writeText(
            key
          );

        showToast(
          "API key copied."
        );

      } catch {

        showToast(
          "Copy failed."
        );

      }

    }
  );


/* =========================================================
   CONFIG / HEALTH
========================================================= */

async function checkBackend() {

  try {

    const data =
      await fetch(
        `${API_URL}/api/health`
      )
      .then(
        response =>
          response.json()
      );


    if (
      data.ok
    ) {

      $("modelStatus")
        .innerHTML = `
          <span class="status-dot"></span>
          Online
        `;

    }

  } catch {

    $("modelStatus")
      .innerHTML = `
        <span class="status-dot"></span>
        Offline
      `;

  }

}


/* =========================================================
   KEYBOARD / ESC
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Escape"
    ) {

      document
        .querySelectorAll(
          ".modal"
        )
        .forEach(
          modal =>
            modal.classList.add(
              "hidden"
            )
        );


      $("accountMenu")
        .classList.add(
          "hidden"
        );

    }

  }
);


/* =========================================================
   INITIALIZATION
========================================================= */

function init() {

  loadSettings();

  updateAccountUI();

  checkBackend();

  messageInput.focus();

}


init();
