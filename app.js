// ============================================================
// LOGIC-LEAF APP.JS
// ============================================================

const API =
  "https://logic-leaf.qtmkiller6.workers.dev";


// ============================================================
// FIREBASE
// ============================================================

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
// FIREBASE INIT
// ============================================================

if (
  typeof firebase !== "undefined"
) {
  if (
    !firebase.apps.length
  ) {
    firebase.initializeApp(
      firebaseConfig
    );
  }
}

const auth =
  typeof firebase !== "undefined"
    ? firebase.auth()
    : null;


// ============================================================
// STATE
// ============================================================

let currentUser =
  null;

let currentConversation =
  crypto.randomUUID();

let searchMode =
  false;

let selectedFile =
  null;

let conversationMessages =
  [];


// ============================================================
// DOM
// ============================================================

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

const messages =
  $("messages");

const welcome =
  $("welcome");

const messageInput =
  $("messageInput");

const sendButton =
  $("sendButton");

const searchToggle =
  $("searchToggle");

const searchIndicator =
  $("searchIndicator");

const fileInput =
  $("fileInput");

const attachButton =
  $("attachButton");

const filePreview =
  $("filePreview");

const imageButton =
  $("imageButton");

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


// ============================================================
// SAFE ELEMENT HELPER
// ============================================================

function exists(element) {
  return !!element;
}


// ============================================================
// SIDEBAR
// ============================================================

if (exists(openSidebar)) {
  openSidebar.onclick =
    () => {
      sidebar?.classList.remove(
        "closed"
      );
    };
}

if (exists(closeSidebar)) {
  closeSidebar.onclick =
    () => {
      sidebar?.classList.add(
        "closed"
      );
    };
}


// ============================================================
// NEW CHAT
// ============================================================

if (exists(newChat)) {
  newChat.onclick =
    () => {

      currentConversation =
        crypto.randomUUID();

      conversationMessages =
        [];

      if (exists(messages)) {
        messages.innerHTML =
          "";
      }

      welcome?.classList.remove(
        "hidden"
      );

      if (exists(messageInput)) {
        messageInput.value =
          "";

        resizeTextarea();

        messageInput.focus();
      }

      selectedFile =
        null;

      if (exists(filePreview)) {
        filePreview.textContent =
          "";
      }

      if (
        window.innerWidth < 700
      ) {
        sidebar?.classList.add(
          "closed"
        );
      }
    };
}


// ============================================================
// SEARCH
// ============================================================

if (exists(searchToggle)) {
  searchToggle.onclick =
    () => {

      searchMode =
        !searchMode;

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


// ============================================================
// SEND
// ============================================================

async function sendMessage() {

  if (!exists(messageInput))
    return;

  const text =
    messageInput.value.trim();

  if (!text)
    return;

  messageInput.value =
    "";

  resizeTextarea();

  welcome?.classList.add(
    "hidden"
  );

  addMessage(
    "user",
    text
  );

  conversationMessages.push({
    role: "user",
    content: text
  });

  sendButton.disabled =
    true;

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
              currentConversation,

            history:
              conversationMessages
                .slice(-30)
                .slice(
                  0,
                  -1
                )
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
      const error =
        data?.error ||
        "Server error.";

      addMessage(
        "ai",
        "Sorry, I couldn't process that request.\n\n" +
        error
      );

      return;
    }

    const answer =
      data.answer ||
      "No answer returned.";

    addAIMessage(
      answer,
      data.sources || []
    );

    conversationMessages.push({
      role: "assistant",
      content: answer
    });

    if (
      currentUser
    ) {
      loadHistory();
    }

  } catch (error) {

    console.error(
      error
    );

    loading.remove();

    addMessage(
      "ai",
      "Connection error. Please check that the Worker is deployed and the API URL is correct."
    );

  } finally {

    sendButton.disabled =
      false;

    messageInput.focus();
  }
}


if (exists(sendButton)) {
  sendButton.onclick =
    sendMessage;
}


// ============================================================
// ENTER
// ============================================================

