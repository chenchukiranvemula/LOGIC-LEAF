/* =========================================================
   LOGIC-LEAF AI
   Firebase + Google Login + Cloudflare AI
   Developer: V. CHENCHUKIRAN
   Cloud Security & DevSecOps
   ========================================================= */

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


/* =========================================================
   CONFIG
   ========================================================= */

const API_URL =
    "https://ck.qtmkiller6.workers.dev";


const firebaseConfig = {

    apiKey:
        "AIzaSyC_C_ACJcRupgX9jEUON1FsS58igSA45aw",

    authDomain:
        "logic-leaf.firebaseapp.com",

    databaseURL:
        "https://logic-leaf-default-rtdb.firebaseio.com",

    projectId:
        "logic-leaf",

    storageBucket:
        "logic-leaf.firebasestorage.app",

    messagingSenderId:
        "288673697563",

    appId:
        "1:288673697563:web:c14d08452b01568d1c8dbe",

    measurementId:
        "G-Z30K3K85LX"
};


/* =========================================================
   FIREBASE
   ========================================================= */

const firebaseApp =
    initializeApp(firebaseConfig);


const auth =
    getAuth(firebaseApp);


const googleProvider =
    new GoogleAuthProvider();


googleProvider.setCustomParameters({
    prompt: "select_account"
});


/* =========================================================
   DOM
   ========================================================= */

const $ = (id) =>
    document.getElementById(id);


const sidebar =
    $("sidebar");

const overlay =
    $("overlay");

const menuBtn =
    $("menuBtn");

const closeSidebarBtn =
    $("closeSidebar");

const newChatBtn =
    $("newChatBtn");

const sidebarSearch =
    $("sidebarSearch");

const searchBtn =
    $("searchBtn");

const notificationBtn =
    $("notificationBtn");

const profileButton =
    $("profileButton");

const accountCard =
    $("accountCard");

const accountMore =
    $("accountMore");

const accountMenu =
    $("accountMenu");

const accountLoginBtn =
    $("accountLoginBtn");

const accountLogoutBtn =
    $("accountLogoutBtn");

const settingsBtn =
    $("settingsBtn");

const settingsModal =
    $("settingsModal");

const closeSettings =
    $("closeSettings");

const settingsLoginBtn =
    $("settingsLoginBtn");

const logoutBtn =
    $("logoutBtn");

const helpBtn =
    $("helpBtn");

const chatMessages =
    $("chatMessages");

const messageInput =
    $("messageInput");

const sendBtn =
    $("sendBtn");

const attachmentBtn =
    $("attachmentBtn");

const cameraBtn =
    $("cameraBtn");

const imageBtn =
    $("imageBtn");

const fileInput =
    $("fileInput");

const history =
    $("history");

const userName =
    $("userName");

const userStatus =
    $("userStatus");

const userAvatar =
    $("userAvatar");


/* =========================================================
   STATE
   ========================================================= */

let conversation = [];

let isSending = false;

let currentUser = null;


/* =========================================================
   SIDEBAR
   ========================================================= */

function openSidebar() {

    sidebar?.classList.add("open");

    overlay?.classList.add("active");

}


function closeSidebarMenu() {

    sidebar?.classList.remove("open");

    overlay?.classList.remove("active");

}


menuBtn?.addEventListener(
    "click",
    openSidebar
);


closeSidebarBtn?.addEventListener(
    "click",
    closeSidebarMenu
);


overlay?.addEventListener(
    "click",
    closeSidebarMenu
);


document.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Escape") {

            closeSidebarMenu();

            closeSettingsModal();

            closeAccountMenu();

        }

    }
);


/* =========================================================
   WELCOME
   ========================================================= */

