// =====================================================
// LOGIC-LEAF — COMPLETE FRONTEND APP.JS
// =====================================================

const APP_NAME = "LOGIC-LEAF";

const API =
  "https://logic-leaf.qtmkiller6.workers.dev";

// =====================================================
// FIREBASE CONFIG
// =====================================================

const firebaseConfig = {
  apiKey: "AIzaSyB5bg4U8aMJlAhbWgU0sL37BN4JTTRpmMw",
  authDomain: "logic-leaf-64d0d.firebaseapp.com",
  projectId: "logic-leaf-64d0d",
  storageBucket: "logic-leaf-64d0d.firebasestorage.app",
  messagingSenderId: "346443954182",
  appId: "1:346443954182:web:2ab5bb71b5e52206e62b87",
  measurementId: "G-ZVVBH04E9M"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();


// =====================================================
// DOM HELPERS
// =====================================================

const $ = id =>
  document.getElementById(id);

const sidebar = $("sidebar");
const openSidebar = $("openSidebar");
const closeSidebar = $("closeSidebar");

const newChat = $("newChat");

const chat = $("chat");
const welcome = $("welcome");
const messages = $("messages");

const messageInput = $("messageInput");
const sendButton = $("sendButton");

const searchToggle = $("searchToggle");
const searchIndicator = $("searchIndicator");

const fileInput = $("fileInput");
const attachButton = $("attachButton");
const filePreview = $("filePreview");

const imageButton = $("imageButton");

const chatHistory = $("chatHistory");
const chatSearch = $("chatSearch");

const authModal = $("authModal");
const apiModal = $("apiModal");
const settingsModal = $("settingsModal");

const authEmail = $("authEmail");
const authPassword = $("authPassword");

const emailAuth = $("emailAuth");
const googleAuth = $("googleAuth");
const switchAuth = $("switchAuth");

const authTitle = $("authTitle");
const authSubtitle = $("authSubtitle");
const authStatus = $("authStatus");
const authButton = $("authButton");

const accountName = $("accountName");
const accountEmail = $("accountEmail");
const avatar = $("avatar");
const profileButton = $("profileButton");

const apiButton = $("apiButton");
const createApiKey = $("createApiKey");
const apiOutput = $("apiOutput");

const settingsButton = $("settingsButton");
const logoutButton = $("logoutButton");


// =====================================================
// OPTIONAL CAMERA ELEMENTS
// =====================================================

const cameraButton =
  $("cameraButton");

const cameraInput =
  $("cameraInput");


// =====================================================
// STATE
// =====================================================

let currentUser = null;

let authMode = "login";

let searchMode = false;

let selectedFile = null;

let currentConversation =
  crypto.randomUUID();


// =====================================================
// SIDEBAR
// =====================================================

if (openSidebar) {
  openSidebar.onclick = () => {
    sidebar.classList.remove("closed");
  };
}

if (closeSidebar) {
  closeSidebar.onclick = () => {
    sidebar.classList.add("closed");
  };
}


// =====================================================
// NEW CHAT
// =====================================================

if (newChat) {

  newChat.onclick = () => {

    currentConversation =
      crypto.randomUUID();

    messages.innerHTML = "";

    welcome?.classList.remove("hidden");

    selectedFile = null;

    if (filePreview) {
      filePreview.textContent = "";
      filePreview.classList.add("hidden");
    }

    if (fileInput) {
      fileInput.value = "";
    }

    messageInput.value = "";

    resizeTextarea();

    messageInput.focus();

    if (window.innerWidth < 700) {
      sidebar.classList.add("closed");
    }
  };
}


// =====================================================
// SEARCH MODE
// =====================================================

if (searchToggle) {

  searchToggle.onclick = () => {

    searchMode = !searchMode;

    searchToggle.classList.toggle(
      "active",
      searchMode
    );

    searchIndicator?.classList.toggle(
      "hidden",
      !searchMode
    );
  };
}


// =====================================================
// SEND BUTTON
// =====================================================

if (sendButton) {

  sendButton.onclick =
    sendMessage;
}


// =====================================================
// ENTER TO SEND
// =====================================================

if (messageInput) {

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

  messageInput.addEventListener(
    "input",
    resizeTextarea
  );
}


// =====================================================
// SEND MESSAGE
// =====================================================

async function sendMessage() {

  const text =
    messageInput.value.trim();

  if (!text && !selectedFile) {
    return;
  }

  welcome?.classList.add("hidden");

  const displayText =
    text ||
    `Please analyze the attached file: ${
      selectedFile?.name || "file"
    }`;

  addMessage(
    "user",
    displayText
  );

  messageInput.value = "";

  resizeTextarea();

  sendButton.disabled = true;

  const loading =
    addLoadingMessage();

  try {

    // -------------------------------------------------
    // FILE / IMAGE REQUEST
    // -------------------------------------------------

    if (selectedFile) {

      const result =
        await sendFileToWorker(
          selectedFile,
          text
        );

      loading.remove();

      if (!result.ok) {

        addMessage(
          "ai",
          result.error ||
          "I couldn't process that file."
        );

      } else {

        addAIMessage(
          result.answer ||
          "File processed successfully.",
          result.sources || []
        );
      }

      clearSelectedFile();

      return;
    }


    // -------------------------------------------------
    // NORMAL CHAT
    // -------------------------------------------------

    const userId =
      currentUser
        ? currentUser.uid
        : "anonymous";

    const response =
      await fetch(
        API + "/v1/chat",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            message: text,

            search: searchMode,

            userId,

            conversationId:
              currentConversation
          })
        }
      );

    const data =
      await safeJSON(response);

    loading.remove();

    if (
      !response.ok ||
      !data.ok
    ) {

      addMessage(
        "ai",
        data.error ||
        "LOGIC-LEAF could not process the request."
      );

      return;
    }

    addAIMessage(
      data.answer || "",
      data.sources || []
    );

    loadHistory();

  } catch (error) {

    console.error(error);

    loading.remove();

    addMessage(
      "ai",
      "Connection error. Please check that your LOGIC-LEAF Worker is online."
    );

  } finally {

    sendButton.disabled = false;

    messageInput.focus();
  }
}


