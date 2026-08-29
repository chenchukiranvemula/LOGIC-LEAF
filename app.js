/* =========================================
   QTM AI
   FRONTEND
========================================= */

const API_URL =
  "https://qtm-ai-new.qtmkiller6.workers.dev";


/* ELEMENTS */

const welcome =
  document.getElementById("welcome");

const chatMessages =
  document.getElementById("chatMessages");

const chatArea =
  document.getElementById("chatArea");

const messageInput =
  document.getElementById("messageInput");

const heroInput =
  document.getElementById("heroInput");

const chatForm =
  document.getElementById("chatForm");

const heroForm =
  document.getElementById("heroForm");

const sendBtn =
  document.getElementById("sendBtn");

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

const settingsBtn =
  document.getElementById("settingsBtn");

const settingsModal =
  document.getElementById("settingsModal");

const closeSettings =
  document.getElementById("closeSettings");

const loginBtn =
  document.getElementById("loginBtn");

const loginModal =
  document.getElementById("loginModal");

const closeLogin =
  document.getElementById("closeLogin");

const googleBtn =
  document.getElementById("googleBtn");


/* LOCAL HISTORY */

let chats =
  JSON.parse(
    localStorage.getItem("qtm_chats") || "[]"
  );


/* =========================================
   MESSAGE
========================================= */

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

  bubble.textContent =
    text;


  wrapper.appendChild(label);

  wrapper.appendChild(bubble);

  row.appendChild(wrapper);

  chatMessages.appendChild(row);


  scrollToBottom();
}


/* =========================================
   SCROLL
========================================= */

function scrollToBottom() {

  chatArea.scrollTop =
    chatArea.scrollHeight;

}


/* =========================================
   ASK
========================================= */

async function askAI(text) {

  text = text.trim();

  if (!text) return;


  addMessage(text, "user");


  saveChat(text);


  heroInput.value = "";
  messageInput.value = "";

  heroInput.style.height = "auto";
  messageInput.style.height = "auto";


  sendBtn.disabled = true;


  const loading =
    document.createElement("div");

  loading.className =
    "message-row ai";

  loading.innerHTML = `
    <div>
      <div class="message-label">
        QTM AI
      </div>

      <div class="message">
        Thinking...
      </div>
    </div>
  `;

  chatMessages.appendChild(loading);

  scrollToBottom();


  try {

    /*
      The Worker accepts:
      POST /api/chat

      {
        "message": "..."
      }
    */

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


    const raw =
      await response.text();


    let data;

    try {

      data =
        JSON.parse(raw);

    } catch {

      throw new Error(
        "Worker returned invalid JSON"
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
        "QTM AI could not answer right now.",
        "ai"
      );

    }


  } catch (error) {

    console.error(
      "QTM AI:",
      error
    );


    loading.remove();


    addMessage(
      "I couldn't connect to the QTM AI engine. Please check the Worker and try again.",
      "ai"
    );

  }


  sendBtn.disabled = false;

  messageInput.focus();
}


/* =========================================
   FORMS
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


heroForm.addEventListener(
  "submit",
  event => {

    event.preventDefault();

    askAI(
      heroInput.value
    );

  }
);


/* =========================================
   ENTER
========================================= */

function enterToSend(input, form) {

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


enterToSend(
  messageInput,
  chatForm
);

enterToSend(
  heroInput,
  heroForm
);


/* =========================================
   AUTO RESIZE
========================================= */

function autoResize(input) {

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


autoResize(messageInput);
autoResize(heroInput);


/* =========================================
   QUICK ACTIONS
========================================= */

document
  .querySelectorAll(".quick-actions button")
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

    chatMessages.innerHTML = "";

    welcome.style.display = "block";

    messageInput.value = "";
    heroInput.value = "";

    messageInput.style.height = "auto";
    heroInput.style.height = "auto";

    sidebar.classList.remove("open");

    messageInput.focus();

  }
);


/* =========================================
   SAVE HISTORY
========================================= */

function saveChat(text) {

  chats.unshift({
    id: Date.now(),
    text: text,
    created:
      new Date().toISOString()
  });


  chats =
    chats.slice(0, 100);


  localStorage.setItem(
    "qtm_chats",
    JSON.stringify(chats)
  );


  renderHistory();
}


/* =========================================
   HISTORY
========================================= */

function renderHistory(filter = "") {

  chatHistory.innerHTML = "";


  const query =
    filter
      .toLowerCase()
      .trim();


  const results =
    chats.filter(chat =>
      chat.text
        .toLowerCase()
        .includes(query)
    );


  if (!results.length) {

    const empty =
      document.createElement("div");

    empty.className =
      "history-item";

    empty.textContent =
      query
        ? "No matching chats"
        : "No conversations yet";

    chatHistory.appendChild(empty);

    return;
  }


  results.forEach(chat => {

    const item =
      document.createElement("div");

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


    chatHistory.appendChild(item);

  });

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
   LOGIN
========================================= */

loginBtn.addEventListener(
  "click",
  () => {

    loginModal.classList.remove(
      "hidden"
    );

  }
);


closeLogin.addEventListener(
  "click",
  () => {

    loginModal.classList.add(
      "hidden"
    );

  }
);


googleBtn.addEventListener(
  "click",
  () => {

    alert(
      "Google authentication is the next backend step."
    );

  }
);


/* =========================================
   MODAL CLOSE
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
   MOBILE
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
   WORKER CHECK
========================================= */

async function checkWorker() {

  try {

    const response =
      await fetch(API_URL);


    const data =
      await response.json();


    console.log(
      "QTM AI Worker online:",
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