if (exists(messageInput)) {

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


function resizeTextarea() {

  if (!exists(messageInput))
    return;

  messageInput.style.height =
    "auto";

  messageInput.style.height =
    Math.min(
      messageInput.scrollHeight,
      180
    ) + "px";
}


// ============================================================
// ADD MESSAGE
// ============================================================

function addMessage(
  role,
  text
) {

  if (!exists(messages))
    return null;

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
    formatText(
      text
    );

  inner.appendChild(
    label
  );

  inner.appendChild(
    content
  );

  wrapper.appendChild(
    inner
  );

  messages.appendChild(
    wrapper
  );

  scrollBottom();

  return wrapper;
}


// ============================================================
// AI MESSAGE
// ============================================================

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
    !wrapper ||
    !sources ||
    !sources.length
  ) {
    return;
  }

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
        "Indexed source";

      item.textContent =
        `Source ${source.id}: ${name}`;

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


// ============================================================
// LOADING
// ============================================================

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
        <span class="thinking">
          Thinking…
        </span>
      </div>
    </div>
  `;

  messages.appendChild(
    wrapper
  );

  scrollBottom();

  return wrapper;
}


// ============================================================
// FORMAT
// ============================================================

function formatText(
  text
) {

  let safe =
    escapeHTML(
      String(text)
    );

  // Code blocks
  safe =
    safe.replace(
      /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g,
      (_, language, code) => {

        return `
          <pre>
            <code>${code}</code>
          </pre>
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

  // New lines
  safe =
    safe.replace(
      /\n/g,
      "<br>"
    );

  return safe;
}


function escapeHTML(
  text
) {
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


// ============================================================
// SCROLL
// ============================================================

function scrollBottom() {

  const chat =
    document.getElementById(
      "chat"
    );

  if (chat) {
    chat.scrollTop =
      chat.scrollHeight;
  }
}


// ============================================================
// QUICK PROMPTS
// ============================================================

document
  .querySelectorAll(
    ".quick-grid button"
  )
  .forEach(
    button => {

      button.onclick =
        () => {

          if (
            !exists(messageInput)
          )
            return;

          messageInput.value =
            button.dataset.prompt ||
            button.textContent ||
            "";

          resizeTextarea();

          messageInput.focus();
        };
    }
  );


// ============================================================
// FILE BUTTON
// ============================================================

if (exists(attachButton)) {

  attachButton.onclick =
    () => {

      fileInput?.click();
    };
}


// ============================================================
// FILE INPUT
// ============================================================

if (exists(fileInput)) {

  fileInput.onchange =
    async event => {

      const file =
        event.target.files?.[0];

      if (!file)
        return;

      selectedFile =
        file;

      if (filePreview) {
        filePreview.textContent =
          `Attached: ${file.name}`;
      }

      // ------------------------------------------------------
      // IMAGE
      // ------------------------------------------------------

      if (
        file.type.startsWith(
          "image/"
        )
      ) {

        await prepareImage(
          file
        );

        return;
      }

      // ------------------------------------------------------
      // TEXT / CODE
      // ------------------------------------------------------

      if (
        file.type.startsWith(
          "text/"
        ) ||
        /\.(js|css|html|py|java|cpp|c|md|json|csv|txt|xml)$/i
          .test(file.name)
      ) {

        try {

          const text =
            await file.text();

          messageInput.value =
            `Please analyze this file.

FILE: ${file.name}

${text}`;

          resizeTextarea();

          messageInput.focus();

        } catch {

          messageInput.value =
            `Please analyze ${file.name}.`;

          resizeTextarea();
        }

        return;
      }

      // ------------------------------------------------------
      // PDF
      // ------------------------------------------------------

      if (
        file.type ===
          "application/pdf" ||
        /\.pdf$/i.test(
          file.name
        )
      ) {

        messageInput.value =
          `Please analyze the attached PDF named "${file.name}".`;

        resizeTextarea();

        messageInput.focus();

        return;
      }

      messageInput.value =
        `Please analyze the attached file: ${file.name}`;

      resizeTextarea();
    };
}


// ============================================================
// IMAGE → VISION
// ============================================================

async function prepareImage(
  file
) {

  try {

    const dataURL =
      await fileToDataURL(
        file
      );

    const preview =
      addImagePreview(
        dataURL,
        file.name
      );

    if (!preview)
      return;

    // Ask user what to do with image.
    messageInput.value =
      "Describe this image and explain what you see.";

    messageInput.dataset.imageData =
      dataURL;

    resizeTextarea();

    messageInput.focus();

  } catch (error) {

    console.error(
      error
    );

    addMessage(
      "ai",
      "I couldn't read that image."
    );
  }
}


// ============================================================
// IMAGE PREVIEW
// ============================================================

function addImagePreview(
  dataURL,
  fileName
) {

  if (!exists(messages))
    return null;

  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.className =
    "message user";

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
    "You";

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
    dataURL;

  image.alt =
    fileName ||
    "Attached image";

  image.style.maxWidth =
    "100%";

  image.style.maxHeight =
    "400px";

  image.style.borderRadius =
    "16px";

  content.appendChild(
    image
  );

  inner.appendChild(
    label
  );

  inner.appendChild(
    content
  );

  wrapper.appendChild(
    inner
  );

  messages.appendChild(
    wrapper
  );

  scrollBottom();

  return wrapper;
}


// ============================================================
// FILE TO DATA URL
// ============================================================

function fileToDataURL(
  file
) {

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();

      reader.onload =
        () =>
          resolve(
            reader.result
          );

      reader.onerror =
        reject;

      reader.readAsDataURL(
        file
      );
    }
  );
}


