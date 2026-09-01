// =====================================================
// LOGIC-LEAF — COMPLETE FRONTEND APP.JS
// =====================================================

const API = "https://logic-leaf.qtmkiller6.workers.dev";


// =====================================================
// FIREBASE
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
// DOM
// =====================================================

const $ = id => document.getElementById(id);

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

const attachButton = $("attachButton");
const fileInput = $("fileInput");
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
// STATE
// =====================================================

let searchMode = false;
let authMode = "login";

let currentUser = null;

let currentConversation =
  crypto.randomUUID();

let selectedFile = null;

let conversationMessages = [];


// =====================================================
// SIDEBAR
// =====================================================

if (openSidebar) {
  openSidebar.onclick = () => {
    sidebar?.classList.remove("closed");
  };
}

if (closeSidebar) {
  closeSidebar.onclick = () => {
    sidebar?.classList.add("closed");
  };
}


// =====================================================
// NEW CHAT
// =====================================================

if (newChat) {
  newChat.onclick = () => {

    currentConversation =
      crypto.randomUUID();

    conversationMessages = [];

    if (messages) {
      messages.innerHTML = "";
    }

    if (welcome) {
      welcome.classList.remove("hidden");
    }

    clearAttachment();

    messageInput?.focus();

    if (window.innerWidth < 700) {
      sidebar?.classList.add("closed");
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
  sendButton.onclick = sendMessage;
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
    messageInput?.value.trim();

  if (!text && !selectedFile) {
    return;
  }

  const file = selectedFile;

  const displayText =
    text ||
    `Please analyze this file: ${file?.name || ""}`;

  messageInput.value = "";

  resizeTextarea();

  welcome?.classList.add("hidden");

  addMessage(
    "user",
    displayText
  );

  sendButton.disabled = true;

  const loading =
    addLoadingMessage();

  try {

    let data;

    // -------------------------------------------------
    // FILE / IMAGE
    // -------------------------------------------------

    if (file) {

      data =
        await sendFileToWorker(
          file,
          text
        );

      clearAttachment();

    }

    // -------------------------------------------------
    // NORMAL CHAT
    // -------------------------------------------------

    else {

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

              search:
                searchMode,

              userId,

              conversationId:
                currentConversation,

              history:
                conversationMessages.slice(-20)

            })
          }
        );

      data =
        await safeJSON(response);

      if (!response.ok) {

        throw new Error(
          data?.error ||
          "Server error"
        );
      }
    }

    loading.remove();

    if (!data?.ok) {

      addMessage(
        "ai",
        data?.error ||
        "I couldn't process that request."
      );

      return;
    }

    const answer =
      data.answer ||
      data.response ||
      "I couldn't generate a response.";

    addAIMessage(
      answer,
      data.sources || []
    );

    conversationMessages.push(
      {
        role: "user",
        content: displayText
      },
      {
        role: "assistant",
        content: answer
      }
    );

    loadHistory();

  } catch (error) {

    loading.remove();

    console.error(
      "CHAT ERROR:",
      error
    );

    addMessage(
      "ai",
      "Connection error.\n\n" +
      (error?.message ||
        "Please check the Worker.")
    );

  } finally {

    sendButton.disabled = false;

    messageInput?.focus();
  }
}


// =====================================================
// FILE SEND
// =====================================================

