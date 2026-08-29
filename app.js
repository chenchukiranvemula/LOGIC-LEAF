const API_URL =
  "https://qtm-ai-new.qtmkiller6.workers.dev";

const chatForm =
  document.getElementById("chatForm");

const messageInput =
  document.getElementById("messageInput");

const chatMessages =
  document.getElementById("chatMessages");

const welcome =
  document.getElementById("welcome");

const sendBtn =
  document.getElementById("sendBtn");

const newChatBtn =
  document.getElementById("newChatBtn");

const clearBtn =
  document.getElementById("clearBtn");

const settingsBtn =
  document.getElementById("settingsBtn");

const settingsModal =
  document.getElementById("settingsModal");

const closeSettings =
  document.getElementById("closeSettings");

const mobileMenu =
  document.getElementById("mobileMenu");

const sidebar =
  document.getElementById("sidebar");

const chatHistory =
  document.getElementById("chatHistory");

let chats = [];


/* =========================
   ADD MESSAGE
========================= */

function addMessage(text, role) {

  welcome.style.display = "none";

  const row =
    document.createElement("div");

  row.className =
    `message-row ${role}`;

  const wrapper =
    document.createElement("div");

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

  bubble.textContent = text;

  wrapper.appendChild(label);

  wrapper.appendChild(bubble);

  row.appendChild(wrapper);

  chatMessages.appendChild(row);

  scrollChat();
}


/* =========================
   SCROLL
========================= */

function scrollChat() {

  const chatArea =
    document.getElementById("chatArea");

  chatArea.scrollTop =
    chatArea.scrollHeight;
}


/* =========================
   SEND MESSAGE
========================= */

async function sendMessage(text) {

  if (!text.trim()) return;

  addMessage(text, "user");

  messageInput.value = "";

  messageInput.style.height =
    "auto";

  sendBtn.disabled = true;


  /* Loading */

  const loading =
    document.createElement("div");

  loading.className =
    "message-row ai";

  loading.innerHTML = `
    <div>
      <div class="message-label">QTM AI</div>
      <div class="message">Thinking...</div>
    </div>
  `;

  chatMessages.appendChild(loading);

  scrollChat();


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

          body: JSON.stringify({
            message: text
          })
        }
      );


    if (!response.ok) {

      throw new Error(
        `Server error: ${response.status}`
      );

    }


    const data =
      await response.json();


    loading.remove();


    if (
      data.success &&
      data.response
    ) {

      addMessage(
        data.response,
        "ai"
      );

      addHistory(text);

    } else {

      addMessage(
        data.error ||
        "QTM AI could not respond.",
        "ai"
      );

    }


  } catch (error) {

    console.error(error);

    loading.remove();

    addMessage(
      "Unable to connect to QTM AI. Please try again.",
      "ai"
    );

  }


  sendBtn.disabled = false;

  messageInput.focus();
}


/* =========================
   FORM
========================= */

chatForm.addEventListener(
  "submit",
  function(event) {

    event.preventDefault();

    const text =
      messageInput.value.trim();

    if (text) {

      sendMessage(text);

    }

  }
);


/* =========================
   ENTER TO SEND
========================= */

messageInput.addEventListener(
  "keydown",
  function(event) {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      chatForm.requestSubmit();

    }

  }
);


/* =========================
   AUTO RESIZE
========================= */

messageInput.addEventListener(
  "input",
  function() {

    this.style.height =
      "auto";

    this.style.height =
      Math.min(
        this.scrollHeight,
        150
      ) + "px";

  }
);


/* =========================
   SUGGESTIONS
========================= */

document
  .querySelectorAll(
    ".suggestions button"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        sendMessage(
          button.dataset.prompt
        );

      }
    );

  });


/* =========================
   NEW CHAT
========================= */

function newChat() {

  chatMessages.innerHTML = "";

  welcome.style.display =
    "block";

  messageInput.value = "";

  messageInput.style.height =
    "auto";

  messageInput.focus();

}

newChatBtn.addEventListener(
  "click",
  newChat
);

clearBtn.addEventListener(
  "click",
  newChat
);


/* =========================
   CHAT HISTORY
========================= */

function addHistory(text) {

  const item =
    document.createElement("div");

  item.className =
    "history-item";

  item.textContent = text;

  chatHistory.prepend(item);

  chats.push(text);

}


/* =========================
   SETTINGS
========================= */

settingsBtn.addEventListener(
  "click",
  () => {

    settingsModal.classList
      .remove("hidden");

  }
);

closeSettings.addEventListener(
  "click",
  () => {

    settingsModal.classList
      .add("hidden");

  }
);

settingsModal.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      settingsModal
    ) {

      settingsModal.classList
        .add("hidden");

    }

  }
);


/* =========================
   MOBILE MENU
========================= */

mobileMenu.addEventListener(
  "click",
  () => {

    sidebar.classList.toggle(
      "open"
    );

  }
);


/* =========================
   WORKER TEST
========================= */

async function checkWorker() {

  try {

    const response =
      await fetch(API_URL);

    const data =
      await response.json();

    console.log(
      "QTM AI Worker:",
      data
    );

  } catch (error) {

    console.error(
      "Worker connection failed:",
      error
    );

  }

}

checkWorker();