// ============================================================
// SEND IMAGE TO VISION
// ============================================================

async function analyzeImage() {

  const image =
    messageInput?.dataset
      ?.imageData;

  if (!image)
    return false;

  const prompt =
    messageInput.value.trim() ||
    "Describe this image.";

  messageInput.value =
    "";

  delete messageInput.dataset
    .imageData;

  welcome?.classList.add(
    "hidden"
  );

  addMessage(
    "user",
    prompt
  );

  const loading =
    addLoadingMessage();

  try {

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
            image,
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
        "Vision request failed."
      );

      return true;
    }

    addMessage(
      "ai",
      data.answer
    );

  } catch {

    loading.remove();

    addMessage(
      "ai",
      "Unable to analyze the image."
    );
  }

  return true;
}


// ============================================================
// OVERRIDE SEND FOR IMAGE
// ============================================================

const originalSend =
  sendMessage;

async function smartSend() {

  if (
    messageInput?.dataset
      ?.imageData
  ) {

    await analyzeImage();

    return;
  }

  await originalSend();
}

if (exists(sendButton)) {
  sendButton.onclick =
    smartSend;
}


// ============================================================
// IMAGE GENERATION
// ============================================================

if (exists(imageButton)) {

  imageButton.onclick =
    async () => {

      const prompt =
        messageInput.value.trim();

      if (!prompt) {

        messageInput.focus();

        return;
      }

      messageInput.value =
        "";

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

              body:
                JSON.stringify({
                  prompt
                })
            }
          );

        const contentType =
          response.headers.get(
            "content-type"
          ) || "";

        if (
          !response.ok
        ) {

          const data =
            await response
              .json()
              .catch(
                () => ({})
              );

          loading.remove();

          addMessage(
            "ai",
            data.error ||
            "Image generation failed."
          );

          return;
        }

        // --------------------------------------------------
        // DIRECT IMAGE
        // --------------------------------------------------

        if (
          contentType.includes(
            "image/"
          )
        ) {

          const blob =
            await response.blob();

          const imageURL =
            URL.createObjectURL(
              blob
            );

          loading.remove();

          addGeneratedImage(
            imageURL
          );

          return;
        }

        // --------------------------------------------------
        // JSON IMAGE
        // --------------------------------------------------

        const data =
          await response.json();

        loading.remove();

        if (
          data.image
        ) {

          let imageURL =
            data.image;

          if (
            imageURL.startsWith(
              "data:"
            )
          ) {

            addGeneratedImage(
              imageURL
            );

          } else {

            addGeneratedImage(
              "data:image/png;base64," +
              imageURL
            );
          }

          return;
        }

        addMessage(
          "ai",
          "The image model did not return an image."
        );

      } catch (error) {

        console.error(
          error
        );

        loading.remove();

        addMessage(
          "ai",
          "Image generation request failed."
        );
      }
    };
}


