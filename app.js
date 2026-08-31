const API_URL = "https://ck.qtmkiller6.workers.dev";

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const menuBtn = document.getElementById("menuBtn");
const sidebarClose = document.getElementById("sidebarClose");

const newChatBtn = document.getElementById("newChatBtn");
const newTopChat = document.getElementById("newTopChat");

const searchBtn = document.getElementById("searchBtn");
const topSearchBtn = document.getElementById("topSearchBtn");
const helpBtn = document.getElementById("helpBtn");

const loginBtn = document.getElementById("loginBtn");
const profileButton = document.getElementById("profileButton");

const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

const chatMessages = document.getElementById("chatMessages");
const history = document.getElementById("history");

const attachmentBtn = document.getElementById("attachmentBtn");
const cameraBtn = document.getElementById("cameraBtn");
const imageBtn = document.getElementById("imageBtn");
const fileInput = document.getElementById("fileInput");

const userName = document.getElementById("userName");
const userStatus = document.getElementById("userStatus");
const userAvatar = document.getElementById("userAvatar");

let conversation = [];
let sending = false;


/* =========================================================
   SIDEBAR
   ========================================================= */

function openSidebar() {
    sidebar.classList.add("open");
    overlay.classList.add("active");
}

function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("active");
}

menuBtn?.addEventListener("click", openSidebar);
sidebarClose?.addEventListener("click", closeSidebar);
overlay?.addEventListener("click", closeSidebar);

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeSidebar();
    }
});


/* =========================================================
   WELCOME SCREEN
   ========================================================= */

function showWelcome() {
    chatMessages.innerHTML = `
        <div class="welcome">

            <div class="welcome-logo">L</div>

            <h1>How can I help you?</h1>

            <p>Ask LOGIC-LEAF AI anything.</p>

            <div class="suggestions">

                <button
                    class="suggestion"
                    data-prompt="Explain this topic to me simply and clearly."
                >
                    <div class="suggestion-icon">
                        <svg viewBox="0 0 24 24">
                            <path d="M12 5v14"></path>
                            <path d="M5 12h14"></path>
                        </svg>
                    </div>

                    <div class="suggestion-content">
                        <strong>Explain something</strong>
                        <span>Learn a topic step by step</span>
                    </div>
                </button>


                <button
                    class="suggestion"
                    data-prompt="Help me solve this problem step by step."
                >
                    <div class="suggestion-icon">
                        <svg viewBox="0 0 24 24">
                            <path d="M5 12h14"></path>
                            <path d="M12 5v14"></path>
                        </svg>
                    </div>

                    <div class="suggestion-content">
                        <strong>Solve a problem</strong>
                        <span>Work through it together</span>
                    </div>
                </button>


                <button
                    class="suggestion"
                    data-prompt="Help me write and improve some code."
                >
                    <div class="suggestion-icon">
                        <svg viewBox="0 0 24 24">
                            <path d="M8 8l-4 4 4 4"></path>
                            <path d="M16 8l4 4-4 4"></path>
                            <path d="M14 5l-4 14"></path>
                        </svg>
                    </div>

                    <div class="suggestion-content">
                        <strong>Write code</strong>
                        <span>Build and debug projects</span>
                    </div>
                </button>


                <button
                    class="suggestion"
                    data-prompt="Give me creative ideas for a project."
                >
                    <div class="suggestion-icon">
                        <svg viewBox="0 0 24 24">
                            <path d="M9 18h6"></path>
                            <path d="M10 21h4"></path>
                            <path d="M8.5 14.5a6 6 0 1 1 7 0"></path>
                        </svg>
                    </div>

                    <div class="suggestion-content">
                        <strong>Brainstorm ideas</strong>
                        <span>Explore projects and possibilities</span>
                    </div>
                </button>

            </div>
        </div>
    `;

    document.querySelectorAll(".suggestion").forEach((button) => {
        button.addEventListener("click", () => {
            messageInput.value = button.dataset.prompt || "";
            resizeInput();
            messageInput.focus();
        });
    });
}

showWelcome();


/* =========================================================
   TEXTAREA
   ========================================================= */

