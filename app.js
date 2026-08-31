/* =========================================================
   LOGIC-LEAF AI
   Frontend application
   ========================================================= */

const API_URL =
    localStorage.getItem("qtm_api_url") ||
    "https://qtm-ai-new.qtmkiller6.workers.dev";

const API_ENDPOINT = `${API_URL}/api/chat`;


/* =========================================================
   ELEMENTS
   ========================================================= */

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const menuBtn = document.getElementById("menuBtn");

const newChatBtn = document.getElementById("newChatBtn");

const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

const chatMessages = document.getElementById("chatMessages");
const history = document.getElementById("history");

const attachmentBtn =
    document.getElementById("attachmentBtn");

const fileInput =
    document.getElementById("fileInput");

const cameraBtn =
    document.getElementById("cameraBtn");

const imageBtn =
    document.getElementById("imageBtn");

const loginBtn =
    document.getElementById("loginBtn");

const profileButton =
    document.getElementById("profileButton");

const settingsBtn =
    document.getElementById("settingsBtn");

const helpBtn =
    document.getElementById("helpBtn");

const searchBtn =
    document.getElementById("searchBtn");

const notificationBtn =
    document.getElementById("notificationBtn");


/* =========================================================
   SIDEBAR
   ========================================================= */

function openSidebar() {
    if (!sidebar) return;

    sidebar.classList.add("open");

    if (overlay) {
        overlay.classList.add("active");
    }
}

function closeSidebar() {
    if (!sidebar) return;

    sidebar.classList.remove("open");

    if (overlay) {
        overlay.classList.remove("active");
    }
}

function toggleSidebar() {
    if (!sidebar) return;

    if (sidebar.classList.contains("open")) {
        closeSidebar();
    } else {
        openSidebar();
    }
}

if (menuBtn) {
    menuBtn.addEventListener("click", toggleSidebar);
}

if (overlay) {
    overlay.addEventListener("click", closeSidebar);
}


/* Close sidebar when clicking sidebar navigation */

document.querySelectorAll(".side-item").forEach((button) => {
    button.addEventListener("click", () => {
        closeSidebar();
    });
});


/* Close sidebar after account click */

if (loginBtn) {
    loginBtn.addEventListener("click", () => {
        closeSidebar();
        showSystemMessage(
            "Google sign-in is ready to be connected."
        );
    });
}


/* Escape closes sidebar */

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeSidebar();
    }
});


/* Close sidebar automatically when screen becomes desktop */

window.addEventListener("resize", () => {
    if (window.innerWidth > 760) {
        closeSidebar();
    }
});


/* =========================================================
   MESSAGE HELPERS
   ========================================================= */

function createMessage(role, text) {

    const message = document.createElement("div");

    message.className = `message ${role}`;

    const content = document.createElement("div");

    content.className = "message-content";

    content.textContent = text;

    message.appendChild(content);

    chatMessages.appendChild(message);

    scrollToBottom();

    return message;
}


function createAssistantMessage() {

    const message =
        document.createElement("div");

    message.className = "message assistant";

    const content =
        document.createElement("div");

    content.className = "message-content";

    content.textContent = "Thinking...";

    message.appendChild(content);

    chatMessages.appendChild(message);

    scrollToBottom();

    return content;
}


function showSystemMessage(text) {

    const message =
        document.createElement("div");

    message.className = "message assistant";

    const content =
        document.createElement("div");

    content.className = "message-content";

    content.textContent = text;

    message.appendChild(content);

    chatMessages.appendChild(message);

    scrollToBottom();
}


function scrollToBottom() {

    if (!chatMessages) return;

    requestAnimationFrame(() => {
        chatMessages.scrollTop =
            chatMessages.scrollHeight;
    });
}


/* =========================================================
   SEND MESSAGE
   ========================================================= */

async function sendMessage() {

    if (!messageInput || !sendBtn) return;

    const text =
        messageInput.value.trim();

    if (!text) return;

    createMessage("user", text);

    messageInput.value = "";

    autoResize();

    sendBtn.disabled = true;

    const assistantContent =
        createAssistantMessage();

    try {

        const response =
            await fetch(API_ENDPOINT, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    message: text
                })
            });


        /* =================================================
           HTTP ERROR
           ================================================= */

        if (!response.ok) {

            let errorText =
                `HTTP ${response.status}`;

            try {

                const errorData =
                    await response.json();

                if (errorData.error) {
                    errorText =
                        errorData.error;
                }

            } catch (_) {
                /* Response was not JSON */
            }

            throw new Error(errorText);
        }


        /* =================================================
           JSON RESPONSE
           ================================================= */

        const data =
            await response.json();


        console.log(
            "LOGIC-LEAF AI response:",
            data
        );


        /*
         * Supports:
         *
         * { success: true, response: "..." }
         *
         * { response: "..." }
         *
         * { answer: "..." }
         *
         * { message: "..." }
         */

        const answer =
            data.response ??
            data.answer ??
            data.message ??
            data.result?.response ??
            data.result?.answer;


        if (!answer) {

            throw new Error(
                data.error ||
                "The AI returned an empty response."
            );
        }


        assistantContent.textContent =
            String(answer);

        scrollToBottom();

        saveHistory(text);

    } catch (error) {

        console.error(
            "LOGIC-LEAF AI error:",
            error
        );

        assistantContent.textContent =
            "LOGIC-LEAF AI could not connect right now. Please try again.";

    } finally {

        sendBtn.disabled = false;

        messageInput.focus();
    }
}


