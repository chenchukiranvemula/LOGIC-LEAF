/* =========================================================
   LOGIC-LEAF AI
   APP.JS
   ========================================================= */

const API_URL =
    localStorage.getItem("logic_leaf_api_url") ||
    "https://ck.qtmkiller6.workers.dev";


/* =========================================================
   ELEMENTS
   ========================================================= */

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

const menuBtn = document.getElementById("menuBtn");
const sidebarClose = document.getElementById("sidebarClose");

const newChatBtn = document.getElementById("newChatBtn");
const newTopChat = document.getElementById("newTopChat");

const searchBtn = document.getElementById("searchBtn");
const helpBtn = document.getElementById("helpBtn");

const loginBtn = document.getElementById("loginBtn");
const profileButton = document.getElementById("profileButton");

const messageInput =
    document.getElementById("messageInput");

const sendBtn =
    document.getElementById("sendBtn");

const chatMessages =
    document.getElementById("chatMessages");

const history =
    document.getElementById("history");

const attachmentBtn =
    document.getElementById("attachmentBtn");

const cameraBtn =
    document.getElementById("cameraBtn");

const imageBtn =
    document.getElementById("imageBtn");

const fileInput =
    document.getElementById("fileInput");

const userName =
    document.getElementById("userName");

const userStatus =
    document.getElementById("userStatus");

const userAvatar =
    document.getElementById("userAvatar");


/* =========================================================
   STATE
   ========================================================= */

let messages = [];

let isSending = false;

let currentChatId = null;


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


if (menuBtn) {
    menuBtn.addEventListener("click", openSidebar);
}


if (sidebarClose) {
    sidebarClose.addEventListener(
        "click",
        closeSidebar
    );
}


if (overlay) {
    overlay.addEventListener(
        "click",
        closeSidebar
    );
}


/* =========================================================
   NEW CHAT
   ========================================================= */

function createNewChat() {

    messages = [];

    currentChatId = Date.now();

    if (chatMessages) {

        chatMessages.innerHTML = "";

        renderWelcome();

    }

    if (messageInput) {

        messageInput.value = "";

        autoResize();

        messageInput.focus();

    }

    closeSidebar();

}


if (newChatBtn) {
    newChatBtn.addEventListener(
        "click",
        createNewChat
    );
}


if (newTopChat) {
    newTopChat.addEventListener(
        "click",
        createNewChat
    );
}


/* =========================================================
   WELCOME SCREEN
   ========================================================= */

function renderWelcome() {

    if (!chatMessages) return;

    chatMessages.innerHTML = `

        <div class="welcome">

            <div class="welcome-logo">
                L
            </div>

            <h1>
                How can I help you?
            </h1>

            <p>
                Ask LOGIC-LEAF AI anything.
            </p>

            <div class="suggestions">

                <button
                    class="suggestion"
                    type="button"
                    data-prompt="Explain a topic to me simply"
                >

                    <div class="suggestion-icon">
                        <svg viewBox="0 0 24 24">
                            <path d="M12 4v16"></path>
                            <path d="M4 12h16"></path>
                        </svg>
                    </div>

                    <div class="suggestion-content">

                        <strong>
                            Explain something
                        </strong>

                        <span>
                            Learn a topic step by step
                        </span>

                    </div>

                </button>


                <button
                    class="suggestion"
                    type="button"
                    data-prompt="Help me solve a problem step by step"
                >

                    <div class="suggestion-icon">
                        <svg viewBox="0 0 24 24">
                            <path d="M5 12h14"></path>
                            <path d="M12 5v14"></path>
                        </svg>
                    </div>

                    <div class="suggestion-content">

                        <strong>
                            Solve a problem
                        </strong>

                        <span>
                            Work through it together
                        </span>

                    </div>

                </button>


                <button
                    class="suggestion"
                    type="button"
                    data-prompt="Help me write code"
                >

                    <div class="suggestion-icon">
                        <svg viewBox="0 0 24 24">
                            <path d="M8 8l-4 4 4 4"></path>
                            <path d="M16 8l4 4-4 4"></path>
                            <path d="M14 5l-4 14"></path>
                        </svg>
                    </div>

                    <div class="suggestion-content">

                        <strong>
                            Write code
                        </strong>

                        <span>
                            Build and debug projects
                        </span>

                    </div>

                </button>


                <button
                    class="suggestion"
                    type="button"
                    data-prompt="Give me ideas for a project"
                >

                    <div class="suggestion-icon">
                        <svg viewBox="0 0 24 24">
                            <path d="M9 18h6"></path>
                            <path d="M10 21h4"></path>
                            <path
                                d="M8.5 14.5A6 6 0 1 1 15.5 14c-.9.8-1.5 1.8-1.5 3H10c0-1.2-.6-2.3-1.5-3.5z"
                            ></path>
                        </svg>
                    </div>

                    <div class="suggestion-content">

                        <strong>
                            Brainstorm ideas
                        </strong>

                        <span>
                            Explore projects and possibilities
                        </span>

                    </div>

                </button>

            </div>

        </div>

    `;

    attachSuggestionEvents();
}