// =====================================================
// FILE UPLOAD
// =====================================================

if (attachButton) {

  attachButton.onclick = () => {

    fileInput?.click();
  };
}


if (fileInput) {

  fileInput.onchange =
    event => {

      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }

      selectFile(file);
    };
}


// =====================================================
// SELECT FILE
// =====================================================

function selectFile(file) {

  selectedFile = file;

  if (filePreview) {

    filePreview.classList.remove(
      "hidden"
    );

    filePreview.innerHTML = `
      <div class="selected-file">
        <span class="selected-file-icon">
          ${getFileIcon(file)}
        </span>

        <span class="selected-file-name">
          ${escapeHTML(file.name)}
        </span>

        <button
          type="button"
          class="remove-file"
          id="removeSelectedFile"
          aria-label="Remove file"
        >
          ×
        </button>
      </div>
    `;

    const remove =
      $("removeSelectedFile");

    if (remove) {

      remove.onclick =
        clearSelectedFile;
    }
  }

  // ---------------------------------------------------
  // Automatically prepare text/code files
  // ---------------------------------------------------

  if (
    isTextFile(file)
  ) {

    file.text()
      .then(text => {

        messageInput.value =
          `Please analyze this file.

FILE: ${file.name}

${text}`;

        resizeTextarea();

        messageInput.focus();

      })
      .catch(() => {});
  }

  // ---------------------------------------------------
  // PDF
  // ---------------------------------------------------

  else if (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  ) {

    messageInput.value =
      `Please analyze the attached PDF: ${file.name}`;

    resizeTextarea();

    messageInput.focus();
  }

  // ---------------------------------------------------
  // IMAGE
  // ---------------------------------------------------

  else if (
    file.type.startsWith("image/")
  ) {

    messageInput.value =
      `Please analyze this image.`;

    resizeTextarea();

    messageInput.focus();
  }
}


// =====================================================
// CLEAR FILE
// =====================================================

function clearSelectedFile() {

  selectedFile = null;

  if (fileInput) {
    fileInput.value = "";
  }

  if (filePreview) {

    filePreview.innerHTML = "";

    filePreview.classList.add(
      "hidden"
    );
  }
}


// =====================================================
// FILE TYPES
// =====================================================

