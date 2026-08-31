const API_BASE =
    "https://qtm-ai-new.qtmkiller6.workers.dev";

const API_URL =
    `${API_BASE}/v1/chat`;

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const menuBtn = document.getElementById("menuBtn");

const messageInput =
    document.getElementById("messageInput");

const sendBtn =
    document.getElementById("sendBtn");

const chatMessages =
    document.getElementById("chatMessages");

const newChatBtn =
    document.getElementById("newChatBtn");

const history =
    document.getElementById("history");

const attachmentBtn =
    document.getElementById("attachmentBtn");

const fileInput =
    document.getElementById("fileInput");


/* ================= SIDEBAR ================= */

function openSidebar() {
    sidebar.classList.add("open");
    overlay.classList.add("active");
}

function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("active");
}

if (menuBtn) {
    menuBtn.addEventListener("click", function () {
        if (sidebar.classList.contains("open")) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });
}

if (overlay) {
    overlay.addEventListener("click", closeSidebar);
}

document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
        closeSidebar();
    }
});


/* ================= MESSAGE ================= */

function addMessage(type, text) {

    const message =
        document.createElement("div");

    message.className =
        "message " + type;

    const content =
        document.createElement("div");

    content.className =
        "message-content";

    content.textContent = text;

    message.appendChild(content);

    chatMessages.appendChild(message);

    chatMessages.scrollTop =
        chatMessages.scrollHeight;

    return content;
}


/* ================= SEND ================= */

async function sendMessage() {

    const text =
        messageInput.value.trim();

    if (!text || sendBtn.disabled) {
        return;
    }

    addMessage("user", text);

    messageInput.value = "";

    messageInput.style.height = "auto";

    sendBtn.disabled = true;

    const aiMessage =
        addMessage(
            "assistant",
            "Thinking..."
        );

    try {

        const response =
            await fetch(API_URL, {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    message: text
                })
            });


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
            data = JSON.parse(raw);
        } catch {
            throw new Error(
                "Worker did not return JSON"
            );
        }


        const answer =
            data.response ||
            data.answer ||
            data.result ||
            data.message ||
            data.text;


        if (!answer) {
            throw new Error(
                "No AI response returned"
            );
        }


        aiMessage.textContent =
            String(answer);

    } catch (error) {

        console.error(
            "LOGIC-LEAF AI error:",
            error
        );

        aiMessage.textContent =
            "LOGIC-LEAF AI could not connect to the AI service.";

    } finally {

        sendBtn.disabled = false;

        messageInput.focus();
    }
}


/* ================= SEND BUTTON ================= */

sendBtn.addEventListener(
    "click",
    sendMessage
);


/* ================= ENTER ================= */

messageInput.addEventListener(
    "keydown",
    function (e) {

        if (
            e.key === "Enter" &&
            !e.shiftKey
        ) {

            e.preventDefault();

            sendMessage();
        }
    }
);


/* ================= TEXTAREA ================= */

messageInput.addEventListener(
    "input",
    function () {

        this.style.height = "auto";

        this.style.height =
            Math.min(
                this.scrollHeight,
                150
            ) + "px";
    }
);


/* ================= NEW CHAT ================= */

if (newChatBtn) {

    newChatBtn.addEventListener(
        "click",
        function () {

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
                        Ask anything. Learn,
                        create, analyze, solve
                        problems and explore ideas
                        with AI.
                    </p>

                </div>
            `;

            messageInput.value = "";

            closeSidebar();

            messageInput.focus();
        }
    );
}


/* ================= FILE ================= */

if (attachmentBtn && fileInput) {

    attachmentBtn.addEventListener(
        "click",
        function () {
            fileInput.click();
        }
    );

    fileInput.addEventListener(
        "change",
        function () {

            const file =
                fileInput.files[0];

            if (!file) return;

            addMessage(
                "assistant",
                "Selected file: " +
                file.name
            );
        }
    );
}


/* ================= CLOSE SIDEBAR ================= */

document.querySelectorAll(
    ".side-item"
).forEach(function (button) {

    button.addEventListener(
        "click",
        closeSidebar
    );
});


/* ================= START ================= */

console.log(
    "LOGIC-LEAF AI loaded"
);

console.log(
    "AI endpoint:",
    API_URL
);
