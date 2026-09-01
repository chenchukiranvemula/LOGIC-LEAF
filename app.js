/* =====================================================
   LOGIC-LEAF FRONTEND
===================================================== */

const API =
  "https://logic-leaf.qtmkiller6.workers.dev";


/* =====================================================
   FIREBASE
===================================================== */

const firebaseConfig = {

  apiKey:
    "AIzaSyB5bg4U8aMJAhbWgU0sL37BN4JTTRpmMw",

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


if (
  typeof firebase !== "undefined"
) {
  firebase.initializeApp(firebaseConfig);
}


const auth =
  typeof firebase !== "undefined"
    ? firebase.auth()
    : null;


/* =====================================================
   DOM
===================================================== */

const $ = id =>
  document.getElementById(id);

const sidebar =
  $("sidebar");

const openSidebar =
  $("openSidebar");

const closeSidebar =
  $("closeSidebar");

const newChat =
  $("newChat");

const messageInput =
  $("messageInput");

const sendButton =
  $("sendButton");

const messages =
  $("messages");

const welcome =
  $("welcome");

const searchToggle =
  $("searchToggle");

const searchIndicator =
  $("searchIndicator");

const fileInput =
  $("fileInput");

const cameraInput =
  $("cameraInput");

const attachButton =
  $("attachButton");

const cameraButton =
  $("cameraButton");

const filePreview =
  $("filePreview");

const imageButton =
  $("imageButton");

const pdfButton =
  $("pdfButton");

const chatHistory =
  $("chatHistory");

const chatSearch =
  $("chatSearch");

const authModal =
  $("authModal");

const apiModal =
  $("apiModal");

const settingsModal =
  $("settingsModal");

const authEmail =
  $("authEmail");

const authPassword =
  $("authPassword");

const emailAuth =
  $("emailAuth");

const googleAuth =
  $("googleAuth");

const switchAuth =
  $("switchAuth");

const authTitle =
  $("authTitle");

const authSubtitle =
  $("authSubtitle");

const authStatus =
  $("authStatus");

const authButton =
  $("authButton");

const accountName =
  $("accountName");

const accountEmail =
  $("accountEmail");

const avatar =
  $("avatar");

const profileButton =
  $("profileButton");

const apiButton =
  $("apiButton");

const settingsButton =
  $("settingsButton");

const logoutButton =
  $("logoutButton");

const createApiKey =
  $("createApiKey");

const apiOutput =
  $("apiOutput");


/* =====================================================
   STATE
===================================================== */

let searchMode = false;

let authMode = "login";

let currentUser = null;

let currentConversation =
  crypto.randomUUID();

let selectedFile = null;


/* =====================================================
   SIDEBAR
===================================================== */

openSidebar.onclick = () => {
  sidebar.classList.remove("closed");
};

closeSidebar.onclick = () => {
  sidebar.classList.add("closed");
};


/* =====================================================
   NEW CHAT
===================================================== */

newChat.onclick = () => {

  currentConversation =
    crypto.randomUUID();

  messages.innerHTML = "";

  welcome.classList.remove("hidden");

  selectedFile = null;

  filePreview.textContent = "";
  filePreview.classList.add("hidden");

  messageInput.value = "";

  resizeTextarea();

  updateSendButton();

  messageInput.focus();

  if (window.innerWidth < 700) {
    sidebar.classList.add("closed");
  }
};


/* =====================================================
   SEARCH
===================================================== */

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


/* =====================================================
   SEND BUTTON STATE
===================================================== */

messageInput.addEventListener(
  "input",
  () => {

    resizeTextarea();

    updateSendButton();
  }
);


function updateSendButton() {

  sendButton.disabled =
    !messageInput.value.trim();
}


/* =====================================================
   SEND CHAT
===================================================== */

async function sendMessage() {

  const text =
    messageInput.value.trim();

  if (!text && !selectedFile) {
    return;
  }

  const file =
    selectedFile;

  messageInput.value = "";

  resizeTextarea();

  updateSendButton();

  welcome.classList.add("hidden");

  if (file) {

    addFileUserMessage(
      text ||
      `Please analyze ${file.name}.`,
      file
    );

  } else {

    addMessage(
      "user",
      text
    );
  }

  const loading =
    addLoadingMessage();

  try {

    const userId =
      currentUser
        ? currentUser.uid
        : "anonymous";


    let response;


    /* =========================================
       FILE / IMAGE REQUEST
    ========================================= */

    if (file) {

      const base64 =
        await fileToDataURL(file);

      response =
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
                text ||
                `Analyze this file: ${file.name}`,

              userId,

              conversationId:
                currentConversation,

              search:
                searchMode,

              file: {
                name:
                  file.name,

                type:
                  file.type,

                size:
                  file.size,

                data:
                  base64
              }

            })
          }
        );

    }


    /* =========================================
       NORMAL CHAT
    ========================================= */

    else {

      response =
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
                text,

              userId,

              conversationId:
                currentConversation,

              search:
                searchMode

            })
          }
        );
    }


    const data =
      await response.json();


    loading.remove();


    if (
      !response.ok ||
      !data.ok
    ) {

      addMessage(
        "ai",
        data.error ||
        "I couldn't process that request."
      );

      return;
    }


    currentConversation =
      data.conversationId ||
      currentConversation;


    addAIMessage(
      data.answer ||
      "",
      data.sources || []
    );


    loadHistory();


  } catch (error) {

    loading.remove();

    addMessage(
      "ai",
      "Connection error. Please check that the LOGIC-LEAF Worker is deployed."
    );

    console.error(error);

  } finally {

    selectedFile = null;

    filePreview.textContent = "";

    filePreview.classList.add(
      "hidden"
    );

    if (fileInput) {
      fileInput.value = "";
    }

    if (cameraInput) {
      cameraInput.value = "";
    }

    messageInput.focus();
  }
}


