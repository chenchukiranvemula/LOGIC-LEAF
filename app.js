const WORKER_URL =
  "https://qtm-ai-new.qtmkiller6.workers.dev";

const input =
  document.getElementById("chatInput");

const sendBtn =
  document.getElementById("sendBtn");

const sendText =
  document.getElementById("sendText");

const chatArea =
  document.getElementById("chatMessages");

const welcome =
  document.getElementById("welcome");

const newChatBtn =
  document.getElementById("newChatBtn");

const chatHistory =
  document.getElementById("chatHistory");

const sidebar =
  document.getElementById("sidebar");

const overlay =
  document.getElementById("overlay");

const menuBtn =
  document.getElementById("menuBtn");

const searchBtn =
  document.getElementById("searchBtn");

const searchPanel =
  document.getElementById("searchPanel");

const closeSearchBtn =
  document.getElementById("closeSearchBtn");

const searchInput =
  document.getElementById("searchInput");

const searchResults =
  document.getElementById("searchResults");

const settingsBtn =
  document.getElementById("settingsBtn");

const settingsPanel =
  document.getElementById("settingsPanel");

const closeSettingsBtn =
  document.getElementById("closeSettingsBtn");

const clearBtn =
  document.getElementById("clearBtn");

const attachBtn =
  document.getElementById("attachBtn");

const fileInput =
  document.getElementById("fileInput");

const filePreview =
  document.getElementById("filePreview");

const composer =
  document.getElementById("composer");

let isGenerating = false;

let conversations =
  JSON.parse(
    localStorage.getItem("qtm_chats") || "[]"
  );


// ==========================================
// SUGGESTIONS
// ==========================================

window.useSuggestion = function(text) {

  input.value = text;

  resizeInput();

  input.focus();

};


// ==========================================
// INPUT RESIZE
// ==========================================

function resizeInput() {

  input.style.height = "auto";

  input.style.height =
    Math.min(
      input.scrollHeight,
      130
    ) + "px";

}

input.addEventListener(
  "input",
  resizeInput
);


// ==========================================
// SEND
// ==========================================

composer.addEventListener(
  "submit",
  async function(event) {

    event.preventDefault();

    if (isGenerating) return;

    const message =
      input.value.trim();

    if (!message) return;

    if (welcome) {
      welcome.style.display = "none";
    }

    addMessage(
      message,
      "user"
    );

    input.value = "";

    resizeInput();

    closeMobileSidebar();

    isGenerating = true;

    sendBtn.disabled = true;

    sendText.textContent =
      "Wait";

    const thinking =
      addMessage(
        "Thinking...",
        "ai"
      );

    try {

      const response =
        await fetch(
          WORKER_URL + "/api/chat",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              message: message
            })
          }
        );


      const data =
        await response.json();


      thinking.remove();


      if (
        !response.ok ||
        data.ok !== true
      ) {

        addMessage(
          data.error ||
          data.detail ||
          "QTM AI request failed.",
          "ai error"
        );

        return;
      }


      const answer =
        data.response ||
        "QTM AI returned an empty response.";


      addMessage(
        answer,
        "ai"
      );


      saveConversation(
        message,
        answer
      );


    } catch (error) {

      console.error(
        "QTM AI error:",
        error
      );

      thinking.remove();

      addMessage(
        "Could not connect to the QTM AI server.",
        "ai error"
      );

    } finally {

      isGenerating = false;

      sendBtn.disabled = false;

      sendText.textContent =
        "Send";

      input.focus();

    }

  }
);


// ==========================================
// ADD MESSAGE
// ==========================================

function addMessage(
  text,
  type
) {

  const message =
    document.createElement("div");

  message.className =
    "message " + type;


  const content =
    document.createElement("div");

  content.className =
    "message-content";

  content.textContent =
    text;


  message.appendChild(
    content
  );

  chatArea.appendChild(
    message
  );


  requestAnimationFrame(
    function() {

      chatArea.scrollTo({
        top: chatArea.scrollHeight,
        behavior: "smooth"
      });

    }
  );


  return message;

}


// ==========================================
// NEW CHAT
// ==========================================

newChatBtn.addEventListener(
  "click",
  function() {

    chatArea.innerHTML = "";

    const newWelcome =
      document.createElement("div");

    newWelcome.className =
      "welcome";

    newWelcome.innerHTML = `
      <div class="welcome-orb">
        <div class="orb-core">Q</div>
      </div>

      <h1>How can I help you?</h1>

      <p>
        Ask QTM AI anything. Learn, create, solve and explore.
      </p>
    `;

    chatArea.appendChild(
      newWelcome
    );

    input.value = "";

    resizeInput();

    closeMobileSidebar();

    input.focus();

  }
);


// ==========================================
// SAVE CHAT
// ==========================================

function saveConversation(
  userMessage,
  aiMessage
) {

  conversations.unshift({

    id: Date.now(),

    title:
      userMessage.length > 45
        ? userMessage.substring(0, 45) + "..."
        : userMessage,

    user: userMessage,

    answer: aiMessage,

    time: Date.now()

  });


  conversations =
    conversations.slice(
      0,
      50
    );


  localStorage.setItem(
    "qtm_chats",
    JSON.stringify(conversations)
  );


  renderHistory();

}


// ==========================================
// HISTORY
// ==========================================