function isTextFile(file) {

  return (
    file.type.startsWith("text/") ||
    /\.(txt|md|json|csv|js|jsx|ts|tsx|css|html|xml|py|java|c|cpp|h|hpp|sql|yaml|yml|sh)$/i
      .test(file.name)
  );
}


function getFileIcon(file) {

  const name =
    file.name.toLowerCase();

  if (file.type.startsWith("image/")) {
    return "IMG";
  }

  if (name.endsWith(".pdf")) {
    return "PDF";
  }

  if (
    /\.(js|jsx|ts|tsx|py|java|c|cpp|h|hpp|css|html)$/i
      .test(name)
  ) {
    return "CODE";
  }

  return "FILE";
}


// =====================================================
// SEND FILE TO WORKER
// =====================================================

async function sendFileToWorker(
  file,
  message
) {

  try {

    /*
      FormData is used so the Worker can receive
      real files instead of only filenames.
    */

    const formData =
      new FormData();

    formData.append(
      "file",
      file,
      file.name
    );

    formData.append(
      "message",
      message || ""
    );

    formData.append(
      "userId",
      currentUser
        ? currentUser.uid
        : "anonymous"
    );

    formData.append(
      "conversationId",
      currentConversation
    );

    const response =
      await fetch(
        API + "/v1/file",
        {
          method: "POST",
          body: formData
        }
      );

    return await safeJSON(response);

  } catch (error) {

    console.error(
      "FILE ERROR",
      error
    );

    return {
      ok: false,
      error:
        "File upload failed."
    };
  }
}


// =====================================================
// CAMERA
// =====================================================

if (cameraButton) {

  cameraButton.onclick = () => {

    if (cameraInput) {
      cameraInput.click();
    }
  };
}


if (cameraInput) {

  cameraInput.onchange =
    event => {

      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }

      selectFile(file);
    };
}


// =====================================================
// IMAGE GENERATION
// =====================================================

if (imageButton) {

  imageButton.onclick =
    generateImage;
}


async function generateImage() {

  const prompt =
    messageInput.value.trim();

  if (!prompt) {

    messageInput.focus();

    return;
  }

  welcome?.classList.add("hidden");

  addMessage(
    "user",
    "Generate an image:\n\n" +
    prompt
  );

  messageInput.value = "";

  resizeTextarea();

  imageButton.disabled = true;

  const loading =
    addLoadingMessage();

  try {

    const response =
      await fetch(
        API + "/v1/image",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            prompt
          })
        }
      );

    loading.remove();

    const type =
      response.headers.get(
        "content-type"
      ) || "";

    // -----------------------------------------------
    // IMAGE RESPONSE
    // -----------------------------------------------

    if (
      response.ok &&
      type.includes("image/")
    ) {

      const blob =
        await response.blob();

      const imageURL =
        URL.createObjectURL(blob);

      addGeneratedImage(
        imageURL
      );

      return;
    }

    // -----------------------------------------------
    // JSON RESPONSE
    // -----------------------------------------------

    const data =
      await safeJSON(response);

    addMessage(
      "ai",
      data.error ||
      "Image generation is currently unavailable."
    );

  } catch (error) {

    console.error(
      "IMAGE ERROR",
      error
    );

    loading.remove();

    addMessage(
      "ai",
      "Image generation failed."
    );

  } finally {

    imageButton.disabled = false;

    messageInput.focus();
  }
}


// =====================================================
// GENERATED IMAGE UI
// =====================================================

function addGeneratedImage(
  imageURL
) {

  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.className =
    "message ai";

  const inner =
    document.createElement(
      "div"
    );

  inner.className =
    "message-inner";

  const label =
    document.createElement(
      "div"
    );

  label.className =
    "message-label";

  label.textContent =
    APP_NAME;

  const content =
    document.createElement(
      "div"
    );

  content.className =
    "message-content";

  const image =
    document.createElement(
      "img"
    );

  image.src =
    imageURL;

  image.alt =
    "AI generated image";

  image.style.display =
    "block";

  image.style.width =
    "100%";

  image.style.maxWidth =
    "760px";

  image.style.borderRadius =
    "16px";

  image.style.marginTop =
    "8px";

  content.appendChild(
    image
  );

  inner.appendChild(label);

  inner.appendChild(content);

  wrapper.appendChild(inner);

  messages.appendChild(wrapper);

  scrollBottom();
}