// ============================================================
// GENERATED IMAGE
// ============================================================

function addGeneratedImage(
  src
) {

  const wrapper =
    addMessage(
      "ai",
      "Generated image:"
    );

  if (!wrapper)
    return;

  const image =
    document.createElement(
      "img"
    );

  image.src =
    src;

  image.alt =
    "Generated by LOGIC-LEAF";

  image.style.width =
    "100%";

  image.style.maxWidth =
    "800px";

  image.style.borderRadius =
    "18px";

  image.style.display =
    "block";

  image.style.marginTop =
    "12px";

  wrapper
    .querySelector(
      ".message-inner"
    )
    ?.appendChild(
      image
    );
}


// ============================================================
// PDF GENERATION
// ============================================================

async function generatePDF() {

  const prompt =
    messageInput.value.trim();

  if (!prompt)
    return;

  messageInput.value =
    "";

  resizeTextarea();

  addMessage(
    "user",
    "Create a PDF: " +
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

          body:
            JSON.stringify({
              prompt,

              title:
                "LOGIC-LEAF Document"
            })
        }
      );

    const html =
      await response.text();

    loading.remove();

    if (!response.ok) {

      addMessage(
        "ai",
        "PDF generation failed."
      );

      return;
    }

    const blob =
      new Blob(
        [html],
        {
          type:
            "text/html"
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

    link.target =
      "_blank";

    link.rel =
      "noopener";

    link.textContent =
      "Open generated document";

    link.className =
      "pdf-link";

    const wrapper =
      addMessage(
        "ai",
        "Your document is ready."
      );

    wrapper
      ?.querySelector(
        ".message-content"
      )
      ?.appendChild(
        document.createElement(
          "br"
        )
      );

    wrapper
      ?.querySelector(
        ".message-content"
      )
      ?.appendChild(
        link
      );

  } catch {

    loading.remove();

    addMessage(
      "ai",
      "PDF generation failed."
    );
  }
}


// ============================================================
// OPTIONAL PDF BUTTON
// ============================================================

const pdfButton =
  $("pdfButton");

if (pdfButton) {
  pdfButton.onclick =
    generatePDF;
}


// ============================================================
// AUTH
// ============================================================

