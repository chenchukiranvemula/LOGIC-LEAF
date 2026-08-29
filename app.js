// Change this to your Cloudflare Worker URL if running the frontend separately
const API_BASE_URL = "";

const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const statusBadge = document.getElementById("statusBadge");
const statusText = document.getElementById("statusText");

// Check health endpoint on load
async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    const data = await res.json();

    if (data.ok && data.ai_binding) {
      statusBadge.classList.add("online");
      statusText.textContent = "Online";
    } else {
      statusText.textContent = "AI Binding Missing";
    }
  } catch (err) {
    statusText.textContent = "Offline";
  }
}

// Append message bubbles to chat UI
function appendMessage(text, sender = "ai", isError = false) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${sender}${isError ? " error" : ""}`;

  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = "bubble";
  bubbleDiv.textContent = text;

  messageDiv.appendChild(bubbleDiv);
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  return messageDiv;
}

// Display temporary typing indicator
function showTypingIndicator() {
  const messageDiv = document.createElement("div");
  messageDiv.className = "message ai";
  messageDiv.id = "typingIndicator";

  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = "bubble typing-dots";
  bubbleDiv.innerHTML = "<span></span><span></span><span></span>";

  messageDiv.appendChild(bubbleDiv);
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById("typingIndicator");
  if (indicator) indicator.remove();
}

// Handle Form Submission
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const query = messageInput.value.trim();
  if (!query) return;

  // Render User Message
  appendMessage(query, "user");
  messageInput.value = "";
  messageInput.style.height = "auto";
  
  // UI Loading State
  sendBtn.disabled = true;
  messageInput.disabled = true;
  showTypingIndicator();

  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: query })
    });

    const data = await response.json();
    removeTypingIndicator();

    if (response.ok && data.ok) {
      appendMessage(data.response, "ai");
    } else {
      appendMessage(data.error || "Failed to fetch response.", "ai", true);
    }
  } catch (error) {
    removeTypingIndicator();
    appendMessage("Network error: Could not reach the server.", "ai", true);
  } finally {
    sendBtn.disabled = false;
    messageInput.disabled = false;
    messageInput.focus();
  }
});

// Auto-expand textarea on typing & submit on Shift+Enter
messageInput.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = Math.min(this.scrollHeight, 120) + "px";
});

messageInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event("submit"));
  }
});

// Initialize
checkHealth();
