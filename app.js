// ==========================================
// QTM AI APP
// ==========================================

const WORKER_URL =
  "https://qtm-ai-new.qtmkiller6.workers.dev";


// Elements

const input =
  document.getElementById("chatInput");

const sendBtn =
  document.getElementById("sendBtn");

const chatArea =
  document.getElementById("chatMessages");

const welcome =
  document.getElementById("welcome");

const newChatBtn =
  document.getElementById("newChatBtn");

const history =
  document.getElementById("chatHistory");


// ==========================================
// SEND
// ==========================================

async function sendMessage() {

  const text =
    input.value.trim();

  if (!text) return;


  // Hide welcome

  if (welcome) {
    welcome.style.display = "none";
  }


  // Add user message

  addMessage(
    text,
    "user"
  );


  // Clear

  input.value = "";

  input.style.height = "auto";


  // Disable

  sendBtn.disabled = true;

  sendBtn.textContent =
    "...";


  // Loading message

  const loading =
    addMessage(
      "Thinking...",
      "ai"
    );


  try {

    const response =
      await fetch(
        `${WORKER_URL}/api/chat`,
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


    const data =
      await response.json();


    // Remove loading

    loading.remove();


    if (
      !response.ok ||
      !data.ok
    ) {

      addMessage(
        data.error ||
        data.detail ||
        "QTM AI server error.",
        "ai error"
      );

      return;
    }


    // AI response

    addMessage(
      data.response ||
      data.message ||
      "No response received.",
      "ai"
    );


    // Add history

    addHistory(text);


  } catch (error) {

    console.error(
      "QTM AI:",
      error
    );


    loading.remove();


    addMessage(
      "Unable to connect to QTM AI.",
      "ai error"
    );


  } finally {

    sendBtn.disabled = false;

    sendBtn.textContent =
      "Send";

    input.focus();

  }

}


// ==========================================
// ADD MESSAGE
// ==========================================

function addMessage(
  text,
  type
) {

  const wrapper =
    document.createElement("div");

  wrapper.className =
    `message ${type}`;


  const content =
    document.createElement("div");

  content.className =
    "message-content";

  content.textContent =
    text;


  wrapper.appendChild(
    content
  );

  chatArea.appendChild(
    wrapper
  );


  chatArea.scrollTop =
    chatArea.scrollHeight;


  return wrapper;
}


// ==========================================
// SEND BUTTON
// ==========================================

sendBtn.addEventListener(
  "click",
  sendMessage
);


// ==========================================
// ENTER
// ==========================================

input.addEventListener(
  "keydown",
  function(event) {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      sendMessage();

    }

  }
);


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

      <h1>
        How can I help you?
      </h1>

      <p>
        Ask QTM AI anything.
      </p>

    `;

    chatArea.appendChild(
      newWelcome
    );

    input.value = "";

    input.focus();

  }
);


// ==========================================
// HISTORY
// ==========================================

function addHistory(text) {

  if (
    history.textContent
      .includes("No conversations")
  ) {

    history.innerHTML = "";

  }


  const item =
    document.createElement("button");

  item.className =
    "sidebar-action";

  item.textContent =
    text.length > 32
      ? text.substring(0, 32) + "..."
      : text;


  item.addEventListener(
    "click",
    function() {

      input.value = text;

      input.focus();

    }
  );


  history.prepend(item);

}


// ==========================================
// WORKER HEALTH CHECK
// ==========================================

async function checkWorker() {

  try {

    const response =
      await fetch(
        `${WORKER_URL}/api/health`
      );


    const data =
      await response.json();


    console.log(
      "QTM AI Worker:",
      data
    );


  } catch (error) {

    console.error(
      "Worker unavailable:",
      error
    );

  }

}


checkWorker();