if (exists(authButton)) {

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


if (exists(profileButton)) {

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


// ============================================================
// GOOGLE
// ============================================================

if (exists(googleAuth)) {

  googleAuth.onclick =
    async () => {

      authStatus.textContent =
        "Opening Google…";

      try {

        const provider =
          new firebase.auth
            .GoogleAuthProvider();

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
          error.message ||
          "Google sign-in failed.";
      }
    };
}


// ============================================================
// EMAIL
// ============================================================

if (exists(emailAuth)) {

  emailAuth.onclick =
    async () => {

      const email =
        authEmail.value.trim();

      const password =
        authPassword.value;

      if (
        !email ||
        !password
      ) {

        authStatus.textContent =
          "Enter email and password.";

        return;
      }

      try {

        if (
          authMode ===
          "login"
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


// ============================================================
// AUTH MODE
// ============================================================

let authMode =
  "login";

if (exists(switchAuth)) {

  switchAuth.onclick =
    () => {

      if (
        authMode ===
        "login"
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


// ============================================================
// AUTH STATE
// ============================================================

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

        if (accountName)
          accountName.textContent =
            name;

        if (accountEmail)
          accountEmail.textContent =
            user.email || "";

        if (avatar)
          avatar.textContent =
            name
              .charAt(0)
              .toUpperCase();

        if (profileButton)
          profileButton.textContent =
            name
              .charAt(0)
              .toUpperCase();

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
          avatar.textContent =
            "?";

        if (profileButton)
          profileButton.textContent =
            "?";

        if (authButton)
          authButton.textContent =
            "Sign in";
      }
    }
  );
}


// ============================================================
// HISTORY
// ============================================================

async function loadHistory() {

  if (!currentUser)
    return;

  if (!chatHistory)
    return;

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

          body:
            JSON.stringify({
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

        item.dataset.id =
          chat.conversation_id;

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

  } catch (error) {

    console.error(
      "HISTORY",
      error
    );
  }
}


// ============================================================
// LOAD CONVERSATION
// ============================================================

async function loadConversation(
  conversationId
) {

  if (!currentUser)
    return;

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

          body:
            JSON.stringify({
              conversationId,
              userId:
                currentUser.uid
            })
        }
      );

    const data =
      await response.json();

    if (
      !data.ok
    )
      return;

    currentConversation =
      conversationId;

    conversationMessages =
      [];

    messages.innerHTML =
      "";

    welcome?.classList.add(
      "hidden"
    );

    data.messages.forEach(
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

    if (
      window.innerWidth < 700
    ) {
      sidebar?.classList.add(
        "closed"
      );
    }

  } catch (error) {

    console.error(
      "CONVERSATION",
      error
    );
  }
}


// ============================================================
// SEARCH HISTORY
// ============================================================

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
                .includes(
                  query
                )
                ? ""
                : "none";
          }
        );
    };
}


// ============================================================
// API KEY
// ============================================================

if (apiButton) {

  apiButton.onclick =
    () => {

      if (apiOutput)
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
          await currentUser
            .getIdToken();

        const response =
          await fetch(
            API +
            "/v1/keys/create",
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
          data.apiKey;

      } catch {

        apiOutput.textContent =
          "Could not create API key.";
      }
    };
}


// ============================================================
// SETTINGS
// ============================================================

if (settingsButton) {

  settingsButton.onclick =
    () => {

      openModal(
        settingsModal
      );
    };
}


// ============================================================
// LOGOUT
// ============================================================

if (logoutButton) {

  logoutButton.onclick =
    async () => {

      try {

        await auth.signOut();

      } finally {

        closeModal(
          settingsModal
        );

        newChat?.click();
      }
    };
}


// ============================================================
// MODALS
// ============================================================

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

          closeModal(
            modal
          );
        };
    }
  );


function openModal(
  element
) {

  element?.classList.remove(
    "hidden"
  );
}


function closeModal(
  element
) {

  element?.classList.add(
    "hidden"
  );
}


// ============================================================
// CLOSE MOBILE SIDEBAR
// ============================================================

document
  .querySelector(
    ".main"
  )
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


// ============================================================
// CAMERA
// ============================================================

// Your HTML camera button should have:
// id="cameraButton"
// and a hidden input:
// id="cameraInput"

const cameraButton =
  $("cameraButton");

const cameraInput =
  $("cameraInput");

if (cameraButton) {

  cameraButton.onclick =
    () => {

      if (cameraInput) {
        cameraInput.click();
      }
    };
}

if (cameraInput) {

  cameraInput.onchange =
    async event => {

      const file =
        event.target.files?.[0];

      if (!file)
        return;

      selectedFile =
        file;

      if (
        !file.type.startsWith(
          "image/"
        )
      ) {

        addMessage(
          "ai",
          "Please select an image."
        );

        return;
      }

      await prepareImage(
        file
      );
    };
}


// ============================================================
// PDF QUICK BUTTON
// ============================================================

const createPdfButton =
  $("createPdfButton");

if (createPdfButton) {

  createPdfButton.onclick =
    generatePDF;
}


// ============================================================
// INITIAL
// ============================================================

console.log(
  "LOGIC-LEAF frontend loaded."
);

console.log(
  "API:",
  API
);
