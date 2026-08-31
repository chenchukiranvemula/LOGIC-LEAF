/* =========================================================
   LOGIC-LEAF AI
   Main application
   Developer: V. CHENCHUKIRAN
   Cloud Security & DevSecOps
   ========================================================= */

const API_URL = "https://ck.qtmkiller6.workers.dev";

/* =========================================================
   ELEMENTS
   ========================================================= */

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const menuBtn = document.getElementById("menuBtn");

const newChatBtn = document.getElementById("newChatBtn");
const history = document.getElementById("history");

const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

const chatMessages = document.getElementById("chatMessages");

const attachmentBtn =
    document.getElementById("attachmentBtn");

const cameraBtn =
    document.getElementById("cameraBtn");

const imageBtn =
    document.getElementById("imageBtn");

const fileInput =
    document.getElementById("fileInput");


/* =========================================================
   STATE
   ========================================================= */

let messages = [];
let isSending = false;


/* =========================================================
   SAFE EVENT HELPER
   ========================================================= */

function on(element, event, handler) {

    if (!element) return;

    element.addEventListener(event, handler);
}


/* =========================================================
   SIDEBAR
   ========================================================= */

function openSidebar() {

    if (sidebar) {
        sidebar.classList.add("open");
    }

    if (overlay) {
        overlay.classList.add("active");
    }

}


function closeSidebar() {

    if (sidebar) {
        sidebar.classList.remove("open");
    }

    if (overlay) {
        overlay.classList.remove("active");
    }

}


on(menuBtn, "click", openSidebar);

on(overlay, "click", closeSidebar);


document.addEventListener("keydown", function (event) {

    if (event.key === "Escape") {
        closeSidebar();
    }

});


/* =========================================================
   NEW CHAT
   ========================================================= */

function startNewChat() {

    messages = [];

    if (chatMessages) {
        chatMessages.innerHTML = "";
    }

    showWelcome();

    if (messageInput) {
        messageInput.value = "";
        messageInput.style.height = "auto";
        messageInput.focus();
    }

    closeSidebar();

}


on(newChatBtn, "click", startNewChat);


/* =========================================================
   WELCOME SCREEN
   ========================================================= */