async function sendFileToWorker(
  file,
  userMessage
) {

  const isImage =
    file.type.startsWith("image/");

  const isPDF =
    file.type === "application/pdf" ||
    /\.pdf$/i.test(file.name);

  const isText =
    file.type.startsWith("text/") ||
    /\.(js|css|html|py|java|cpp|c|md|json|csv|xml|txt)$/i
      .test(file.name);

  // ---------------------------------------------------
  // TEXT / CODE FILE
  // ---------------------------------------------------

  if (isText) {

    const content =
      await file.text();

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

            message:
              `${userMessage || "Analyze this file."}

FILE NAME:
${file.name}

FILE CONTENT:
${content}`,

            search:
              searchMode,

            userId:
              currentUser?.uid ||
              "anonymous",

            conversationId:
              currentConversation,

            history:
              conversationMessages.slice(-20)
          })
        }
      );

    return safeJSON(response);
  }


  // ---------------------------------------------------
  // IMAGE / CAMERA PHOTO
  // ---------------------------------------------------

  if (isImage) {

    const base64 =
      await fileToBase64(file);

    const response =
      await fetch(
        API + "/v1/vision",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            message:
              userMessage ||
              "Analyze this image carefully.",

            image:
              base64,

            fileName:
              file.name,

            userId:
              currentUser?.uid ||
              "anonymous",

            conversationId:
              currentConversation
          })
        }
      );

    return safeJSON(response);
  }


  // ---------------------------------------------------
  // PDF
  // ---------------------------------------------------

  if (isPDF) {

    const base64 =
      await fileToBase64(file);

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

            action: "analyze",

            message:
              userMessage ||
              "Analyze this PDF.",

            file:
              base64,

            fileName:
              file.name,

            userId:
              currentUser?.uid ||
              "anonymous",

            conversationId:
              currentConversation
          })
        }
      );

    return safeJSON(response);
  }


  throw new Error(
    "This file type is not supported."
  );
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
    messageInput?.value.trim();

  if (!prompt) {

    messageInput?.focus();

    return;
  }

  messageInput.value = "";

  resizeTextarea();

  welcome?.classList.add(
    "hidden"
  );

  addMessage(
    "user",
    "Generate an image: " +
    prompt
  );

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
    // REAL IMAGE
    // -----------------------------------------------

    if (
      response.ok &&
      type.includes("image/")
    ) {

      const blob =
        await response.blob();

      const imageURL =
        URL.createObjectURL(blob);

      const wrapper =
        addMessage(
          "ai",
          "Generated image"
        );

      const image =
        document.createElement("img");

      image.src = imageURL;

      image.alt =
        "Generated by LOGIC-LEAF";

      image.style.width =
        "100%";

      image.style.maxWidth =
        "720px";

      image.style.display =
        "block";

      image.style.borderRadius =
        "16px";

      image.style.marginTop =
        "12px";

      wrapper
        .querySelector(
          ".message-inner"
        )
        ?.appendChild(image);

      return;
    }

    // -----------------------------------------------
    // JSON ERROR / RESPONSE
    // -----------------------------------------------

    const data =
      await safeJSON(response);

    if (!response.ok || !data?.ok) {

      addMessage(
        "ai",
        data?.error ||
        "Image generation is unavailable. Check the Cloudflare AI image model/binding."
      );

      return;
    }

    if (data.image) {

      const wrapper =
        addMessage(
          "ai",
          "Generated image"
        );

      const image =
        document.createElement("img");

      image.src =
        data.image;

      image.style.width =
        "100%";

      image.style.maxWidth =
        "720px";

      image.style.borderRadius =
        "16px";

      image.style.marginTop =
        "12px";

      wrapper
        .querySelector(
          ".message-inner"
        )
        ?.appendChild(image);

      return;
    }

    addMessage(
      "ai",
      data.answer ||
      "The image model returned no image."
    );

  } catch (error) {

    loading.remove();

    console.error(
      "IMAGE ERROR:",
      error
    );

    addMessage(
      "ai",
      "Image generation failed.\n\n" +
      error.message
    );
  }
}


// =====================================================
// FILE BUTTON
// =====================================================

if (attachButton) {

  attachButton.onclick = () => {

    fileInput?.click();
  };
}


// =====================================================
// FILE INPUT
// =====================================================

if (fileInput) {

  fileInput.onchange =
    event => {

      const file =
        event.target.files?.[0];

      if (!file) return;

      selectedFile = file;

      showFilePreview(file);

      // Do NOT automatically dump the file
      // into the text box.
      //
      // This allows:
      // - PDF upload
      // - image upload
      // - camera image
      // - code files
      // - normal documents
    };
}


// =====================================================
// FILE PREVIEW
// =====================================================

function showFilePreview(file) {

  if (!filePreview) return;

  filePreview.classList.remove(
    "hidden"
  );

  filePreview.innerHTML = "";

  const wrapper =
    document.createElement("div");

  wrapper.style.display =
    "flex";

  wrapper.style.alignItems =
    "center";

  wrapper.style.gap =
    "8px";

  const name =
    document.createElement("span");

  name.textContent =
    `Attached: ${file.name}`;

  const remove =
    document.createElement("button");

  remove.type = "button";

  remove.textContent = "×";

  remove.style.border = "0";

  remove.style.background =
    "transparent";

  remove.style.color =
    "inherit";

  remove.style.cursor =
    "pointer";

  remove.onclick =
    clearAttachment;

  wrapper.appendChild(name);
  wrapper.appendChild(remove);

  filePreview.appendChild(wrapper);
}


// =====================================================
// CLEAR FILE
// =====================================================

