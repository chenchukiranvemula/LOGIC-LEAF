// =====================================================
// LOGIC-LEAF APP.JS
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

const sidebar = document.getElementById("sidebar");
const openSidebar = document.getElementById("openSidebar");
const closeSidebar = document.getElementById("closeSidebar");
const newChat = document.getElementById("newChat");

const messageInput =
  document.getElementById("messageInput");

const sendButton =
  document.getElementById("sendButton");

const messages =
  document.getElementById("messages");

const welcome =
  document.getElementById("welcome");

const chat =
  document.getElementById("chat");

const searchToggle =
  document.getElementById("searchToggle");

const searchIndicator =
  document.getElementById("searchIndicator");

const fileInput =
  document.getElementById("fileInput");

const cameraInput =
  document.getElementById("cameraInput");

const attachButton =
  document.getElementById("attachButton");

const cameraButton =
  document.getElementById("cameraButton");

const filePreview =
  document.getElementById("filePreview");

const imageButton =
  document.getElementById("imageButton");

const pdfButton =
  document.getElementById("pdfButton");

const chatHistory =
  document.getElementById("chatHistory");

const chatSearch =
  document.getElementById("chatSearch");

const authModal =
  document.getElementById("authModal");

const apiModal =
  document.getElementById("apiModal");

const settingsModal =
  document.getElementById("settingsModal");

const authEmail =
  document.getElementById("authEmail");

const authPassword =
  document.getElementById("authPassword");

const emailAuth =
  document.getElementById("emailAuth");

const googleAuth =
  document.getElementById("googleAuth");

const switchAuth =
  document.getElementById("switchAuth");

const authTitle =
  document.getElementById("authTitle");

const authSubtitle =
  document.getElementById("authSubtitle");

const authStatus =
  document.getElementById("authStatus");

const authButton =
  document.getElementById("authButton");

const accountName =
  document.getElementById("accountName");

const accountEmail =
  document.getElementById("accountEmail");

const avatar =
  document.getElementById("avatar");

const profileButton =
  document.getElementById("profileButton");

const apiButton =
  document.getElementById("apiButton");

const settingsButton =
  document.getElementById("settingsButton");

const logoutButton =
  document.getElementById("logoutButton");

const createApiKey =
  document.getElementById("createApiKey");

const apiOutput =
  document.getElementById("apiOutput");


// =====================================================
// STATE
// =====================================================

let searchMode = false;

let authMode = "login";

let currentUser = null;

let currentConversation =
  crypto.randomUUID();

let selectedFile = null;

let busy = false;


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

    messages.appendChild(
      welcome
    );

    welcome.classList.remove(
      "hidden"
    );

    messageInput.value = "";

    clearAttachment();

    resizeTextarea();

    messageInput.focus();

    if (window.innerWidth < 700) {
      sidebar.classList.add(
        "closed"
      );
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

    if (searchIndicator) {
      searchIndicator.classList.toggle(
        "hidden",
        !searchMode
      );
    }
  };
}


// =====================================================
// SEND BUTTON
// =====================================================

if (sendButton) {
  sendButton.onclick = sendMessage;
}


// =====================================================
// ENTER
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

  if (busy) return;

  const text =
    messageInput.value.trim();

  if (!text && !selectedFile) return;

  busy = true;

  sendButton.disabled = true;

  welcome.classList.add("hidden");


  // ==========================================
  // FILE / IMAGE
  // ==========================================

  if (selectedFile) {

    const file =
      selectedFile;

    const prompt =
      text ||
      `Analyze this file: ${file.name}`;


    addMessage(
      "user",
      prompt,
      file
    );

    messageInput.value = "";

    resizeTextarea();


    const loading =
      addLoadingMessage();


    try {

      const result =
        await analyzeFile(
          file,
          prompt
        );

      loading.remove();

      if (!result.ok) {

        addMessage(
          "ai",
          result.error ||
          "Unable to analyze the file."
        );

      } else {

        addAIMessage(
          result.answer ||
          "No answer returned.",
          result.sources || []
        );
      }

    } catch (error) {

      loading.remove();

      addMessage(
        "ai",
        "File analysis failed. Please try again."
      );

    } finally {

      clearAttachment();

      busy = false;

      sendButton.disabled = false;

      messageInput.focus();
    }

    return;
  }


  // ==========================================
  // NORMAL CHAT
  // ==========================================

  messageInput.value = "";

  resizeTextarea();

  addMessage(
    "user",
    text
  );


  const loading =
    addLoadingMessage();


  try {

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
              currentConversation

          })
        }
      );


    const data =
      await response.json();


    loading.remove();


    if (!response.ok || !data.ok) {

      addMessage(
        "ai",
        data.error ||
        "The AI could not process your request."
      );

      return;
    }


    addAIMessage(
      data.answer,
      data.sources || []
    );


    if (currentUser) {
      loadHistory();
    }


  } catch (error) {

    loading.remove();

    addMessage(
      "ai",
      "Connection error. Please check that the LOGIC-LEAF Worker is deployed."
    );

  } finally {

    busy = false;

    sendButton.disabled = false;

    messageInput.focus();
  }
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
// ADD MESSAGE
// =====================================================