// =====================================================
// PDF GENERATION
// =====================================================

async function generatePDF() {

  const prompt =
    messageInput.value.trim();

  if (!prompt) {

    messageInput.focus();

    return;
  }

  welcome?.classList.add("hidden");

  addMessage(
    "user",
    "Create a PDF:\n\n" +
    prompt
  );

  messageInput.value = "";

  resizeTextarea();

  const loading =
    addLoadingMessage();

  try {

    const response =
      await fetch(
        API + "/v1/pdf",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            prompt,
            title:
              "LOGIC-LEAF Document"
          })
        }
      );

    loading.remove();

    const type =
      response.headers.get(
        "content-type"
      ) || "";

    if (
      response.ok &&
      type.includes("text/html")
    ) {

      const html =
        await response.text();

      showPDFResult(
        html
      );

      return;
    }

    const data =
      await safeJSON(response);

    addMessage(
      "ai",
      data.error ||
      "PDF generation failed."
    );

  } catch (error) {

    console.error(
      "PDF ERROR",
      error
    );

    loading.remove();

    addMessage(
      "ai",
      "PDF generation failed."
    );
  }
}


// =====================================================
// PDF RESULT
// =====================================================

function showPDFResult(
  html
) {

  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.className =
    "message ai";

  const inner =
    document.createElement(
      "div"
    );

  inner.className =
    "message-inner";

  const label =
    document.createElement(
      "div"
    );

  label.className =
    "message-label";

  label.textContent =
    APP_NAME;

  const content =
    document.createElement(
      "div"
    );

  content.className =
    "message-content";

  const text =
    document.createElement(
      "p"
    );

  text.textContent =
    "Your document is ready.";

  const button =
    document.createElement(
      "button"
    );

  button.className =
    "primary-btn";

  button.textContent =
    "Open PDF Document";

  button.onclick =
    () => {

      const blob =
        new Blob(
          [html],
          {
            type:
              "text/html;charset=utf-8"
          }
        );

      const url =
        URL.createObjectURL(blob);

      window.open(
        url,
        "_blank"
      );
    };

  content.appendChild(text);

  content.appendChild(button);

  inner.appendChild(label);

  inner.appendChild(content);

  wrapper.appendChild(inner);

  messages.appendChild(wrapper);

  scrollBottom();
}


// =====================================================
// MESSAGE UI
// =====================================================

function addMessage(
  role,
  text
) {

  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.className =
    `message ${role}`;

  const inner =
    document.createElement(
      "div"
    );

  inner.className =
    "message-inner";

  const label =
    document.createElement(
      "div"
    );

  label.className =
    "message-label";

  label.textContent =
    role === "user"
      ? "You"
      : APP_NAME;

  const content =
    document.createElement(
      "div"
    );

  content.className =
    "message-content";

  content.innerHTML =
    formatText(text);

  inner.appendChild(label);

  inner.appendChild(content);

  wrapper.appendChild(inner);

  messages.appendChild(wrapper);

  scrollBottom();

  return wrapper;
}


// =====================================================
// AI MESSAGE
// =====================================================

function addAIMessage(
  text,
  sources = []
) {

  const wrapper =
    addMessage(
      "ai",
      text
    );

  if (
    Array.isArray(sources) &&
    sources.length
  ) {

    const sourceBox =
      document.createElement(
        "div"
      );

    sourceBox.className =
      "sources";

    sources.forEach(
      source => {

        const item =
          document.createElement(
            "div"
          );

        item.className =
          "source";

        const name =
          source.source ||
          source.title ||
          "Indexed source";

        item.textContent =
          `Source ${source.id || ""}: ${name}`;

        sourceBox.appendChild(
          item
        );
      }
    );

    wrapper
      .querySelector(
        ".message-inner"
      )
      .appendChild(
        sourceBox
      );
  }

  return wrapper;
}


// =====================================================
// LOADING
// =====================================================

