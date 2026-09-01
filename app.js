// =====================================================
// LOGIC-LEAF FRONTEND
// =====================================================

const API =
  "https://logic-leaf.qtmkiller6.workers.dev";


// =====================================================
// FIREBASE
// =====================================================

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


firebase.initializeApp(
  firebaseConfig
);

const auth =
  firebase.auth();


// =====================================================
// DOM
// =====================================================

const sidebar =
  document.getElementById("sidebar");

const openSidebar =
  document.getElementById("openSidebar");

const closeSidebar =
  document.getElementById("closeSidebar");

const newChat =
  document.getElementById("newChat");

const messageInput =
  document.getElementById("messageInput");

const sendButton =
  document.getElementById("sendButton");

const messages =
  document.getElementById("messages");

const welcome =
  document.getElementById("welcome");

const searchToggle =
  document.getElementById("searchToggle");

const searchIndicator =
  document.getElementById(
    "searchIndicator"
  );

const fileInput =
  document.getElementById("fileInput");

const attachButton =
  document.getElementById("attachButton");

const filePreview =
  document.getElementById("filePreview");

const imageButton =
  document.getElementById("imageButton");

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
  document.getElementById(
    "authSubtitle"
  );

const authStatus =
  document.getElementById(
    "authStatus"
  );

const authButton =
  document.getElementById(
    "authButton"
  );

const accountName =
  document.getElementById(
    "accountName"
  );

const accountEmail =
  document.getElementById(
    "accountEmail"
  );

const avatar =
  document.getElementById(
    "avatar"
  );

const profileButton =
  document.getElementById(
    "profileButton"
  );

const apiButton =
  document.getElementById(
    "apiButton"
  );

const settingsButton =
  document.getElementById(
    "settingsButton"
  );

const logoutButton =
  document.getElementById(
    "logoutButton"
  );

const createApiKey =
  document.getElementById(
    "createApiKey"
  );

const apiOutput =
  document.getElementById(
    "apiOutput"
  );


// =====================================================
// STATE
// =====================================================

let searchMode = false;

let authMode = "login";

let currentUser = null;

let currentConversation =
  crypto.randomUUID();

let selectedFile = null;


// =====================================================
// SIDEBAR
// =====================================================

openSidebar.onclick = () => {
  sidebar.classList.remove("closed");
};

closeSidebar.onclick = () => {
  sidebar.classList.add("closed");
};


// =====================================================
// NEW CHAT
// =====================================================

newChat.onclick = () => {
  currentConversation =
    crypto.randomUUID();

  messages.innerHTML = "";

  welcome.classList.remove(
    "hidden"
  );

  messageInput.focus();

  if (
    window.innerWidth < 700
  ) {
    sidebar.classList.add(
      "closed"
    );
  }
};


// =====================================================
// SEARCH TOGGLE
// =====================================================

searchToggle.onclick = () => {

  searchMode =
    !searchMode;

  searchToggle.classList.toggle(
    "active",
    searchMode
  );

  searchIndicator.classList.toggle(
    "hidden",
    !searchMode
  );
};


// =====================================================
// SEND MESSAGE
// =====================================================

async function sendMessage() {

  const text =
    messageInput.value.trim();

  if (!text) return;

  messageInput.value = "";

  resizeTextarea();

  welcome.classList.add(
    "hidden"
  );

  addMessage(
    "user",
    text
  );

  sendButton.disabled = true;

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
            search: searchMode,
            userId,
            conversationId:
              currentConversation
          })
        }
      );

    const data =
      await response.json();

    loading.remove();

    if (!response.ok ||
        !data.ok) {

      addMessage(
        "ai",
        "Sorry, I couldn't process that request.\n\n" +
        (data.error || "Server error.")
      );

      return;
    }

    addAIMessage(
      data.answer,
      data.sources || []
    );

    loadHistory();

  } catch (error) {

    loading.remove();

    addMessage(
      "ai",
      "Connection error. Please check the Worker deployment."
    );

  } finally {

    sendButton.disabled =
      false;

    messageInput.focus();
  }
}


sendButton.onclick =
  sendMessage;


// =====================================================
// ENTER KEY
// =====================================================

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


// =====================================================
// AUTO RESIZE
// =====================================================

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
      180
    ) + "px";
}


// =====================================================
// MESSAGE
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
    "message " + role;

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
      : "LOGIC-LEAF";

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


function addAIMessage(
  text,
  sources
) {

  const wrapper =
    addMessage(
      "ai",
      text
    );

  if (
    sources &&
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

        item.textContent =
          `Source ${source.id}: ${
            source.source ||
            "Indexed content"
          }`;

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
        Thinking…
      </div>
    </div>
  `;

  messages.appendChild(
    wrapper
  );

  scrollBottom();

  return wrapper;
}


// =====================================================
// FORMAT AI RESPONSE
// =====================================================

function formatText(text) {

  let safe =
    escapeHTML(
      String(text)
    );

  // code blocks
  safe =
    safe.replace(
      /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g,
      (_, language, code) => {

        return `
          <pre><code>${code}</code></pre>
        `;
      }
    );

  // bold
  safe =
    safe.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );

  // inline code
  safe =
    safe.replace(
      /`([^`]+)`/g,
      "<code>$1</code>"
    );

  // bullets
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

  // paragraphs
  safe =
    safe
      .split(/\n{2,}/)
      .map(
        block =>
          block.trim()
            ? `<p>${block}</p>`
            : ""
      )
      .join("");

  return safe;
}


function escapeHTML(text) {

  return text
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

  const chat =
    document.getElementById(
      "chat"
    );

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

        messageInput.value =
          button.dataset.prompt;

        resizeTextarea();

        messageInput.focus();
      };
    }
  );