/* =========================================================
   SEND BUTTON
   ========================================================= */

if (sendBtn) {
    sendBtn.addEventListener(
        "click",
        sendMessage
    );
}


/* =========================================================
   ENTER TO SEND
   ========================================================= */

if (messageInput) {

    messageInput.addEventListener(
        "keydown",
        (event) => {

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


/* =========================================================
   TEXTAREA AUTO RESIZE
   ========================================================= */

function autoResize() {

    if (!messageInput) return;

    messageInput.style.height = "auto";

    messageInput.style.height =
        Math.min(
            messageInput.scrollHeight,
            150
        ) + "px";
}

if (messageInput) {

    messageInput.addEventListener(
        "input",
        autoResize
    );

}


/* =========================================================
   NEW CHAT
   ========================================================= */

if (newChatBtn) {

    newChatBtn.addEventListener(
        "click",
        () => {

            if (chatMessages) {

                chatMessages.innerHTML = `
                    <div class="welcome">

                        <div class="welcome-logo">
                            L
                        </div>

                        <div class="welcome-label">
                            LOGIC-LEAF AI
                        </div>

                        <h1>
                            How can I help you?
                        </h1>

                        <p>
                            Ask anything. Learn, create,
                            analyze, solve problems and
                            explore ideas with AI.
                        </p>

                    </div>
                `;
            }

            if (messageInput) {
                messageInput.value = "";
                autoResize();
                messageInput.focus();
            }

            closeSidebar();
        }
    );

}


/* =========================================================
   FILE ATTACHMENT
   ========================================================= */

if (attachmentBtn && fileInput) {

    attachmentBtn.addEventListener(
        "click",
        () => {
            fileInput.click();
        }
    );

    fileInput.addEventListener(
        "change",
        () => {

            const file =
                fileInput.files?.[0];

            if (!file) return;

            showSystemMessage(
                `Selected file: ${file.name}`
            );
        }
    );
}


/* =========================================================
   CAMERA
   ========================================================= */

if (cameraBtn) {

    cameraBtn.addEventListener(
        "click",
        () => {

            showSystemMessage(
                "Camera input is not connected yet."
            );

        }
    );
}


/* =========================================================
   IMAGE BUTTON
   ========================================================= */

if (imageBtn) {

    imageBtn.addEventListener(
        "click",
        () => {

            if (messageInput) {

                messageInput.focus();

                if (!messageInput.value) {

                    messageInput.value =
                        "Create an image of ";

                    autoResize();

                }
            }

        }
    );
}


/* =========================================================
   SEARCH
   ========================================================= */

if (searchBtn) {

    searchBtn.addEventListener(
        "click",
        () => {

            showSystemMessage(
                "Search is not connected yet."
            );

        }
    );
}


/* =========================================================
   NOTIFICATIONS
   ========================================================= */

if (notificationBtn) {

    notificationBtn.addEventListener(
        "click",
        () => {

            showSystemMessage(
                "No new notifications."
            );

        }
    );
}


/* =========================================================
   SETTINGS
   ========================================================= */

if (settingsBtn) {

    settingsBtn.addEventListener(
        "click",
        () => {

            showSystemMessage(
                "LOGIC-LEAF AI settings."
            );

        }
    );
}


/* =========================================================
   HELP
   ========================================================= */

if (helpBtn) {

    helpBtn.addEventListener(
        "click",
        () => {

            showSystemMessage(
                "LOGIC-LEAF AI is your AI assistant for learning, coding, problem solving and ideas."
            );

        }
    );
}


/* =========================================================
   PROFILE BUTTON
   ========================================================= */

if (profileButton) {

    profileButton.addEventListener(
        "click",
        () => {

            showSystemMessage(
                "Google sign-in is ready to be connected."
            );

        }
    );
}


/* =========================================================
   SIMPLE CHAT HISTORY
   ========================================================= */

function saveHistory(text) {

    if (!history) return;

    const item =
        document.createElement("button");

    item.type = "button";

    item.className = "side-item";

    item.style.fontSize = "11px";

    item.textContent =
        text.length > 28
            ? text.substring(0, 28) + "..."
            : text;

    item.addEventListener(
        "click",
        () => {

            if (messageInput) {
                messageInput.value = text;
                autoResize();
                messageInput.focus();
            }

            closeSidebar();
        }
    );

    const empty =
        history.querySelector(
            ".empty-history"
        );

    if (empty) {
        empty.remove();
    }

    history.prepend(item);
}


/* =========================================================
   INITIAL STATE
   ========================================================= */

if (sendBtn) {
    sendBtn.disabled = false;
}

if (messageInput) {
    messageInput.focus();
}

console.log(
    "LOGIC-LEAF AI frontend loaded."
);

console.log(
    "AI endpoint:",
    API_ENDPOINT
);