function addMessage(
  role,
  text,
  file = null
) {

  const wrapper =
    document.createElement("div");

  wrapper.className =
    "message " + role;


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


  // ==========================================
  // ATTACHED FILE PREVIEW
  // ==========================================

  if (file) {

    const attachment =
      document.createElement("div");

    attachment.className =
      "message-attachment";


    const icon =
      document.createElement("span");

    icon.textContent =
      getFileIcon(file);


    const name =
      document.createElement("span");

    name.textContent =
      file.name;


    attachment.appendChild(icon);

    attachment.appendChild(name);

    inner.appendChild(
      attachment
    );


    // Image preview

    if (
      file.type &&
      file.type.startsWith("image/")
    ) {

      const image =
        document.createElement("img");

      image.className =
        "user-image-preview";

      image.src =
        URL.createObjectURL(file);

      image.alt =
        file.name;

      inner.appendChild(image);
    }
  }


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
      document.createElement("div");

    sourceBox.className =
      "sources";


    const heading =
      document.createElement("div");

    heading.className =
      "sources-title";

    heading.textContent =
      "Sources";

    sourceBox.appendChild(
      heading
    );


    sources.forEach(
      source => {

        const item =
          document.createElement("div");

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

          item.onclick =
            () => {

              window.open(
                source.url,
                "_blank",
                "noopener,noreferrer"
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
    document.createElement("div");

  wrapper.className =
    "message ai loading-message";


  wrapper.innerHTML = `

    <div class="message-inner">

      <div class="message-label">
        LOGIC-LEAF
      </div>

      <div class="message-content">

        <div class="thinking">
          <span></span>
          <span></span>
          <span></span>
        </div>

      </div>

    </div>

  `;


  messages.appendChild(wrapper);

  scrollBottom();


  return wrapper;
}


// =====================================================
// TEXT FORMATTER
// =====================================================

function formatText(text) {

  let safe =
    escapeHTML(
      String(text || "")
    );


  // Code blocks

  safe =
    safe.replace(
      /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g,
      (_, language, code) => {

        const lang =
          language || "code";

        return `
          <div class="code-block">

            <div class="code-language">
              ${escapeHTML(lang)}
            </div>

            <pre><code>${code}</code></pre>

          </div>
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


  // Newlines

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

      button.onclick =
        () => {

          messageInput.value =
            button.dataset.prompt ||
            "";

          resizeTextarea();

          messageInput.focus();
        };
    }
  );


// =====================================================
// ATTACH FILE
// =====================================================

if (attachButton) {

  attachButton.onclick =
    () => {

      fileInput.click();

    };
}


// =====================================================
// CAMERA
// =====================================================

if (cameraButton) {

  cameraButton.onclick =
    () => {

      cameraInput.click();

    };
}


// =====================================================
// CAMERA RESULT
// =====================================================

if (cameraInput) {

  cameraInput.onchange =
    event => {

      const file =
        event.target.files[0];

      if (!file) return;

      selectFile(file);

    };
}


// =====================================================
// FILE RESULT
// =====================================================

if (fileInput) {

  fileInput.onchange =
    event => {

      const file =
        event.target.files[0];

      if (!file) return;

      selectFile(file);

    };
}


// =====================================================
// SELECT FILE
// =====================================================

function selectFile(file) {

  selectedFile =
    file;


  if (filePreview) {

    filePreview.innerHTML = `

      <div class="selected-file">

        <span>
          ${escapeHTML(
            getFileIcon(file)
          )}
        </span>

        <strong>
          ${escapeHTML(file.name)}
        </strong>

        <small>
          ${formatBytes(file.size)}
        </small>

        <button
          type="button"
          id="removeAttachment"
          aria-label="Remove attachment"
        >
          ×
        </button>

      </div>

    `;


    const remove =
      document.getElementById(
        "removeAttachment"
      );


    if (remove) {

      remove.onclick =
        clearAttachment;

    }
  }


  // Image files

  if (
    file.type &&
    file.type.startsWith("image/")
  ) {

    messageInput.placeholder =
      "Ask LOGIC-LEAF about this image...";

  } else {

    messageInput.placeholder =
      "Ask LOGIC-LEAF about this file...";
  }


  messageInput.focus();
}


// =====================================================
// CLEAR FILE
// =====================================================

function clearAttachment() {

  selectedFile =
    null;


  if (filePreview) {

    filePreview.innerHTML =
      "";

  }


  if (fileInput) {

    fileInput.value =
      "";

  }


  if (cameraInput) {

    cameraInput.value =
      "";

  }


  if (messageInput) {

    messageInput.placeholder =
      "Message LOGIC-LEAF...";

  }
}


// =====================================================
// FILE ICON
// =====================================================

function getFileIcon(file) {

  if (
    file.type &&
    file.type.startsWith("image/")
  ) {
    return "IMAGE";
  }

  if (
    file.name
      .toLowerCase()
      .endsWith(".pdf")
  ) {
    return "PDF";
  }

  if (
    file.name
      .match(
        /\.(js|ts|jsx|tsx|py|java|cpp|c|html|css)$/i
      )
  ) {
    return "CODE";
  }

  return "FILE";
}


// =====================================================
// FILE SIZE
// =====================================================

function formatBytes(bytes) {

  if (!bytes) return "0 B";

  const units =
    [
      "B",
      "KB",
      "MB",
      "GB"
    ];

  const index =
    Math.floor(
      Math.log(bytes) /
      Math.log(1024)
    );

  return (
    Math.round(
      bytes /
      Math.pow(
        1024,
        index
      ) * 10
    ) / 10
  ) + " " +
  units[index];
}


// =====================================================
// FILE / VISION ANALYSIS
// =====================================================

async function analyzeFile(
  file,
  prompt
) {

  const isImage =
    file.type &&
    file.type.startsWith("image/");


  const isPDF =
    file.name
      .toLowerCase()
      .endsWith(".pdf");


  // ==========================================
  // IMAGE → VISION
  // ==========================================

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

            image:
              base64,

            prompt,

            userId:
              currentUser
                ? currentUser.uid
                : "anonymous",

            conversationId:
              currentConversation

          })
        }
      );


    return await safeJSON(
      response
    );
  }


  // ==========================================
  // PDF
  // ==========================================

  if (isPDF) {

    const base64 =
      await fileToBase64(file);


    const response =
      await fetch(
        API + "/v1/file",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            filename:
              file.name,

            mimeType:
              file.type,

            data:
              base64,

            prompt,

            userId:
              currentUser
                ? currentUser.uid
                : "anonymous",

            conversationId:
              currentConversation

          })
        }
      );


    return await safeJSON(
      response
    );
  }


  // ==========================================
  // TEXT / CODE FILE
  // ==========================================

  const text =
    await file.text();


  const response =
    await fetch(
      API + "/v1/file",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

          filename:
            file.name,

          mimeType:
            file.type ||
            "text/plain",

          text,

          prompt,

          userId:
            currentUser
              ? currentUser.uid
              : "anonymous",

          conversationId:
            currentConversation

        })
      }
    );


  return await safeJSON(
    response
  );
}


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

          const result =
            String(
              reader.result
            );


          const base64 =
            result.includes(",")
              ? result.split(",")[1]
              : result;


          resolve(base64);

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

  let data = null;


  try {

    data =
      await response.json();

  } catch {

    return {
      ok: false,
      error:
        "Worker returned an invalid response."
    };

  }


  if (!response.ok) {

    return {
      ok: false,

      error:
        data.error ||
        "Request failed."
    };

  }


  return data;
}


// =====================================================
// IMAGE GENERATION
// =====================================================

if (imageButton) {

  imageButton.onclick =
    generateImage;

}


async function generateImage() {

  if (busy) return;


  const prompt =
    messageInput.value.trim();


  if (!prompt) {

    messageInput.focus();

    return;
  }


  busy = true;

  imageButton.disabled =
    true;


  welcome.classList.add(
    "hidden"
  );


  addMessage(
    "user",
    "Create an image: " +
    prompt
  );


  messageInput.value = "";

  resizeTextarea();


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


    if (
      response.ok &&
      type.startsWith("image/")
    ) {

      const blob =
        await response.blob();


      const imageURL =
        URL.createObjectURL(
          blob
        );


      const wrapper =
        addMessage(
          "ai",
          "Generated image:"
        );


      const image =
        document.createElement(
          "img"
        );


      image.src =
        imageURL;


      image.alt =
        "Generated by LOGIC-LEAF";


      image.className =
        "generated-image";


      wrapper
        .querySelector(
          ".message-inner"
        )
        .appendChild(
          image
        );


    } else {

      const data =
        await safeJSON(
          response
        );


      addMessage(
        "ai",
        data.error ||
        "Image generation is unavailable."
      );
    }


  } catch {

    loading.remove();


    addMessage(
      "ai",
      "Image generation request failed."
    );

  } finally {

    busy = false;

    imageButton.disabled =
      false;

    messageInput.focus();
  }
}


// =====================================================
// PDF GENERATION
// =====================================================

if (pdfButton) {

  pdfButton.onclick =
    generatePDF;

}


async function generatePDF() {

  if (busy) return;


  const prompt =
    messageInput.value.trim();


  if (!prompt) {

    messageInput.value =
      "Create a professional PDF about ";


    resizeTextarea();

    messageInput.focus();

    return;
  }


  busy = true;

  pdfButton.disabled =
    true;


  welcome.classList.add(
    "hidden"
  );


  addMessage(
    "user",
    "Create a PDF: " +
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


    if (!response.ok) {

      const data =
        await safeJSON(
          response
        );


      addMessage(
        "ai",
        data.error ||
        "PDF generation failed."
      );

      return;
    }


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
      URL.createObjectURL(
        blob
      );


    const link =
      document.createElement(
        "a"
      );


    link.href =
      url;


    link.download =
      "logic-leaf-document.html";


    link.click();


    URL.revokeObjectURL(
      url
    );


    addMessage(
      "ai",
      "Your printable document has been created. Open the downloaded HTML file and use your browser's Print → Save as PDF."
    );


  } catch {

    loading.remove();


    addMessage(
      "ai",
      "PDF generation request failed."
    );

  } finally {

    busy = false;

    pdfButton.disabled =
      false;

    messageInput.focus();
  }
}


// =====================================================
// AUTH BUTTON
// =====================================================

if (authButton) {

  authButton.onclick =
    () => {

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
// PROFILE
// =====================================================

if (profileButton) {

  profileButton.onclick =
    () => {

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

        console.error(
          "Google login:",
          error
        );


        authStatus.textContent =
          error.message ||
          "Google sign-in failed.";

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


        closeModal(
          authModal
        );


      } catch (error) {

        authStatus.textContent =
          error.message ||
          "Authentication failed.";

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


        authPassword.autocomplete =
          "new-password";


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


        authPassword.autocomplete =
          "current-password";

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


      accountName.textContent =
        name;


      accountEmail.textContent =
        user.email || "";


      avatar.textContent =
        name
          .charAt(0)
          .toUpperCase();


      profileButton.innerHTML = `

        <span class="avatar">
          ${escapeHTML(
            name.charAt(0).toUpperCase()
          )}
        </span>

        <span class="profile-info">

          <strong>
            ${escapeHTML(name)}
          </strong>

          <small>
            ${escapeHTML(
              user.email || ""
            )}
          </small>

        </span>

      `;


      authButton.textContent =
        "Account";


      await loadHistory();


    } else {

      accountName.textContent =
        "Guest";


      accountEmail.textContent =
        "Not signed in";


      avatar.textContent =
        "?";


      authButton.textContent =
        "Sign in";


      chatHistory.innerHTML =
        "";

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
      await response.json();


    chatHistory.innerHTML =
      "";


    if (
      !data.ok ||
      !Array.isArray(
        data.chats
      )
    ) {
      return;
    }


    data.chats.forEach(
      chatData => {

        const item =
          document.createElement(
            "div"
          );


        item.className =
          "history-item";


        item.textContent =
          chatData.title ||
          "New conversation";


        item.onclick =
          () => {

            loadConversation(
              chatData.conversation_id
            );

          };


        chatHistory.appendChild(
          item
        );
      }
    );


  } catch (error) {

    console.error(
      "History:",
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

  if (!currentUser) return;


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
      await response.json();


    if (
      !data.ok
    ) return;


    currentConversation =
      conversationId;


    messages.innerHTML =
      "";


    welcome.classList.add(
      "hidden"
    );


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


    if (
      window.innerWidth < 700
    ) {

      sidebar.classList.add(
        "closed"
      );

    }


  } catch {

    addMessage(
      "ai",
      "Could not load this conversation."
    );

  }
}


// =====================================================
// CHAT SEARCH
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

      apiOutput.textContent =
        "";

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
                  "Bearer " +
                  token
              }
            }
          );


        const data =
          await response.json();


        if (!data.ok) {

          apiOutput.textContent =
            data.error ||
            "Could not create API key.";

          return;
        }


        apiOutput.textContent =
          data.apiKey ||
          "";


      } catch {

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

        newChat.click();

      } catch {

        console.error(
          "Logout failed"
        );

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

          const id =
            button.dataset.close;


          const modal =
            document.getElementById(
              id
            );


          if (modal) {

            closeModal(
              modal
            );

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
// MOBILE SIDEBAR
// =====================================================

const mainElement =
  document.querySelector(
    ".main"
  );


if (mainElement) {

  mainElement.addEventListener(
    "click",
    event => {

      if (
        window.innerWidth < 700 &&
        !event.target.closest(
          ".composer"
        )
      ) {

        sidebar.classList.add(
          "closed"
        );

      }
    }
  );
}


// =====================================================
// INITIAL
// =====================================================

resizeTextarea();

console.log(
  "LOGIC-LEAF frontend loaded."
);