function resizeInput() {
    messageInput.style.height = "auto";

    const height = Math.min(
        messageInput.scrollHeight,
        180
    );

    messageInput.style.height = `${height}px`;
}

messageInput.addEventListener(
    "input",
    resizeInput
);


/* =========================================================
   SEND
   ========================================================= */

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

sendBtn.addEventListener(
    "click",
    sendMessage
);


/* =========================================================
   SEND MESSAGE
   ========================================================= */

async function sendMessage() {

    if (sending) return;

    const text = messageInput.value.trim();

    if (!text) return;

    sending = true;
    sendBtn.disabled = true;

    removeWelcome();

    addUserMessage(text);

    messageInput.value = "";
    resizeInput();

    const assistant = createAssistantMessage();

    try {

        const answer = await requestAI(text);

        assistant.content.textContent =
            answer || "The AI returned an empty response.";

        conversation.push({
            role: "assistant",
            content: answer
        });

    } catch (error) {

        console.error(error);

        assistant.content.textContent =
            "I couldn't get a response from LOGIC-LEAF AI. Please check the Worker /v1/chat endpoint.";

    } finally {

        sending = false;
        sendBtn.disabled = false;

        scrollToBottom();

        messageInput.focus();
    }
}


/* =========================================================
   REMOVE WELCOME
   ========================================================= */

function removeWelcome() {

    const welcome =
        chatMessages.querySelector(".welcome");

    if (welcome) {
        welcome.remove();
    }
}


/* =========================================================
   USER MESSAGE
   ========================================================= */

function addUserMessage(text) {

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "message user-message";

    const avatar =
        document.createElement("div");

    avatar.className =
        "message-avatar";

    avatar.textContent = "G";

    const content =
        document.createElement("div");

    content.className =
        "message-content";

    content.textContent = text;

    wrapper.appendChild(avatar);
    wrapper.appendChild(content);

    chatMessages.appendChild(wrapper);

    conversation.push({
        role: "user",
        content: text
    });

    addHistory(text);

    scrollToBottom();
}


/* =========================================================
   ASSISTANT MESSAGE
   ========================================================= */

function createAssistantMessage() {

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "message assistant-message";

    const avatar =
        document.createElement("div");

    avatar.className =
        "message-avatar";

    avatar.textContent = "L";

    const content =
        document.createElement("div");

    content.className =
        "message-content";

    content.textContent =
        "Thinking...";

    wrapper.appendChild(avatar);
    wrapper.appendChild(content);

    chatMessages.appendChild(wrapper);

    scrollToBottom();

    return {
        wrapper,
        content
    };
}


/* =========================================================
   REAL WORKER REQUEST
   ========================================================= */

async function requestAI(message) {

    const endpoint =
        `${API_URL}/v1/chat`;

    const response =
        await fetch(
            endpoint,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },

                body: JSON.stringify({
                    message: message,
                    messages: conversation
                })
            }
        );


    const text =
        await response.text();


    if (!response.ok) {

        throw new Error(
            `Worker error ${response.status}: ${text}`
        );

    }


    let data;

    try {

        data = JSON.parse(text);

    } catch {

        throw new Error(
            "Worker did not return JSON."
        );

    }


    return extractAIText(data);
}


/* =========================================================
   RESPONSE PARSER
   ========================================================= */

function extractAIText(data) {

    if (!data) {
        return "";
    }


    if (typeof data === "string") {
        return data;
    }


    const possibleValues = [

        data.response,

        data.answer,

        data.content,

        data.message,

        data.text,

        data.output,

        data.result?.response,

        data.result?.answer,

        data.result?.content,

        data.result?.text,

        data.result?.output,

        data.result?.response?.text,

        data.result?.content?.text

    ];


    for (const value of possibleValues) {

        if (typeof value === "string" && value.trim()) {
            return value;
        }

    }


    if (
        Array.isArray(data.choices) &&
        data.choices.length
    ) {

        const choice = data.choices[0];

        if (
            typeof choice?.message?.content ===
            "string"
        ) {
            return choice.message.content;
        }

        if (
            typeof choice?.text ===
            "string"
        ) {
            return choice.text;
        }
    }


    if (
        data.result &&
        typeof data.result === "string"
    ) {
        return data.result;
    }


    return "";
}