function showWelcome() {

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
                    data-prompt="Explain this topic to me clearly and step by step."
                    type="button"
                >
                    <div class="suggestion-icon">+</div>

                    <div class="suggestion-content">
                        <strong>Explain something</strong>
                        <span>Learn a topic step by step</span>
                    </div>
                </button>


                <button
                    class="suggestion"
                    data-prompt="Help me solve this problem step by step."
                    type="button"
                >
                    <div class="suggestion-icon">?</div>

                    <div class="suggestion-content">
                        <strong>Solve a problem</strong>
                        <span>Work through a difficult question</span>
                    </div>
                </button>


                <button
                    class="suggestion"
                    data-prompt="Help me write and debug code."
                    type="button"
                >
                    <div class="suggestion-icon">&lt;/&gt;</div>

                    <div class="suggestion-content">
                        <strong>Write code</strong>
                        <span>Build, explain and debug code</span>
                    </div>
                </button>


                <button
                    class="suggestion"
                    data-prompt="Give me some creative ideas for a project."
                    type="button"
                >
                    <div class="suggestion-icon">*</div>

                    <div class="suggestion-content">
                        <strong>Brainstorm ideas</strong>
                        <span>Explore new possibilities</span>
                    </div>
                </button>

            </div>

        </div>
    `;


    const suggestionButtons =
        document.querySelectorAll(".suggestion");


    suggestionButtons.forEach(function (button) {

        button.addEventListener(
            "click",
            function () {

                const prompt =
                    button.getAttribute("data-prompt");

                if (!messageInput) return;

                messageInput.value = prompt || "";

                resizeInput();

                messageInput.focus();

            }
        );

    });

}


/* =========================================================
   INPUT AUTO RESIZE
   ========================================================= */

function resizeInput() {

    if (!messageInput) return;

    messageInput.style.height = "auto";

    const newHeight =
        Math.min(
            messageInput.scrollHeight,
            180
        );

    messageInput.style.height =
        newHeight + "px";

}


on(
    messageInput,
    "input",
    resizeInput
);


/* =========================================================
   ENTER TO SEND
   ========================================================= */

on(
    messageInput,
    "keydown",
    function (event) {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();

        }

    }
);


/* =========================================================
   SEND BUTTON
   ========================================================= */

on(
    sendBtn,
    "click",
    sendMessage
);


/* =========================================================
   SEND MESSAGE
   ========================================================= */

async function sendMessage() {

    if (isSending) return;

    if (!messageInput) return;

    const text =
        messageInput.value.trim();

    if (!text) return;


    isSending = true;

    setSendingState(true);


    removeWelcome();


    addUserMessage(text);


    messageInput.value = "";

    resizeInput();


    const assistant =
        addAssistantMessage();


    try {

        const answer =
            await callWorker(text);


        if (
            answer &&
            answer.trim()
        ) {

            setAssistantText(
                assistant,
                answer
            );

        } else {

            setAssistantText(
                assistant,
                "I received an empty response from the AI."
            );

        }


    } catch (error) {

        console.error(
            "LOGIC-LEAF AI error:",
            error
        );


        setAssistantText(
            assistant,
            "I couldn't connect to LOGIC-LEAF AI right now. Please try again."
        );

    }


    isSending = false;

    setSendingState(false);

    scrollToBottom();

}


/* =========================================================
   WORKER API
   ========================================================= */

async function callWorker(text) {

    const response =
        await fetch(
            API_URL + "/v1/chat",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Accept":
                        "application/json"
                },

                body: JSON.stringify({
                    message: text
                })
            }
        );


    const raw =
        await response.text();


    console.log(
        "Worker status:",
        response.status
    );

    console.log(
        "Worker response:",
        raw
    );


    if (!response.ok) {

        throw new Error(
            "Worker returned HTTP " +
            response.status
        );

    }


    let data;

    try {

        data =
            JSON.parse(raw);

    } catch (error) {

        throw new Error(
            "Worker did not return JSON."
        );

    }


    return extractResponse(data);

}


/* =========================================================
   RESPONSE EXTRACTION
   ========================================================= */

function extractResponse(data) {

    if (!data) {
        return "";
    }


    if (typeof data === "string") {
        return data;
    }


    const values = [

        data.response,

        data.answer,

        data.content,

        data.text,

        data.message,

        data.output,

        data.result,

        data.result?.response,

        data.result?.answer,

        data.result?.content,

        data.result?.text,

        data.result?.output,

        data.result?.message

    ];


    for (
        let i = 0;
        i < values.length;
        i++
    ) {

        const value = values[i];


        if (
            typeof value === "string" &&
            value.trim()
        ) {

            return value;

        }

    }


    /* OpenAI-style response */

    if (
        Array.isArray(data.choices) &&
        data.choices.length > 0
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


    /* AI response object */

    if (
        data.result &&
        typeof data.result === "object"
    ) {

        if (
            typeof data.result.response ===
                "string"
        ) {

            return data.result.response;

        }

        if (
            typeof data.result.text ===
                "string"
        ) {

            return data.result.text;

        }

    }


    return "";
}


/* =========================================================
   REMOVE WELCOME
   ========================================================= */

function removeWelcome() {

    if (!chatMessages) return;

    const welcome =
        chatMessages.querySelector(
            ".welcome"
        );


    if (welcome) {
        welcome.remove();
    }

}


/* =========================================================
   USER MESSAGE
   ========================================================= */

function addUserMessage(text) {

    if (!chatMessages) return;


    const wrapper =
        document.createElement("div");

    wrapper.className =
        "message user-message";


    const avatar =
        document.createElement("div");

    avatar.className =
        "message-avatar";

    avatar.textContent = "Y";


    const content =
        document.createElement("div");

    content.className =
        "message-content";

    content.textContent = text;


    wrapper.appendChild(avatar);

    wrapper.appendChild(content);


    chatMessages.appendChild(wrapper);


    messages.push({
        role: "user",
        content: text
    });


    addHistory(text);

    scrollToBottom();

}


/* =========================================================
   ASSISTANT MESSAGE
   ========================================================= */

function addAssistantMessage() {

    if (!chatMessages) return null;


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
        "Thinking";


    wrapper.appendChild(avatar);

    wrapper.appendChild(content);


    chatMessages.appendChild(wrapper);


    scrollToBottom();


    return {
        wrapper: wrapper,
        content: content
    };

}


/* =========================================================
   ASSISTANT TEXT
   ========================================================= */

function setAssistantText(assistant, text) {

    if (!assistant || !assistant.content) {
        return;
    }


    assistant.content.textContent = text;


    messages.push({
        role: "assistant",
        content: text
    });

}


/* =========================================================
   CHAT HISTORY
   ========================================================= */

function addHistory(text) {

    if (!history) return;


    const empty =
        history.querySelector(
            ".empty-history"
        );


    if (empty) {
        empty.remove();
    }


    const item =
        document.createElement("button");

    item.type = "button";

    item.className =
        "history-item";


    const title =
        document.createElement("span");


    title.textContent =
        text.length > 35
            ? text.substring(0, 35) + "..."
            : text;


    item.appendChild(title);


    item.addEventListener(
        "click",
        function () {

            if (messageInput) {

                messageInput.value =
                    text;

                resizeInput();

                messageInput.focus();

            }

            closeSidebar();

        }
    );


    history.prepend(item);

}


/* =========================================================
   SEND BUTTON STATE
   ========================================================= */

function setSendingState(sending) {

    if (!sendBtn) return;


    sendBtn.disabled = sending;


    if (sending) {

        sendBtn.classList.add(
            "sending"
        );

    } else {

        sendBtn.classList.remove(
            "sending"
        );

    }

}


/* =========================================================
   FILE ATTACHMENT
   ========================================================= */

on(
    attachmentBtn,
    "click",
    function () {

        if (fileInput) {
            fileInput.click();
        }

    }
);


on(
    fileInput,
    "change",
    function () {

        if (
            !fileInput ||
            !fileInput.files ||
            !fileInput.files.length
        ) {
            return;
        }


        const file =
            fileInput.files[0];


        if (!messageInput) return;


        messageInput.value =
            "Please help me with this file: " +
            file.name;


        resizeInput();

        messageInput.focus();

    }
);


/* =========================================================
   CAMERA
   ========================================================= */

on(
    cameraBtn,
    "click",
    function () {

        const camera =
            document.createElement("input");


        camera.type = "file";

        camera.accept =
            "image/*";

        camera.setAttribute(
            "capture",
            "environment"
        );


        camera.click();

    }
);


/* =========================================================
   IMAGE TOOL
   ========================================================= */

on(
    imageBtn,
    "click",
    function () {

        if (!messageInput) return;


        messageInput.value =
            "Create an image of ";


        resizeInput();

        messageInput.focus();

    }
);


/* =========================================================
   SCROLL
   ========================================================= */

function scrollToBottom() {

    if (!chatMessages) return;


    requestAnimationFrame(
        function () {

            chatMessages.scrollTop =
                chatMessages.scrollHeight;

        }
    );

}


/* =========================================================
   INITIALIZE
   ========================================================= */

showWelcome();

console.log(
    "LOGIC-LEAF AI initialized."
);

console.log(
    "API:",
    API_URL
);