function renderHistory() {

  chatHistory.innerHTML = "";


  if (!conversations.length) {

    chatHistory.innerHTML = `
      <div class="history-empty">
        Your conversations will appear here.
      </div>
    `;

    return;

  }


  conversations.forEach(
    function(chat) {

      const button =
        document.createElement("button");

      button.className =
        "history-item";

      button.textContent =
        chat.title;


      button.addEventListener(
        "click",
        function() {

          loadConversation(chat);

          closeMobileSidebar();

        }
      );


      chatHistory.appendChild(
        button
      );

    }
  );

}


// ==========================================
// LOAD CONVERSATION
// ==========================================

function loadConversation(
  chat
) {

  chatArea.innerHTML = "";

  addMessage(
    chat.user,
    "user"
  );

  addMessage(
    chat.answer,
    "ai"
  );

}


// ==========================================
// SEARCH
// ==========================================

searchBtn.addEventListener(
  "click",
  function() {

    searchPanel.classList.remove(
      "hidden"
    );

    searchInput.value = "";

    searchInput.focus();

  }
);


closeSearchBtn.addEventListener(
  "click",
  function() {

    searchPanel.classList.add(
      "hidden"
    );

  }
);


searchInput.addEventListener(
  "input",
  function() {

    const query =
      this.value
        .trim()
        .toLowerCase();


    if (!query) {

      searchResults.textContent =
        "Search your conversations.";

      return;

    }


    const results =
      conversations.filter(
        chat =>
          chat.title
            .toLowerCase()
            .includes(query)
      );


    searchResults.innerHTML = "";


    if (!results.length) {

      searchResults.textContent =
        "No matching conversations.";

      return;

    }


    results.forEach(
      function(chat) {

        const item =
          document.createElement("button");

        item.className =
          "history-item";

        item.textContent =
          chat.title;

        item.addEventListener(
          "click",
          function() {

            loadConversation(chat);

            searchPanel.classList.add(
              "hidden"
            );

          }
        );

        searchResults.appendChild(
          item
        );

      }
    );

  }
);


// ==========================================
// SETTINGS
// ==========================================

settingsBtn.addEventListener(
  "click",
  function() {

    settingsPanel.classList.remove(
      "hidden"
    );

  }
);


closeSettingsBtn.addEventListener(
  "click",
  function() {

    settingsPanel.classList.add(
      "hidden"
    );

  }
);


// ==========================================
// CLEAR CHAT
// ==========================================

clearBtn.addEventListener(
  "click",
  function() {

    chatArea.innerHTML = "";

    const newWelcome =
      document.createElement("div");

    newWelcome.className =
      "welcome";

    newWelcome.innerHTML = `
      <div class="welcome-orb">
        <div class="orb-core">Q</div>
      </div>

      <h1>How can I help you?</h1>

      <p>
        Ask QTM AI anything. Learn, create, solve and explore.
      </p>
    `;

    chatArea.appendChild(
      newWelcome
    );

    settingsPanel.classList.add(
      "hidden"
    );

  }
);


// ==========================================
// FILE ATTACHMENT UI
// ==========================================

attachBtn.addEventListener(
  "click",
  function() {

    fileInput.click();

  }
);


fileInput.addEventListener(
  "change",
  function() {

    filePreview.innerHTML = "";


    Array.from(
      this.files
    ).forEach(
      function(file) {

        const chip =
          document.createElement("div");

        chip.className =
          "file-chip";

        chip.textContent =
          file.name;

        filePreview.appendChild(
          chip
        );

      }
    );

  }
);


// ==========================================
// MOBILE SIDEBAR
// ==========================================

menuBtn.addEventListener(
  "click",
  function() {

    sidebar.classList.add(
      "open"
    );

    overlay.classList.add(
      "show"
    );

  }
);


overlay.addEventListener(
  "click",
  closeMobileSidebar
);


function closeMobileSidebar() {

  sidebar.classList.remove(
    "open"
  );

  overlay.classList.remove(
    "show"
  );

}


// ==========================================
// KEYBOARD SEARCH
// ==========================================

document.addEventListener(
  "keydown",
  function(event) {

    if (
      event.key === "/" &&
      document.activeElement !== input &&
      document.activeElement !== searchInput
    ) {

      event.preventDefault();

      searchPanel.classList.remove(
        "hidden"
      );

      searchInput.focus();

    }


    if (
      event.key === "Escape"
    ) {

      searchPanel.classList.add(
        "hidden"
      );

      settingsPanel.classList.add(
        "hidden"
      );

      closeMobileSidebar();

    }

  }
);


// ==========================================
// GOOGLE BUTTON
// ==========================================

document
  .getElementById("googleLoginBtn")
  .addEventListener(
    "click",
    function() {

      alert(
        "Google authentication needs to be connected to Firebase before sign-in can work."
      );

    }
  );


document
  .getElementById("settingsGoogleBtn")
  .addEventListener(
    "click",
    function() {

      alert(
        "Google authentication needs to be connected to Firebase before sign-in can work."
      );

    }
  );


// ==========================================
// WORKER CHECK
// ==========================================

async function checkWorker() {

  try {

    const response =
      await fetch(
        WORKER_URL + "/api/health"
      );

    const data =
      await response.json();

    console.log(
      "QTM AI Worker:",
      data
    );

  } catch (error) {

    console.error(
      "QTM AI Worker unavailable:",
      error
    );

  }

}


// ==========================================
// START
// ==========================================

renderHistory();

checkWorker();