/* =========================================================
   SUGGESTIONS
   ========================================================= */

function attachSuggestionEvents() {

    const suggestions =
        document.querySelectorAll(
            ".suggestion"
        );

    suggestions.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const prompt =
                    button.dataset.prompt;

                if (!prompt) return;

                messageInput.value = prompt;

                autoResize();

                messageInput.focus();

            }
        );

    });

}


/* =========================================================
   INITIAL WELCOME
   ========================================================= */

renderWelcome();


/* =========================================================
   TEXTAREA AUTO RESIZE
   ========================================================= */

function autoResize() {

    if (!messageInput) return;

    messageInput.style.height = "auto";

    const height =
        Math.min(
            messageInput.scrollHeight,
            180
        );

    messageInput.style.height =
        height + "px";

}


if (messageInput) {

    messageInput.addEventListener(
        "input",
        autoResize
    );

}


/* =========================================================
   ENTER TO SEND
   ========================================================= */

if (messageInput) {

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
   SEND MESSAGE
   ========================================================= */

async function sendMessage() {

    if (isSending) return;

    const text =
        messageInput.value.trim();

    if (!text) return;


    isSending = true;

    sendBtn.disabled = true;


    /* Remove welcome */

    const welcome =
        chatMessages.querySelector(
            ".welcome"
        );

    if (welcome) {
        welcome.remove();
    }


    /* Add user message */

    addMessage(
        "user",
        text
    );


    messageInput.value = "";

    autoResize();


    /* Create assistant message */

    const assistantElement =
        addMessage(
            "assistant",
            "Thinking..."
        );


    try {

        const response =
            await callAPI(text);


        const answer =
            extractAnswer(response);


        if (!answer) {

            throw new Error(
                "Empty response from AI"
            );

        }


        updateMessage(
            assistantElement,
            answer
        );


    } catch (error) {

        console.error(
            "LOGIC-LEAF AI error:",
            error
        );


        updateMessage(
            assistantElement,
            "LOGIC-LEAF AI could not connect right now. Please check your Worker URL and /v1/chat endpoint."
        );

    } finally {

        isSending = false;

        sendBtn.disabled = false;

        messageInput.focus();

    }

}


/* =========================================================
   CALL CLOUDFLARE WORKER
   ========================================================= */

async function callAPI(message) {

    if (
        !API_URL ||
        API_URL === "YOUR_WORKER_URL"
    ) {

        throw new Error(
            "Worker URL is not configured."
        );

    }


    const endpoint =
        API_URL.replace(/\/+$/, "") +
        "/v1/chat";


    const response =
        await fetch(
            endpoint,
            {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    message: message,

                    messages: messages

                })

            }
        );


    const rawText =
        await response.text();


    if (!response.ok) {

        throw new Error(
            `HTTP ${response.status}: ${rawText}`
        );

    }


    let data;

    try {

        data =
            JSON.parse(rawText);

    } catch {

        throw new Error(
            "Worker returned non-JSON data."
        );

    }


    return data;

}


/* =========================================================
   EXTRACT AI ANSWER
   ========================================================= */

function extractAnswer(data) {

    if (!data) {
        return "";
    }


    if (
        typeof data === "string"
    ) {
        return data;
    }


    if (
        typeof data.response ===
        "string"
    ) {
        return data.response;
    }


    if (
        typeof data.answer ===
        "string"
    ) {
        return data.answer;
    }


    if (
        typeof data.message ===
        "string"
    ) {
        return data.message;
    }


    if (
        typeof data.content ===
        "string"
    ) {
        return data.content;
    }


    if (
        data.result &&
        typeof data.result.response ===
        "string"
    ) {
        return data.result.response;
    }


    if (
        data.result &&
        typeof data.result.answer ===
        "string"
    ) {
        return data.result.answer;
    }


    if (
        data.choices &&
        data.choices[0]
    ) {

        const choice =
            data.choices[0];


        if (
            choice.message &&
            typeof choice.message.content ===
            "string"
        ) {

            return choice.message.content;

        }


        if (
            typeof choice.text ===
            "string"
        ) {

            return choice.text;

        }

    }


    return "";
}


/* =========================================================
   ADD MESSAGE
   ========================================================= */

function addMessage(
    role,
    text
) {

    const message =
        document.createElement("div");


    message.className =
        "message " +
        role +
        "-message";


    const avatar =
        document.createElement("div");


    avatar.className =
        "message-avatar";


    avatar.textContent =
        role === "user"
            ? "G"
            : "L";


    const content =
        document.createElement("div");


    content.className =
        "message-content";


    content.textContent =
        text;


    message.appendChild(
        avatar
    );


    message.appendChild(
        content
    );


    chatMessages.appendChild(
        message
    );


    chatMessages.scrollTop =
        chatMessages.scrollHeight;


    messages.push({

        role:
            role === "user"
                ? "user"
                : "assistant",

        content: text

    });


    if (role === "user") {

        addHistoryItem(text);

    }


    return message;

}