sendButton.onclick =
  sendMessage;


/* =====================================================
   ENTER
===================================================== */

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


/* =====================================================
   RESIZE
===================================================== */

function resizeTextarea() {

  messageInput.style.height =
    "auto";

  messageInput.style.height =
    Math.min(
      messageInput.scrollHeight,
      180
    ) + "px";
}


/* =====================================================
   TEXT MESSAGE
===================================================== */

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

  messages.appendChild(wrapper);

  scrollBottom();

  return wrapper;
}


/* =====================================================
   FILE USER MESSAGE
===================================================== */

function addFileUserMessage(
  text,
  file
) {

  const wrapper =
    addMessage(
      "user",
      text
    );

  const content =
    wrapper.querySelector(
      ".message-content"
    );


  if (
    file.type.startsWith("image/")
  ) {

    const img =
      document.createElement("img");

    img.className =
      "attached-image";

    img.alt =
      file.name;

    img.src =
      URL.createObjectURL(file);

    content.appendChild(img);
  }

}


/* =====================================================
   AI MESSAGE
===================================================== */

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
      document.createElement("div");

    sourceBox.className =
      "sources";


    sources.forEach(
      source => {

        const item =
          document.createElement("div");

        item.className =
          "source";


        const title =
          source.source ||
          "Indexed source";


        item.textContent =
          `Source ${source.id || ""}: ${title}`;


        sourceBox.appendChild(item);

      }
    );


    wrapper
      .querySelector(".message-inner")
      .appendChild(sourceBox);
  }


  scrollBottom();
}


/* =====================================================
   LOADING
===================================================== */

function addLoadingMessage() {

  const wrapper =
    document.createElement("div");

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


  messages.appendChild(wrapper);

  scrollBottom();

  return wrapper;
}


/* =====================================================
   FORMAT TEXT
===================================================== */