// =====================================================
// FILES
// =====================================================

attachButton.onclick = () => {
  fileInput.click();
};

fileInput.onchange =
  async event => {

    const file =
      event.target.files[0];

    if (!file) return;

    selectedFile = file;

    filePreview.textContent =
      `Attached: ${file.name}`;

    // Text/code files can be read directly
    if (
      file.type.startsWith(
        "text/"
      ) ||
      /\.(js|css|html|py|java|cpp|c|md|json|csv)$/i
        .test(file.name)
    ) {

      try {

        const text =
          await file.text();

        messageInput.value =
          `Please analyze this file:

FILE: ${file.name}

${text}`;

        resizeTextarea();

      } catch {
        messageInput.value =
          `Please analyze ${file.name}.`;
      }
    }

    // PDF is intentionally sent as a file request
    else if (
      file.name
        .toLowerCase()
        .endsWith(".pdf")
    ) {

      messageInput.value =
        `I attached ${file.name}. Help me analyze this PDF.`;

      resizeTextarea();
    }
  };


// =====================================================
// IMAGE GENERATION
// =====================================================

imageButton.onclick =
  async () => {

    const prompt =
      messageInput.value.trim();

    if (!prompt) {

      messageInput.focus();

      return;
    }

    welcome.classList.add(
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

      if (
        !response.ok
      ) {

        addMessage(
          "ai",
          "Image generation is unavailable for the currently configured Cloudflare model."
        );

        return;
      }

      const type =
        response.headers.get(
          "content-type"
        ) || "";

      if (
        type.includes(
          "image/"
        )
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

        image.style.maxWidth =
          "100%";

        image.style.borderRadius =
          "14px";

        wrapper
          .querySelector(
            ".message-inner"
          )
          .appendChild(
            image
          );

      } else {

        const data =
          await response.json();

        addMessage(
          "ai",
          JSON.stringify(
            data
          )
        );
      }

    } catch {

      loading.remove();

      addMessage(
        "ai",
        "Image generation request failed."
      );
    }
  };


// =====================================================
// AUTH
// =====================================================

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


googleAuth.onclick =
  async () => {

    authStatus.textContent =
      "Opening Google…";

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

      authStatus.textContent =
        error.message;
    }
  };


emailAuth.onclick =
  async () => {

    const email =
      authEmail.value.trim();

    const password =
      authPassword.value;

    if (!email ||
        !password) {

      authStatus.textContent =
        "Enter email and password.";

      return;
    }

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

    } catch (error) {

      authStatus.textContent =
        error.message;
    }
  };


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


// =====================================================
// AUTH STATE
// =====================================================

auth.onAuthStateChanged(
  async user => {

    currentUser = user;

    if (user) {

      const name =
        user.displayName ||
        user.email
          ?.split("@")[0] ||
        "User";

      accountName.textContent =
        name;

      accountEmail.textContent =
        user.email || "";

      avatar.textContent =
        name
          .charAt(0)
          .toUpperCase();

      profileButton.textContent =
        name
          .charAt(0)
          .toUpperCase();

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

      profileButton.textContent =
        "?";

      authButton.textContent =
        "Sign in";
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
      !data.chats
    ) return;

    data.chats.forEach(
      chat => {

        const item =
          document.createElement(
            "div"
          );

        item.className =
          "history-item";

        item.textContent =
          chat.title ||
          "New conversation";

        item.onclick =
          () =>
            loadConversation(
              chat.conversation_id
            );

        chatHistory.appendChild(
          item
        );
      }
    );

  } catch {}
}


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
      await response.json();

    if (!data.ok) return;

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

  } catch {}
}


// =====================================================
// CHAT SEARCH FILTER
// =====================================================

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


// =====================================================
// API KEY
// =====================================================

apiButton.onclick =
  () => {

    apiOutput.textContent =
      "";

    openModal(
      apiModal
    );
  };


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
        await response.json();

      if (!data.ok) {

        apiOutput.textContent =
          data.error;

        return;
      }

      apiOutput.textContent =
        data.apiKey;

    } catch {

      apiOutput.textContent =
        "Could not create API key.";
    }
  };


// =====================================================
// SETTINGS
// =====================================================

settingsButton.onclick =
  () => {

    openModal(
      settingsModal
    );
  };


logoutButton.onclick =
  async () => {

    await auth.signOut();

    closeModal(
      settingsModal
    );

    newChat.click();
  };


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


function openModal(
  element
) {

  element.classList.remove(
    "hidden"
  );
}


function closeModal(
  element
) {

  element.classList.add(
    "hidden"
  );
}


// =====================================================
// CLOSE MOBILE SIDEBAR WHEN CLICKING MAIN
// =====================================================

document
  .querySelector(".main")
  .addEventListener(
    "click",
    () => {

      if (
        window.innerWidth < 700
      ) {

        sidebar.classList.add(
          "closed"
        );
      }
    }
  );