function clearAttachment() {

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
// CAMERA SUPPORT
// =====================================================
//
// Your HTML camera button should use:
// id="cameraButton"
// and the hidden input:
//
// <input
//   id="cameraInput"
//   type="file"
//   accept="image/*"
//   capture="environment"
// >
//

const cameraButton =
  $("cameraButton");

const cameraInput =
  $("cameraInput");

if (cameraButton) {

  cameraButton.onclick = () => {

    cameraInput?.click();
  };
}

if (cameraInput) {

  cameraInput.onchange =
    event => {

      const file =
        event.target.files?.[0];

      if (!file) return;

      selectedFile = file;

      showFilePreview(file);
    };
}


// =====================================================
// PDF GENERATION
// =====================================================
//
// HTML should contain:
// id="pdfButton"
//

const pdfButton =
  $("pdfButton");

if (pdfButton) {

  pdfButton.onclick =
    generatePDF;
}


async function generatePDF() {

  const prompt =
    messageInput?.value.trim();

  if (!prompt) {

    messageInput?.focus();

    return;
  }

  messageInput.value = "";

  resizeTextarea();

  welcome?.classList.add(
    "hidden"
  );

  addMessage(
    "user",
    "Create PDF: " +
    prompt
  );

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

            action:
              "generate",

            prompt,

            title:
              "LOGIC-LEAF Document",

            userId:
              currentUser?.uid ||
              "anonymous"
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

      const wrapper =
        addMessage(
          "ai",
          "PDF document created."
        );

      const button =
        document.createElement(
          "a"
        );

      button.href = url;

      button.download =
        "logic-leaf-document.html";

      button.textContent =
        "Open document";

      button.style.display =
        "inline-block";

      button.style.marginTop =
        "12px";

      wrapper
        .querySelector(
          ".message-inner"
        )
        ?.appendChild(button);

      return;
    }

    const data =
      await safeJSON(response);

    addMessage(
      "ai",
      data?.answer ||
      data?.error ||
      "PDF generation failed."
    );

  } catch (error) {

    loading.remove();

    addMessage(
      "ai",
      "PDF generation failed.\n\n" +
      error.message
    );
  }
}


// =====================================================
// MESSAGE RENDERING
// =====================================================

function addMessage(
  role,
  text
) {

  const wrapper =
    document.createElement("div");

  wrapper.className =
    `message ${role}`;

  const inner =
    document.createElement("div");

  inner.className =
    "message-inner";

  const label =
    document.createElement("div");

  label.className =
    "message-label";

  label.textContent =
    role === "user"
      ? "You"
      : "LOGIC-LEAF";

  const content =
    document.createElement("div");

  content.className =
    "message-content";

  content.innerHTML =
    formatText(text);

  inner.appendChild(label);

  inner.appendChild(content);

  wrapper.appendChild(inner);

  messages?.appendChild(wrapper);

  scrollBottom();

  return wrapper;
}


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

        const title =
          source.source ||
          source.title ||
          "Indexed source";

        item.textContent =
          `Source ${source.id || ""}: ${title}`;

        if (source.url) {

          item.style.cursor =
            "pointer";

          item.title =
            source.url;

          item.onclick = () => {

            window.open(
              source.url,
              "_blank",
              "noopener"
            );
          };
        }

        sourceBox.appendChild(
          item
        );
      }
    );

    wrapper
      .querySelector(
        ".message-inner"
      )
      ?.appendChild(
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
        LOGIC-LEAF
      </div>

      <div class="message-content">
        <span class="thinking-dots">
          Thinking...
        </span>
      </div>
    </div>
  `;

  messages?.appendChild(
    wrapper
  );

  scrollBottom();

  return wrapper;
}


// =====================================================
// MARKDOWN FORMATTER
// =====================================================

function formatText(text) {

  let safe =
    escapeHTML(
      String(text ?? "")
    );

  // Code blocks
  safe =
    safe.replace(
      /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g,
      (_, language, code) => {

        const lang =
          language
            ? `<div style="font-size:10px;opacity:.6;margin-bottom:7px">${language}</div>`
            : "";

        return `
          <pre>${lang}<code>${code}</code></pre>
        `;
      }
    );

  // Bold
  safe =
    safe.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );

  // Inline code
  safe =
    safe.replace(
      /`([^`]+)`/g,
      "<code>$1</code>"
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

  // Bullet points
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
// TEXTAREA
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
// SCROLL
// =====================================================

function scrollBottom() {

  if (!chat) return;

  chat.scrollTop =
    chat.scrollHeight;
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

      button.onclick = () => {

        if (!messageInput) return;

        messageInput.value =
          button.dataset.prompt ||
          button.textContent.trim();

        resizeTextarea();

        messageInput.focus();
      };
    }
  );


// =====================================================
// CHAT HISTORY
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

    if (!data?.ok) return;

    if (!chatHistory) return;

    chatHistory.innerHTML = "";

    (data.chats || [])
      .forEach(
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
            () =>
              loadConversation(
                chatItem.conversation_id
              );

          chatHistory.appendChild(
            item
          );
        }
      );

  } catch (error) {

    console.warn(
      "History unavailable:",
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

    if (!data?.ok) return;

    currentConversation =
      conversationId;

    conversationMessages = [];

    messages.innerHTML = "";

    welcome?.classList.add(
      "hidden"
    );

    (data.messages || [])
      .forEach(
        message => {

          const role =
            message.role ===
            "assistant"
              ? "ai"
              : "user";

          addMessage(
            role,
            message.content
          );

          conversationMessages.push({
            role:
              message.role,
            content:
              message.content
          });
        }
      );

    if (window.innerWidth < 700) {

      sidebar?.classList.add(
        "closed"
      );
    }

  } catch (error) {

    console.error(
      "Conversation error:",
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
// AUTH
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

        await auth.signInWithPopup(
          provider
        );

        closeModal(
          authModal
        );

      } catch (error) {

        console.error(
          error
        );

        authStatus.textContent =
          error.message;
      }
    };
}