function formatText(text) {

  let safe =
    escapeHTML(
      String(text || "")
    );


  /* code blocks */

  safe =
    safe.replace(
      /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g,
      (_, language, code) => {

        return `
          <pre><code>${code}</code></pre>
        `;
      }
    );


  /* inline code */

  safe =
    safe.replace(
      /`([^`]+)`/g,
      "<code>$1</code>"
    );


  /* bold */

  safe =
    safe.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );


  /* headings */

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


  /* bullets */

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


  /* line breaks */

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


/* =====================================================
   ESCAPE HTML
===================================================== */

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


/* =====================================================
   SCROLL
===================================================== */

function scrollBottom() {

  const chat =
    $("chat");

  chat.scrollTop =
    chat.scrollHeight;
}


/* =====================================================
   QUICK PROMPTS
===================================================== */

document
  .querySelectorAll(".quick-grid button")
  .forEach(button => {

    button.onclick = () => {

      messageInput.value =
        button.dataset.prompt;

      resizeTextarea();

      updateSendButton();

      messageInput.focus();
    };

  });


/* =====================================================
   FILE ATTACHMENT
===================================================== */

attachButton.onclick = () => {

  fileInput.click();
};


fileInput.onchange =
  event => {

    const file =
      event.target.files[0];

    if (!file) {
      return;
    }

    selectFile(file);
  };


function selectFile(file) {

  selectedFile =
    file;


  filePreview.textContent =
    `Attached: ${file.name}`;

  filePreview.classList.remove(
    "hidden"
  );


  if (
    !messageInput.value.trim()
  ) {

    messageInput.value =
      `Analyze ${file.name} and explain it clearly.`;

    resizeTextarea();

    updateSendButton();
  }
}


/* =====================================================
   CAMERA
===================================================== */

cameraButton.onclick =
  async () => {

    /*
      Mobile browsers usually support
      the capture input directly.
    */

    try {

      cameraInput.click();

    } catch {

      /*
        Fallback to normal image picker.
      */

      fileInput.click();
    }
  };


cameraInput.onchange =
  event => {

    const file =
      event.target.files[0];

    if (!file) {
      return;
    }

    selectFile(file);
  };


/* =====================================================
   FILE → DATA URL
===================================================== */

function fileToDataURL(file) {

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();

      reader.onload =
        () => resolve(
          reader.result
        );

      reader.onerror =
        reject;

      reader.readAsDataURL(file);
    }
  );
}


/* =====================================================
   IMAGE GENERATION
===================================================== */

imageButton.onclick =
  async () => {

    const prompt =
      messageInput.value.trim();

    if (!prompt) {

      messageInput.focus();

      return;
    }


    messageInput.value = "";

    resizeTextarea();

    updateSendButton();

    welcome.classList.add(
      "hidden"
    );


    addMessage(
      "user",
      `Generate an image: ${prompt}`
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


      const data =
        await response.json();


      loading.remove();


      if (
        !response.ok ||
        !data.ok
      ) {

        addMessage(
          "ai",
          data.error ||
          "Image generation failed."
        );

        return;
      }


      const wrapper =
        addMessage(
          "ai",
          data.message ||
          "Generated image:"
        );


      if (data.image) {

        const img =
          document.createElement("img");

        img.className =
          "generated-image";

        img.src =
          data.image;

        img.alt =
          "Generated image";

        wrapper
          .querySelector(
            ".message-content"
          )
          .appendChild(img);

      }


    } catch (error) {

      loading.remove();

      addMessage(
        "ai",
        "Image generation request failed."
      );

      console.error(error);
    }
  };


/* =====================================================
   PDF GENERATION
===================================================== */

pdfButton.onclick =
  async () => {

    const prompt =
      messageInput.value.trim();


    if (!prompt) {

      messageInput.value =
        "Create a professional PDF about ";

      resizeTextarea();

      updateSendButton();

      messageInput.focus();

      return;
    }


    messageInput.value = "";

    resizeTextarea();

    updateSendButton();

    welcome.classList.add(
      "hidden"
    );


    addMessage(
      "user",
      `Create PDF: ${prompt}`
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
              prompt
            })
          }
        );


      const data =
        await response.json();


      loading.remove();


      if (
        !response.ok ||
        !data.ok
      ) {

        addMessage(
          "ai",
          data.error ||
          "PDF creation failed."
        );

        return;
      }


      const wrapper =
        addMessage(
          "ai",
          "Your document is ready."
        );


      const link =
        document.createElement("a");


      link.href =
        data.url;


      link.target =
        "_blank";


      link.rel =
        "noopener";


      link.textContent =
        "Open generated document";


      link.style.display =
        "inline-block";


      link.style.marginTop =
        "10px";


      link.style.color =
        "#dce4ee";


      wrapper
        .querySelector(
          ".message-content"
        )
        .appendChild(link);


    } catch {

      loading.remove();

      addMessage(
        "ai",
        "PDF request failed."
      );
    }
  };


/* =====================================================
   AUTH BUTTON
===================================================== */

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


/* =====================================================
   GOOGLE
===================================================== */

googleAuth.onclick =
  async () => {

    if (!auth) {
      return;
    }

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


/* =====================================================
   EMAIL
===================================================== */

emailAuth.onclick =
  async () => {

    if (!auth) {
      return;
    }


    const email =
      authEmail.value.trim();

    const password =
      authPassword.value;


    if (!email || !password) {

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


/* =====================================================
   AUTH MODE
===================================================== */

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


/* =====================================================
   AUTH STATE
===================================================== */

if (auth) {

  auth.onAuthStateChanged(
    async user => {

      currentUser =
        user;


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

}


/* =====================================================
   HISTORY
===================================================== */

async function loadHistory() {

  if (!currentUser) {
    return;
  }


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
      !Array.isArray(data.chats)
    ) {
      return;
    }


    data.chats.forEach(
      chat => {

        const item =
          document.createElement("div");


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


        chatHistory.appendChild(item);
      }
    );


  } catch (error) {

    console.error(error);
  }
}


/* =====================================================
   LOAD CONVERSATION
===================================================== */

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


    if (!data.ok) {
      return;
    }


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


    if (window.innerWidth < 700) {

      sidebar.classList.add(
        "closed"
      );
    }


  } catch {}
}


/* =====================================================
   CHAT SEARCH
===================================================== */

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


/* =====================================================
   API KEY
===================================================== */

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


/* =====================================================
   SETTINGS
===================================================== */

settingsButton.onclick =
  () => {

    openModal(
      settingsModal
    );
  };


logoutButton.onclick =
  async () => {

    if (auth) {
      await auth.signOut();
    }

    closeModal(
      settingsModal
    );

    newChat.click();
  };


/* =====================================================
   MODALS
===================================================== */

document
  .querySelectorAll("[data-close]")
  .forEach(button => {

    button.onclick =
      () => {

        const modal =
          $(button.dataset.close);

        closeModal(modal);
      };
  });


function openModal(element) {

  if (element) {
    element.classList.remove(
      "hidden"
    );
  }
}


function closeModal(element) {

  if (element) {
    element.classList.add(
      "hidden"
    );
  }
}


/* =====================================================
   MAIN CLICK MOBILE
===================================================== */

document
  .querySelector(".main")
  .addEventListener(
    "click",
    event => {

      if (
        window.innerWidth < 700 &&
        !event.target.closest(".composer") &&
        !event.target.closest(".topbar")
      ) {

        sidebar.classList.add(
          "closed"
        );
      }

    }
  );


/* =====================================================
   START
===================================================== */

resizeTextarea();

updateSendButton();
