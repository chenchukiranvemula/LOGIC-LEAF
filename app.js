// ==========================================
// QTM AI - APP.JS
// ==========================================

const WORKER_URL =
  "https://qtm-ai-new.qtmkiller6.workers.dev";


// ==========================================
// ELEMENTS
// ==========================================

const chatInput =
  document.getElementById("chatInput");

const sendBtn =
  document.getElementById("sendBtn");

const chatMessages =
  document.getElementById("chatMessages");


// ==========================================
// SEND MESSAGE
// ==========================================

async function sendMessage() {

  if (!chatInput || !chatMessages) {
    console.error(
      "QTM AI: Chat elements not found."
    );

    return;
  }


  const message =
    chatInput.value.trim();


  if (!message) {
    return;
  }


  // Show user message

  addMessage(
    message,
    "user"
  );


  chatInput.value = "";


  // Disable button

  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.textContent = "Thinking...";
  }


  // Show AI loading message

  const loading =
    addMessage(
      "QTM AI is thinking...",
      "ai loading"
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
            message: message
          })
        }
      );


    // Read response

    const data =
      await response.json();


    // Remove loading message

    if (loading) {
      loading.remove();
    }


    // Server error

    if (!response.ok || !data.ok) {

      const errorText =
        data.detail ||
        data.error ||
        `Server error (${response.status})`;

      addMessage(
        `⚠️ ${errorText}`,
        "ai error"
      );

      return;
    }


    // AI response

    addMessage(
      data.response,
      "ai"
    );


  } catch (error) {

    console.error(
      "QTM AI connection error:",
      error
    );


    if (loading) {
      loading.remove();
    }


    addMessage(
      "⚠️ Unable to connect to QTM AI.",
      "ai error"
    );

  } finally {

    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.textContent = "Send";
    }

    chatInput.focus();
  }
}


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
    `message ${type}`;


  const content =
    document.createElement("div");


  content.className =
    "message-content";


  content.textContent =
    text;


  message.appendChild(
    content
  );


  chatMessages.appendChild(
    message
  );


  // Scroll to newest message

  chatMessages.scrollTop =
    chatMessages.scrollHeight;


  return message;
}


// ==========================================
// SEND BUTTON
// ==========================================

if (sendBtn) {

  sendBtn.addEventListener(
    "click",
    sendMessage
  );

}


// ==========================================
// ENTER KEY
// ==========================================

if (chatInput) {

  chatInput.addEventListener(
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

}


// ==========================================
// CONNECTION TEST
// ==========================================

async function checkQTM() {

  try {

    const response =
      await fetch(
        `${WORKER_URL}/api/health`
      );


    const data =
      await response.json();


    console.log(
      "QTM AI:",
      data
    );


  } catch (error) {

    console.error(
      "QTM AI health check failed:",
      error
    );

  }

}


checkQTM();