function showWelcome() {

    if (!chatMessages) return;


    chatMessages.innerHTML = `

        <div class="welcome">

            <div class="welcome-mark">
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
                    data-prompt="Explain this topic clearly and step by step."
                    type="button"
                >
                    <span class="suggestion-icon">+</span>

                    <span>
                        <strong>Explain something</strong>
                        <small>Learn a topic step by step</small>
                    </span>
                </button>

                <button
                    class="suggestion"
                    data-prompt="Help me solve this problem step by step."
                    type="button"
                >
                    <span class="suggestion-icon">?</span>

                    <span>
                        <strong>Solve a problem</strong>
                        <small>Work through the solution</small>
                    </span>
                </button>

                <button
                    class="suggestion"
                    data-prompt="Help me write and debug code."
                    type="button"
                >
                    <span class="suggestion-icon">&lt;/&gt;</span>

                    <span>
                        <strong>Write code</strong>
                        <small>Build and debug projects</small>
                    </span>
                </button>

                <button
                    class="suggestion"
                    data-prompt="Give me creative ideas for a project."
                    type="button"
                >
                    <span class="suggestion-icon">*</span>

                    <span>
                        <strong>Brainstorm</strong>
                        <small>Explore new possibilities</small>
                    </span>
                </button>

            </div>

        </div>
    `;


    document
        .querySelectorAll(".suggestion")
        .forEach((button) => {

            button.addEventListener(
                "click",
                () => {

                    messageInput.value =
                        button.dataset.prompt || "";

                    resizeInput();

                    messageInput.focus();

                }
            );

        });

}


showWelcome();


/* =========================================================
   INPUT
   ========================================================= */

function resizeInput() {

    if (!messageInput) return;

    messageInput.style.height =
        "auto";


    messageInput.style.height =
        Math.min(
            messageInput.scrollHeight,
            180
        ) + "px";

}


messageInput?.addEventListener(
    "input",
    resizeInput
);


messageInput?.addEventListener(
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


/* =========================================================
   SEND
   ========================================================= */

sendBtn?.addEventListener(
    "click",
    sendMessage
);


async function sendMessage() {

    if (isSending) return;


    const text =
        messageInput?.value.trim();


    if (!text) return;


    isSending = true;

    sendBtn.disabled = true;


    removeWelcome();


    addUserMessage(text);


    messageInput.value = "";

    resizeInput();


    const assistant =
        addAssistantMessage();


    try {

        const response =
            await callAI(text);


        if (response) {

            setAssistantMessage(
                assistant,
                response
            );

        } else {

            setAssistantMessage(
                assistant,
                "The AI returned an empty response."
            );

        }

    } catch (error) {

        console.error(
            "LOGIC-LEAF AI:",
            error
        );


        setAssistantMessage(
            assistant,
            "LOGIC-LEAF AI could not connect right now. Please try again."
        );

    }


    isSending = false;

    sendBtn.disabled = false;

    scrollBottom();

}


/* =========================================================
   CLOUDflare WORKER
   ========================================================= */

async function callAI(text) {

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
        "LOGIC-LEAF Worker:",
        response.status,
        raw
    );


    if (!response.ok) {

        throw new Error(
            "Worker HTTP " +
            response.status
        );

    }


    let data;


    try {

        data =
            JSON.parse(raw);

    } catch {

        throw new Error(
            "Worker returned invalid JSON"
        );

    }


    return extractAIResponse(data);

}


/* =========================================================
   RESPONSE PARSER
   ========================================================= */