/* =========================================================
   UPDATE MESSAGE
   ========================================================= */

function updateMessage(
    element,
    text
) {

    if (!element) return;


    const content =
        element.querySelector(
            ".message-content"
        );


    if (content) {

        content.textContent =
            text;

    }


    const index =
        messages.length - 1;


    if (
        index >= 0 &&
        messages[index].role ===
            "assistant"
    ) {

        messages[index].content =
            text;

    }


    chatMessages.scrollTop =
        chatMessages.scrollHeight;

}


/* =========================================================
   CHAT HISTORY
   ========================================================= */

function addHistoryItem(
    text
) {

    if (!history) return;


    const empty =
        history.querySelector(
            ".history-empty"
        );


    if (empty) {
        empty.remove();
    }


    const item =
        document.createElement("button");


    item.className =
        "sidebar-nav history-item";


    item.type =
        "button";


    const icon =
        document.createElement("span");


    icon.className =
        "history-item-icon";


    icon.textContent =
        "•";


    const title =
        document.createElement("span");


    title.textContent =
        text.length > 35
            ? text.substring(0, 35) +
              "..."
            : text;


    item.appendChild(icon);

    item.appendChild(title);


    history.prepend(item);

}


/* =========================================================
   SEARCH
   ========================================================= */

if (searchBtn) {

    searchBtn.addEventListener(
        "click",
        () => {

            const query =
                prompt(
                    "Search your conversations:"
                );


            if (!query) return;


            const items =
                history.querySelectorAll(
                    ".history-item"
                );


            items.forEach(item => {

                const matches =
                    item.textContent
                        .toLowerCase()
                        .includes(
                            query.toLowerCase()
                        );


                item.style.display =
                    matches
                        ? "flex"
                        : "none";

            });

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

            alert(
                "LOGIC-LEAF AI\n\n" +
                "Ask questions, solve problems, " +
                "write code and explore ideas.\n\n" +
                "Developer:\n" +
                "V. CHENCHUKIRAN\n" +
                "Cloud Security & DevSecOps"
            );

        }
    );

}


/* =========================================================
   ATTACHMENT
   ========================================================= */

if (attachmentBtn) {

    attachmentBtn.addEventListener(
        "click",
        () => {

            if (fileInput) {
                fileInput.click();
            }

        }
    );

}


/* =========================================================
   FILE SELECTED
   ========================================================= */

if (fileInput) {

    fileInput.addEventListener(
        "change",
        () => {

            const file =
                fileInput.files[0];

            if (!file) return;


            messageInput.value =
                `File selected: ${file.name}`;


            autoResize();

            messageInput.focus();

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

            alert(
                "Camera input will be connected to LOGIC-LEAF AI in the next version."
            );

        }
    );

}


/* =========================================================
   IMAGE GENERATION
   ========================================================= */

if (imageBtn) {

    imageBtn.addEventListener(
        "click",
        () => {

            messageInput.value =
                "Create an image of ";


            autoResize();

            messageInput.focus();

        }
    );

}


/* =========================================================
   GOOGLE LOGIN PLACEHOLDER
   ========================================================= */

function handleLogin() {

    alert(
        "Google Login is not connected yet.\n\n" +
        "The interface is ready for Google authentication."
    );

}


if (loginBtn) {

    loginBtn.addEventListener(
        "click",
        handleLogin
    );

}


if (profileButton) {

    profileButton.addEventListener(
        "click",
        handleLogin
    );

}


/* =========================================================
   MOBILE SIDEBAR
   ========================================================= */

window.addEventListener(
    "resize",
    () => {

        if (
            window.innerWidth > 800
        ) {

            closeSidebar();

        }

    }
);


/* =========================================================
   KEYBOARD ESCAPE
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            closeSidebar();

        }

    }
);


/* =========================================================
   LOAD SAVED USER
   ========================================================= */

function loadSavedUser() {

    const savedUser =
        localStorage.getItem(
            "logic_leaf_user"
        );


    if (!savedUser) return;


    try {

        const user =
            JSON.parse(savedUser);


        if (user.name) {

            userName.textContent =
                user.name;

        }


        if (user.email) {

            userStatus.textContent =
                user.email;

        }


        if (user.picture) {

            userAvatar.textContent =
                "";

            userAvatar.style.backgroundImage =
                `url("${user.picture}")`;

            userAvatar.style.backgroundSize =
                "cover";

            userAvatar.style.backgroundPosition =
                "center";

        }

    } catch (error) {

        console.error(
            "Could not load user:",
            error
        );

    }

}


loadSavedUser();


/* =========================================================
   INITIAL FOCUS
   ========================================================= */

if (messageInput) {

    setTimeout(
        () => {
            messageInput.focus();
        },
        300
    );

}


/* =========================================================
   LOG
   ========================================================= */

console.log(
    "LOGIC-LEAF AI loaded."
);

console.log(
    "API:",
    API_URL
);