// =====================================================
// EMAIL LOGIN
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
          "Enter email and password.";

        return;
      }

      authStatus.textContent =
        "Please wait...";

      try {

        if (
          authMode === "login"
        ) {

          await auth.signInWithEmailAndPassword(
            email,
            password
          );

        } else {

          await auth.createUserWithEmailAndPassword(
            email,
            password
          );
        }

        closeModal(
          authModal
        );

        authStatus.textContent =
          "";

      } catch (error) {

        authStatus.textContent =
          error.message;
      }
    };
}


// =====================================================
// SWITCH AUTH
// =====================================================

if (switchAuth) {

  switchAuth.onclick =
    () => {

      if (
        authMode === "login"
      ) {

        authMode =
          "signup";

        authTitle.textContent =
          "Create your account";

        authSubtitle.textContent =
          "Start using LOGIC-LEAF";

        emailAuth.textContent =
          "Create account";

        switchAuth.textContent =
          "Already have an account? Sign in";

      } else {

        authMode =
          "login";

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
// AUTH STATE
// =====================================================

auth.onAuthStateChanged(
  async user => {

    currentUser =
      user;

    if (user) {

      const name =
        user.displayName ||
        user.email?.split("@")[0] ||
        "User";

      if (accountName)
        accountName.textContent =
          name;

      if (accountEmail)
        accountEmail.textContent =
          user.email || "";

      if (avatar)
        avatar.textContent =
          name.charAt(0).toUpperCase();

      if (profileButton)
        profileButton.textContent =
          name.charAt(0).toUpperCase();

      if (authButton)
        authButton.textContent =
          "Account";

      await loadHistory();

    } else {

      if (accountName)
        accountName.textContent =
          "Guest";

      if (accountEmail)
        accountEmail.textContent =
          "Not signed in";

      if (avatar)
        avatar.textContent = "?";

      if (profileButton)
        profileButton.textContent = "?";

      if (authButton)
        authButton.textContent =
          "Sign in";
    }
  }
);


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

        if (!data?.ok) {

          apiOutput.textContent =
            data?.error ||
            "Could not create API key.";

          return;
        }

        apiOutput.textContent =
          data.apiKey;

      } catch (error) {

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

      await auth.signOut();

      closeModal(
        settingsModal
      );

      newChat?.click();
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

          closeModal(
            document.getElementById(
              button.dataset.close
            )
          );
        };
    }
  );


function openModal(element) {

  if (!element) return;

  element.classList.remove(
    "hidden"
  );
}


function closeModal(element) {

  if (!element) return;

  element.classList.add(
    "hidden"
  );
}


// =====================================================
// CLOSE MOBILE SIDEBAR
// =====================================================

document
  .querySelector(".main")
  ?.addEventListener(
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


// =====================================================
// FILE TO BASE64
// =====================================================

function fileToBase64(file) {

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();

      reader.onload =
        () => {

          resolve(
            reader.result
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


// =====================================================
// SAFE JSON
// =====================================================

async function safeJSON(
  response
) {

  const type =
    response.headers.get(
      "content-type"
    ) || "";

  if (
    type.includes(
      "application/json"
    )
  ) {

    return response.json();
  }

  const text =
    await response.text();

  return {
    ok: response.ok,
    answer: text
  };
}


// =====================================================
// STARTUP
// =====================================================

console.log(
  "LOGIC-LEAF frontend loaded."
);

console.log(
  "API:",
  API
);