function extractAIResponse(data) {

    if (!data) {
        return "";
    }


    if (
        typeof data ===
        "string"
    ) {

        return data;

    }


    const possible = [

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
        const value of possible
    ) {

        if (
            typeof value === "string" &&
            value.trim()
        ) {

            return value;

        }

    }


    if (
        Array.isArray(data.choices) &&
        data.choices.length
    ) {

        const choice =
            data.choices[0];


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


    return "";
}


/* =========================================================
   MESSAGES
   ========================================================= */

function removeWelcome() {

    chatMessages
        ?.querySelector(".welcome")
        ?.remove();

}


function addUserMessage(text) {

    const wrapper =
        document.createElement("div");


    wrapper.className =
        "message user-message";


    wrapper.innerHTML = `

        <div class="message-avatar">
            ${currentUser ? "Y" : "G"}
        </div>

        <div class="message-content"></div>
    `;


    wrapper
        .querySelector(".message-content")
        .textContent = text;


    chatMessages.appendChild(wrapper);


    conversation.push({
        role: "user",
        content: text
    });


    addHistory(text);

    scrollBottom();

}


function addAssistantMessage() {

    const wrapper =
        document.createElement("div");


    wrapper.className =
        "message assistant-message";


    wrapper.innerHTML = `

        <div class="message-avatar">
            L
        </div>

        <div class="message-content">
            Thinking...
        </div>
    `;


    chatMessages.appendChild(wrapper);


    scrollBottom();


    return wrapper;

}


function setAssistantMessage(
    wrapper,
    text
) {

    if (!wrapper) return;


    const content =
        wrapper.querySelector(
            ".message-content"
        );


    if (!content) return;


    content.textContent =
        text;


    conversation.push({
        role: "assistant",
        content: text
    });

}


/* =========================================================
   HISTORY
   ========================================================= */

function addHistory(text) {

    if (!history) return;


    const empty =
        history.querySelector(
            ".history-empty"
        );


    empty?.remove();


    const item =
        document.createElement("button");


    item.className =
        "history-item";


    item.type =
        "button";


    item.textContent =
        text.length > 42
            ? text.slice(0, 42) + "..."
            : text;


    item.addEventListener(
        "click",
        () => {

            messageInput.value =
                text;

            resizeInput();

            messageInput.focus();

            closeSidebarMenu();

        }
    );


    history.prepend(item);

}


/* =========================================================
   SCROLL
   ========================================================= */

function scrollBottom() {

    requestAnimationFrame(
        () => {

            chatMessages.scrollTop =
                chatMessages.scrollHeight;

        }
    );

}


/* =========================================================
   NEW CHAT
   ========================================================= */

newChatBtn?.addEventListener(
    "click",
    () => {

        conversation = [];

        showWelcome();

        messageInput.value = "";

        resizeInput();

        closeSidebarMenu();

        messageInput.focus();

    }
);


/* =========================================================
   SEARCH
   ========================================================= */

function searchChats() {

    const query =
        prompt("Search chats");


    if (!query) return;


    const items =
        history.querySelectorAll(
            ".history-item"
        );


    items.forEach(
        (item) => {

            item.style.display =
                item.textContent
                    .toLowerCase()
                    .includes(
                        query.toLowerCase()
                    )
                    ? "block"
                    : "none";

        }
    );

}


sidebarSearch?.addEventListener(
    "click",
    searchChats
);


searchBtn?.addEventListener(
    "click",
    searchChats
);


/* =========================================================
   NOTIFICATIONS
   ========================================================= */

notificationBtn?.addEventListener(
    "click",
    () => {

        alert(
            "LOGIC-LEAF AI notifications\n\nNo new notifications."
        );

    }
);


/* =========================================================
   GOOGLE LOGIN
   ========================================================= */

async function loginWithGoogle() {

    try {

        const result =
            await signInWithPopup(
                auth,
                googleProvider
            );


        currentUser =
            result.user;


        updateUserUI(
            currentUser
        );


        closeAccountMenu();

        closeSettingsModal();

        closeSidebarMenu();


    } catch (error) {

        console.error(
            "Google Login:",
            error
        );


        alert(
            "Google Login failed.\n\n" +
            error.message
        );

    }

}


async function logoutGoogle() {

    try {

        await signOut(auth);

        currentUser = null;

        updateUserUI(null);

        closeAccountMenu();

        closeSettingsModal();

    } catch (error) {

        console.error(
            "Sign out:",
            error
        );

    }

}


profileButton?.addEventListener(
    "click",
    loginWithGoogle
);


accountLoginBtn?.addEventListener(
    "click",
    loginWithGoogle
);


settingsLoginBtn?.addEventListener(
    "click",
    loginWithGoogle
);


accountLogoutBtn?.addEventListener(
    "click",
    logoutGoogle
);


logoutBtn?.addEventListener(
    "click",
    logoutGoogle
);


/* =========================================================
   AUTH STATE
   ========================================================= */

onAuthStateChanged(
    auth,
    (user) => {

        currentUser =
            user || null;

        updateUserUI(
            currentUser
        );

    }
);


/* =========================================================
   USER UI
   ========================================================= */

function updateUserUI(user) {

    if (!user) {

        if (userName) {
            userName.textContent =
                "Guest";
        }


        if (userStatus) {
            userStatus.textContent =
                "Sign in with Google";
        }


        if (userAvatar) {

            userAvatar.innerHTML =
                "G";

        }


        if (profileButton) {

            profileButton.innerHTML =
                "G";

        }

        return;

    }


    const name =
        user.displayName ||
        "Google User";


    const email =
        user.email ||
        "";


    if (userName) {

        userName.textContent =
            name;

    }


    if (userStatus) {

        userStatus.textContent =
            email;

    }


    if (user.photoURL) {

        if (userAvatar) {

            userAvatar.innerHTML = `

                <img
                    src="${escapeAttribute(user.photoURL)}"
                    alt="Profile"
                >

            `;

        }


        if (profileButton) {

            profileButton.innerHTML = `

                <img
                    src="${escapeAttribute(user.photoURL)}"
                    alt="Profile"
                >

            `;

        }

    } else {

        const letter =
            name
                .charAt(0)
                .toUpperCase();


        if (userAvatar) {

            userAvatar.textContent =
                letter;

        }


        if (profileButton) {

            profileButton.textContent =
                letter;

        }

    }

}


function escapeAttribute(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}


/* =========================================================
   ACCOUNT MENU
   ========================================================= */

function openAccountMenu() {

    accountMenu?.classList.add(
        "open"
    );

}


function closeAccountMenu() {

    accountMenu?.classList.remove(
        "open"
    );

}


accountMore?.addEventListener(
    "click",
    (event) => {

        event.stopPropagation();

        accountMenu
            ?.classList.toggle("open");

    }
);


document.addEventListener(
    "click",
    (event) => {

        if (
            accountMenu &&
            !accountMenu.contains(event.target) &&
            event.target !== accountMore
        ) {

            closeAccountMenu();

        }

    }
);


/* =========================================================
   SETTINGS
   ========================================================= */

function openSettingsModal() {

    settingsModal?.classList.add(
        "open"
    );

    closeSidebarMenu();

}


function closeSettingsModal() {

    settingsModal?.classList.remove(
        "open"
    );

}


settingsBtn?.addEventListener(
    "click",
    openSettingsModal
);


closeSettings?.addEventListener(
    "click",
    closeSettingsModal
);


settingsModal?.addEventListener(
    "click",
    (event) => {

        if (
            event.target ===
            settingsModal
        ) {

            closeSettingsModal();

        }

    }
);


/* =========================================================
   HELP
   ========================================================= */

helpBtn?.addEventListener(
    "click",
    () => {

        alert(
            "LOGIC-LEAF AI\n\n" +
            "An AI assistant for learning, " +
            "problem solving, coding and ideas.\n\n" +
            "Developer:\n" +
            "V. CHENCHUKIRAN\n" +
            "Cloud Security & DevSecOps"
        );

    }
);


/* =========================================================
   FILE ATTACHMENT
   ========================================================= */

attachmentBtn?.addEventListener(
    "click",
    () => {

        fileInput?.click();

    }
);


fileInput?.addEventListener(
    "change",
    () => {

        const file =
            fileInput.files?.[0];


        if (!file) return;


        messageInput.value =
            `Please help me with the attached file: ${file.name}`;


        resizeInput();

        messageInput.focus();

    }
);


/* =========================================================
   CAMERA
   ========================================================= */

cameraBtn?.addEventListener(
    "click",
    () => {

        const camera =
            document.createElement("input");


        camera.type =
            "file";


        camera.accept =
            "image/*";


        camera.setAttribute(
            "capture",
            "environment"
        );


        camera.click();


        camera.addEventListener(
            "change",
            () => {

                const file =
                    camera.files?.[0];


                if (!file) return;


                messageInput.value =
                    `Please help me with this camera image: ${file.name}`;


                resizeInput();

                messageInput.focus();

            }
        );

    }
);


/* =========================================================
   IMAGE BUTTON
   ========================================================= */

imageBtn?.addEventListener(
    "click",
    () => {

        messageInput.value =
            "Create an image of ";


        resizeInput();

        messageInput.focus();

    }
);


/* =========================================================
   MOBILE CLEANUP
   ========================================================= */

window.addEventListener(
    "resize",
    () => {

        if (
            window.innerWidth > 760
        ) {

            closeSidebarMenu();

        }

    }
);


/* =========================================================
   STARTUP
   ========================================================= */

console.log(
    "LOGIC-LEAF AI loaded"
);


console.log(
    "Cloudflare Worker:",
    API_URL
);


console.log(
    "Firebase project:",
    firebaseConfig.projectId
);