/* =========================================================
   HISTORY
   ========================================================= */

function addHistory(text) {

    const empty =
        history.querySelector(".history-empty");

    if (empty) {
        empty.remove();
    }


    const item =
        document.createElement("button");

    item.type = "button";
    item.className =
        "sidebar-nav history-item";

    const icon =
        document.createElement("span");

    icon.className =
        "history-item-icon";

    icon.textContent = "•";


    const title =
        document.createElement("span");

    title.textContent =
        text.length > 38
            ? `${text.slice(0, 38)}...`
            : text;


    item.appendChild(icon);
    item.appendChild(title);

    history.prepend(item);
}


/* =========================================================
   NEW CHAT
   ========================================================= */

function newChat() {

    conversation = [];

    showWelcome();

    messageInput.value = "";

    resizeInput();

    closeSidebar();

    messageInput.focus();
}


newChatBtn.addEventListener(
    "click",
    newChat
);


newTopChat.addEventListener(
    "click",
    newChat
);


/* =========================================================
   SEARCH
   ========================================================= */

function searchChats() {

    const query =
        prompt("Search your chats:");

    if (!query) return;


    const items =
        history.querySelectorAll(
            ".history-item"
        );


    items.forEach((item) => {

        const matches =
            item.textContent
                .toLowerCase()
                .includes(
                    query.toLowerCase()
                );

        item.style.display =
            matches ? "flex" : "none";
    });
}


searchBtn.addEventListener(
    "click",
    searchChats
);


topSearchBtn.addEventListener(
    "click",
    searchChats
);


/* =========================================================
   HELP
   ========================================================= */

helpBtn.addEventListener(
    "click",
    () => {

        alert(
            "LOGIC-LEAF AI\n\n" +
            "AI assistant for questions, " +
            "problem solving, coding, learning " +
            "and creative work.\n\n" +
            "Developer:\n" +
            "V. CHENCHUKIRAN\n" +
            "Cloud Security & DevSecOps"
        );

    }
);


/* =========================================================
   FILE BUTTON
   ========================================================= */

attachmentBtn.addEventListener(
    "click",
    () => {
        fileInput.click();
    }
);


fileInput.addEventListener(
    "change",
    () => {

        if (!fileInput.files.length) return;

        const files =
            Array.from(fileInput.files);

        const names =
            files
                .map(file => file.name)
                .join(", ");

        messageInput.value =
            `I uploaded: ${names}`;

        resizeInput();
        messageInput.focus();
    }
);


/* =========================================================
   CAMERA
   ========================================================= */

cameraBtn.addEventListener(
    "click",
    () => {

        const cameraInput =
            document.createElement("input");

        cameraInput.type = "file";
        cameraInput.accept =
            "image/*";
        cameraInput.capture =
            "environment";

        cameraInput.click();

    }
);


/* =========================================================
   IMAGE REQUEST
   ========================================================= */

imageBtn.addEventListener(
    "click",
    () => {

        messageInput.value =
            "Create an image of ";

        resizeInput();

        messageInput.focus();

    }
);


/* =========================================================
   GOOGLE ACCOUNT UI
   ========================================================= */

function login() {

    alert(
        "Google sign-in is not connected yet.\n\n" +
        "This button is intentionally kept as account UI " +
        "until real Google OAuth credentials are configured."
    );

}


loginBtn.addEventListener(
    "click",
    login
);


profileButton.addEventListener(
    "click",
    login
);


/* =========================================================
   SCROLL
   ========================================================= */

function scrollToBottom() {

    requestAnimationFrame(() => {

        chatMessages.scrollTop =
            chatMessages.scrollHeight;

    });

}


/* =========================================================
   MOBILE
   ========================================================= */

window.addEventListener(
    "resize",
    () => {

        if (window.innerWidth > 700) {
            closeSidebar();
        }

    }
);


/* =========================================================
   STARTUP
   ========================================================= */

console.log(
    "LOGIC-LEAF AI started."
);

console.log(
    "Worker:",
    API_URL
);