function addLoadingMessage() {

  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.className =
    "message ai";

  wrapper.innerHTML = `
    <div class="message-inner">

      <div class="message-label">
        ${APP_NAME}
      </div>

      <div class="message-content">
        <span class="thinking">
          Thinking
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </div>

    </div>
  `;

  messages.appendChild(wrapper);

  scrollBottom();

  return wrapper;
}


// =====================================================
// FORMAT RESPONSE
// =====================================================

function formatText(text) {

  let safe =
    escapeHTML(
      String(text ?? "")
    );

  // Code blocks
  safe =
    safe.replace(
      /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g,
      (_, language, code) => {

        const lang =
          language
            ? `<div class="code-language">${language}</div>`
            : "";

        return `
          <div class="code-block">
            ${lang}
            <pre><code>${code.trim()}</code></pre>
          </div>
        `;
      }
    );

  // Inline code
  safe =
    safe.replace(
      /`([^`]+)`/g,
      "<code>$1</code>"
    );

  // Bold
  safe =
    safe.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );

  // Headings
  safe =
    safe.replace(
      /^### (.+)$/gm,
      "<h4>$1</h4>"
    );

  safe =
    safe.replace(
      /^## (.+)$/gm,
      "<h3>$1</h3>"
    );

  safe =
    safe.replace(
      /^# (.+)$/gm,
      "<h2>$1</h2>"
    );

  // Bullets
  safe =
    safe.replace(
      /^\s*[-*]\s+(.+)$/gm,
      "<li>$1</li>"
    );

  safe =
    safe.replace(
      /(<li>.*<\/li>)/gs,
      "<ul>$1</ul>"
    );

  // Numbered lists
  safe =
    safe.replace(
      /^\s*\d+\.\s+(.+)$/gm,
      "<li>$1</li>"
    );

  // New lines
  safe =
    safe.replace(
      /\n/g,
      "<br>"
    );

  return safe;
}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(text) {

  return String(text)
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


// =====================================================
// SAFE JSON
// =====================================================

async function safeJSON(
  response
) {

  try {

    return await response.json();

  } catch {

    return {
      ok: false,
      error:
        `Server returned HTTP ${response.status}`
    };
  }
}


// =====================================================
// SCROLL
// =====================================================

function scrollBottom() {

  if (!chat) return;

  requestAnimationFrame(
    () => {

      chat.scrollTop =
        chat.scrollHeight;
    }
  );
}


// =====================================================
// AUTO RESIZE
// =====================================================

function resizeTextarea() {

  if (!messageInput) return;

  messageInput.style.height =
    "auto";

  messageInput.style.height =
    Math.min(
      messageInput.scrollHeight,
      180
    ) + "px";
}


// =====================================================
// QUICK PROMPTS
// =====================================================

document
  .querySelectorAll(
    ".quick-grid button"
  )
  .forEach(
    button => {

      button.onclick =
        () => {

          messageInput.value =
            button.dataset.prompt ||
            button.textContent.trim();

          resizeTextarea();

          messageInput.focus();
        };
    }
  );


// =====================================================
// AUTH BUTTON
// =====================================================

if (authButton) {

  authButton.onclick = () => {

    if (currentUser) {

      openModal(
        settingsModal
      );

    } else {

      openModal(
        authModal
      );
    }
  };
}


if (profileButton) {

  profileButton.onclick = () => {

    if (currentUser) {

      openModal(
        settingsModal
      );

    } else {

      openModal(
        authModal
      );
    }
  };
}


// =====================================================
// GOOGLE LOGIN
// =====================================================

if (googleAuth) {

  googleAuth.onclick =
    async () => {

      authStatus.textContent =
        "Opening Google...";

      try {

        const provider =
          new firebase.auth.GoogleAuthProvider();

        provider.setCustomParameters({
          prompt: "select_account"
        });

        await auth.signInWithPopup(
          provider
        );

        closeModal(
          authModal
        );

      } catch (error) {

        console.error(error);

        authStatus.textContent =
          firebaseAuthError(
            error
          );
      }
    };
}


// =====================================================
// EMAIL LOGIN / SIGNUP
// =====================================================

if (emailAuth) {

  emailAuth.onclick =
    async () => {

      const email =
        authEmail.value.trim();

      const password =
        authPassword.value;

      if (!email || !password) {

        authStatus.textContent =
          "Enter your email and password.";

        return;
      }

      authStatus.textContent =
        "Please wait...";

      try {

        if (
          authMode === "login"
        ) {

          await auth
            .signInWithEmailAndPassword(
              email,
              password
            );

        } else {

          await auth
            .createUserWithEmailAndPassword(
              email,
              password
            );
        }

        authStatus.textContent =
          "";

        closeModal(
          authModal
        );

      } catch (error) {

        console.error(error);

        authStatus.textContent =
          firebaseAuthError(
            error
          );
      }
    };
}


// =====================================================
// SWITCH LOGIN / SIGNUP
// =====================================================

if (switchAuth) {

  switchAuth.onclick =
    () => {

      if (
        authMode === "login"
      ) {

        authMode = "signup";

        authTitle.textContent =
          "Create your account";

        authSubtitle.textContent =
          "Start using LOGIC-LEAF";

        emailAuth.textContent =
          "Create account";

        switchAuth.textContent =
          "Already have an account? Sign in";

      } else {

        authMode = "login";

        authTitle.textContent =
          "Welcome to LOGIC-LEAF";

        authSubtitle.textContent =
          "Sign in to continue";

        emailAuth.textContent =
          "Sign in";

        switchAuth.textContent =
          "Create an account";
      }
    };
}


// =====================================================
// FIREBASE AUTH STATE
// =====================================================

auth.onAuthStateChanged(
  async user => {

    currentUser = user;

    if (user) {

      const name =
        user.displayName ||
        user.email?.split("@")[0] ||
        "User";

      if (accountName) {
        accountName.textContent =
          name;
      }

      if (accountEmail) {
        accountEmail.textContent =
          user.email || "";
      }

      if (avatar) {
        avatar.textContent =
          name
            .charAt(0)
            .toUpperCase();
      }

      if (profileButton) {
        profileButton.textContent =
          name
            .charAt(0)
            .toUpperCase();
      }

      if (authButton) {
        authButton.textContent =
          "Account";
      }

      await loadHistory();

    } else {

      if (accountName) {
        accountName.textContent =
          "Guest";
      }

      if (accountEmail) {
        accountEmail.textContent =
          "Not signed in";
      }

      if (avatar) {
        avatar.textContent =
          "?";
      }

      if (profileButton) {
        profileButton.textContent =
          "?";
      }

      if (authButton) {
        authButton.textContent =
          "Sign in";
      }
    }
  }
);


// =====================================================
// HISTORY
// =====================================================

async function loadHistory() {

  if (!currentUser) return;

  try {

    const response =
      await fetch(
        API + "/v1/history",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            userId:
              currentUser.uid
          })
        }
      );

    const data =
      await safeJSON(response);

    chatHistory.innerHTML = "";

    if (
      !data.ok ||
      !Array.isArray(data.chats)
    ) {
      return;
    }

    data.chats.forEach(
      chatItem => {

        const item =
          document.createElement(
            "div"
          );

        item.className =
          "history-item";

        item.textContent =
          chatItem.title ||
          "New conversation";

        item.onclick =
          () => {

            loadConversation(
              chatItem.conversation_id
            );
          };

        chatHistory.appendChild(
          item
        );
      }
    );

  } catch (error) {

    console.error(
      "HISTORY ERROR",
      error
    );
  }
}


// =====================================================
// LOAD CONVERSATION
// =====================================================

async function loadConversation(
  conversationId
) {

  try {

    const response =
      await fetch(
        API + "/v1/conversation",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            conversationId
          })
        }
      );

    const data =
      await safeJSON(response);

    if (!data.ok) return;

    currentConversation =
      conversationId;

    messages.innerHTML = "";

    welcome?.classList.add(
      "hidden"
    );

    if (
      Array.isArray(data.messages)
    ) {

      data.messages.forEach(
        message => {

          addMessage(
            message.role ===
              "assistant"
              ? "ai"
              : "user",
            message.content
          );
        }
      );
    }

    if (window.innerWidth < 700) {

      sidebar.classList.add(
        "closed"
      );
    }

  } catch (error) {

    console.error(
      "CONVERSATION ERROR",
      error
    );
  }
}


// =====================================================
// HISTORY SEARCH
// =====================================================

if (chatSearch) {

  chatSearch.oninput =
    () => {

      const query =
        chatSearch.value
          .toLowerCase()
          .trim();

      document
        .querySelectorAll(
          ".history-item"
        )
        .forEach(
          item => {

            item.style.display =
              item.textContent
                .toLowerCase()
                .includes(query)
                ? ""
                : "none";
          }
        );
    };
}


// =====================================================
// API KEY
// =====================================================

if (apiButton) {

  apiButton.onclick =
    () => {

      if (apiOutput) {
        apiOutput.textContent = "";
      }

      openModal(
        apiModal
      );
    };
}


if (createApiKey) {

  createApiKey.onclick =
    async () => {

      if (!currentUser) {

        apiOutput.textContent =
          "Please sign in first.";

        return;
      }

      apiOutput.textContent =
        "Creating API key...";

      try {

        const token =
          await currentUser.getIdToken();

        const response =
          await fetch(
            API + "/v1/keys/create",
            {
              method: "POST",

              headers: {
                Authorization:
                  "Bearer " + token
              }
            }
          );

        const data =
          await safeJSON(response);

        if (!data.ok) {

          apiOutput.textContent =
            data.error ||
            "Could not create API key.";

          return;
        }

        apiOutput.textContent =
          data.apiKey;

      } catch (error) {

        console.error(error);

        apiOutput.textContent =
          "Could not create API key.";
      }
    };
}


// =====================================================
// SETTINGS
// =====================================================

if (settingsButton) {

  settingsButton.onclick =
    () => {

      openModal(
        settingsModal
      );
    };
}


// =====================================================
// LOGOUT
// =====================================================

if (logoutButton) {

  logoutButton.onclick =
    async () => {

      try {

        await auth.signOut();

        closeModal(
          settingsModal
        );

        newChat?.click();

      } catch (error) {

        console.error(error);
      }
    };
}


// =====================================================
// MODALS
// =====================================================

document
  .querySelectorAll(
    "[data-close]"
  )
  .forEach(
    button => {

      button.onclick =
        () => {

          const modal =
            document.getElementById(
              button.dataset.close
            );

          if (modal) {
            closeModal(modal);
          }
        };
    }
  );


function openModal(
  element
) {

  if (!element) return;

  element.classList.remove(
    "hidden"
  );
}


function closeModal(
  element
) {

  if (!element) return;

  element.classList.add(
    "hidden"
  );
}


// =====================================================
// ESCAPE TO CLOSE MODAL
// =====================================================

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key !== "Escape"
    ) {
      return;
    }

    document
      .querySelectorAll(
        ".modal:not(.hidden)"
      )
      .forEach(
        modal => {
          closeModal(modal);
        }
      );
  }
);


// =====================================================
// CLOSE MOBILE SIDEBAR
// =====================================================

const main =
  document.querySelector(".main");

if (main) {

  main.addEventListener(
    "click",
    () => {

      if (
        window.innerWidth < 700
      ) {

        sidebar?.classList.add(
          "closed"
        );
      }
    }
  );
}


// =====================================================
// FIREBASE ERROR MESSAGES
// =====================================================

function firebaseAuthError(
  error
) {

  const code =
    error?.code || "";

  const messages = {

    "auth/popup-closed-by-user":
      "Google sign-in was cancelled.",

    "auth/popup-blocked":
      "Your browser blocked the Google sign-in window.",

    "auth/unauthorized-domain":
      "This website domain is not authorized in Firebase.",

    "auth/invalid-credential":
      "The login credentials are invalid.",

    "auth/user-not-found":
      "No account was found with this email.",

    "auth/wrong-password":
      "Incorrect password.",

    "auth/email-already-in-use":
      "An account already exists with this email.",

    "auth/weak-password":
      "Please use a stronger password.",

    "auth/invalid-email":
      "Please enter a valid email address."
  };

  return (
    messages[code] ||
    error?.message ||
    "Authentication failed."
  );
}


// =====================================================
// INITIAL STATE
// =====================================================

if (
  window.innerWidth < 700
) {

  sidebar?.classList.add(
    "closed"
  );
}

resizeTextarea();

console.log(
  `%c${APP_NAME} frontend loaded`,
  "font-weight:bold"
);
