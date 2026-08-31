/* =========================================================
   QTM AI — APP.JS
   Frontend controller
   Connected to:
   https://ck.qtmkiller6.workers.dev
   ========================================================= */

"use strict";

/* =========================
   CONFIG
========================= */

const API_URL = "https://ck.qtmkiller6.workers.dev";
const CHAT_ENDPOINT = `${API_URL}/v1/chat`;

const STORAGE_KEYS = {
    chats: "qtm_chats",
    currentChat: "qtm_current_chat",
    apiUrl: "qtm_api_url"
};


/* =========================
   DOM HELPERS
========================= */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);


/* =========================
   STATE
========================= */

let chats = [];
let currentChatId = null;
let isGenerating = false;


/* =========================
   INITIALIZE
========================= */

document.addEventListener("DOMContentLoaded", () => {

    loadChats();

    setupInterface();

    if (!currentChatId) {
        createNewChat(false);
    } else {
        renderCurrentChat();
    }

});


/* =========================
   STORAGE
========================= */

function loadChats() {

    try {

        const saved = localStorage.getItem(STORAGE_KEYS.chats);

        chats = saved ? JSON.parse(saved) : [];

        const savedCurrent =
            localStorage.getItem(STORAGE_KEYS.currentChat);

        currentChatId = savedCurrent || null;

    } catch (error) {

        console.error("Storage error:", error);

        chats = [];
        currentChatId = null;

    }

}


function saveChats() {

    localStorage.setItem(
        STORAGE_KEYS.chats,
        JSON.stringify(chats)
    );

    if (currentChatId) {

        localStorage.setItem(
            STORAGE_KEYS.currentChat,
            currentChatId
        );

    }

}


/* =========================
   CHAT OBJECT
========================= */

function createChatObject() {

    return {
        id:
            "chat_" +
            Date.now() +
            "_" +
            Math.random()
                .toString(36)
                .substring(2, 8),

        title: "New conversation",

        createdAt: Date.now(),

        messages: []
    };

}


/* =========================
   NEW CHAT
========================= */

function createNewChat(save = true) {

    const chat = createChatObject();

    chats.unshift(chat);

    currentChatId = chat.id;

    if (save) {
        saveChats();
    }

    renderSidebar();
    renderCurrentChat();

}


/* =========================
   CURRENT CHAT
========================= */

function getCurrentChat() {

    return chats.find(
        chat => chat.id === currentChatId
    );

}


/* =========================
   SETUP UI
========================= */

function setupInterface() {

    /* New chat */

    const newChatButtons = $$(
        "#newChat, .new-chat, [data-action='new-chat']"
    );

    newChatButtons.forEach(button => {

        button.addEventListener("click", () => {

            if (isGenerating) return;

            createNewChat();

        });

    });


    /* Send buttons */

    const sendButtons = $$(
        "#sendBtn, .send-btn, [data-action='send']"
    );

    sendButtons.forEach(button => {

        button.addEventListener("click", sendCurrentMessage);

    });


    /* Textarea */

    const input =
        $("#messageInput") ||
        $("#prompt") ||
        $("textarea");


    if (input) {

        input.addEventListener("keydown", (event) => {

            if (event.key === "Enter" && !event.shiftKey) {

                event.preventDefault();

                sendCurrentMessage();

            }

        });


        input.addEventListener("input", () => {

            autoResize(input);

        });

    }


    renderSidebar();

}


/* =========================
   SEND MESSAGE
========================= */

async function sendCurrentMessage() {

    if (isGenerating) return;

    const input =
        $("#messageInput") ||
        $("#prompt") ||
        $("textarea");

    if (!input) {

        console.error(
            "QTM AI: Message input not found."
        );

        return;

    }

    const message = input.value.trim();

    if (!message) return;

    const chat = getCurrentChat();

    if (!chat) return;


    /* Clear input */

    input.value = "";

    autoResize(input);


    /* Add user message */

    chat.messages.push({
        role: "user",
        content: message,
        timestamp: Date.now()
    });


    /* Automatically create title */

    if (
        chat.title === "New conversation" ||
        !chat.title
    ) {

        chat.title = createTitle(message);

    }


    saveChats();

    renderCurrentChat();
    renderSidebar();


    /* Generate */

    isGenerating = true;

    setGeneratingState(true);

    const loadingId = addLoadingMessage();


    try {

        const reply = await requestQTM(message, chat);

        removeLoadingMessage(loadingId);

        chat.messages.push({
            role: "assistant",
            content: reply,
            timestamp: Date.now()
        });

        saveChats();

        renderCurrentChat();

        renderSidebar();

    } catch (error) {

        console.error(error);

        removeLoadingMessage(loadingId);

        const errorMessage =
            getFriendlyError(error);

        chat.messages.push({
            role: "assistant",
            content: errorMessage,
            timestamp: Date.now(),
            error: true
        });

        saveChats();

        renderCurrentChat();

    } finally {

        isGenerating = false;

        setGeneratingState(false);

    }

}


/* =========================
   API REQUEST
========================= */

async function requestQTM(message, chat) {

    const controller = new AbortController();

    const timeout = setTimeout(
        () => controller.abort(),
        60000
    );


    try {

        const response = await fetch(
            CHAT_ENDPOINT,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },

                body: JSON.stringify({

                    message: message,

                    messages: chat.messages.map(item => ({
                        role: item.role,
                        content: item.content
                    })),

                    conversation_id: chat.id

                }),

                signal: controller.signal

            }
        );


        const text = await response.text();

        let data = null;

        try {

            data = text ? JSON.parse(text) : null;

        } catch {

            throw new Error(
                "The QTM AI server returned an invalid response."
            );

        }


        if (!response.ok) {

            throw new Error(
                data?.error ||
                data?.message ||
                `Server error ${response.status}`
            );

        }


        return extractAssistantReply(data);

    } finally {

        clearTimeout(timeout);

    }

}


/* =========================
   RESPONSE PARSER
========================= */

function extractAssistantReply(data) {

    if (!data) {

        throw new Error(
            "QTM AI returned an empty response."
        );

    }


    /* Common response formats */

    if (typeof data === "string") {
        return data;
    }


    if (typeof data.response === "string") {
        return data.response;
    }


    if (typeof data.reply === "string") {
        return data.reply;
    }


    if (typeof data.message === "string") {
        return data.message;
    }


    if (typeof data.answer === "string") {
        return data.answer;
    }


    if (typeof data.content === "string") {
        return data.content;
    }


    if (
        data.result &&
        typeof data.result === "string"
    ) {
        return data.result;
    }


    if (
        data.result &&
        typeof data.result.response === "string"
    ) {
        return data.result.response;
    }


    if (
        data.result &&
        typeof data.result.message === "string"
    ) {
        return data.result.message;
    }


    if (
        data.choices &&
        Array.isArray(data.choices) &&
        data.choices.length
    ) {

        const choice = data.choices[0];

        if (
            choice.message &&
            typeof choice.message.content === "string"
        ) {

            return choice.message.content;

        }

        if (typeof choice.text === "string") {

            return choice.text;

        }

    }


    throw new Error(
        "QTM AI returned an unknown response format."
    );

}


/* =========================
   SIDEBAR
========================= */

function renderSidebar() {

    const container =
        $("#chatList") ||
        $(".chat-list") ||
        $("#chats");


    if (!container) return;


    container.innerHTML = "";


    chats.forEach(chat => {

        const item = document.createElement("button");

        item.className =
            "chat-item" +
            (
                chat.id === currentChatId
                    ? " active"
                    : ""
            );

        item.type = "button";


        const title =
            chat.title ||
            "New conversation";


        item.innerHTML = `
            <span class="chat-item-icon">✦</span>
            <span class="chat-item-title"></span>
        `;


        const titleElement =
            item.querySelector(
                ".chat-item-title"
            );

        titleElement.textContent = title;


        item.addEventListener("click", () => {

            if (isGenerating) return;

            currentChatId = chat.id;

            saveChats();

            renderSidebar();
            renderCurrentChat();

        });


        container.appendChild(item);

    });

}


/* =========================
   CHAT RENDER
========================= */

function renderCurrentChat() {

    const chat = getCurrentChat();

    if (!chat) return;


    const container =
        $("#messages") ||
        $("#chatMessages") ||
        $(".messages") ||
        $(".chat-messages");


    if (!container) return;


    container.innerHTML = "";


    if (chat.messages.length === 0) {

        renderWelcome(container);

        return;

    }


    chat.messages.forEach(message => {

        renderMessage(
            container,
            message
        );

    });


    scrollToBottom();

}


/* =========================
   WELCOME
========================= */

function renderWelcome(container) {

    const welcome = document.createElement("div");

    welcome.className = "qtm-welcome";

    welcome.innerHTML = `
        <div class="welcome-orb">
            <span>Q</span>
        </div>

        <h1>What can I help you with?</h1>

        <p>
            Ask QTM AI anything. Start a conversation
            and explore what you can create.
        </p>
    `;

    container.appendChild(welcome);

}


/* =========================
   RENDER MESSAGE
========================= */

function renderMessage(container, message) {

    const wrapper =
        document.createElement("div");


    wrapper.className =
        "message-row " +
        (
            message.role === "user"
                ? "user-message"
                : "assistant-message"
        );


    const bubble =
        document.createElement("div");


    bubble.className = "message-bubble";


    if (message.error) {

        bubble.classList.add(
            "message-error"
        );

    }


    bubble.innerHTML =
        formatMessage(message.content);


    wrapper.appendChild(bubble);

    container.appendChild(wrapper);

}


/* =========================
   MESSAGE FORMATTER
========================= */

function formatMessage(text) {

    if (!text) return "";


    let safe = escapeHTML(text);


    /* Code blocks */

    safe = safe.replace(
        /```([\s\S]*?)```/g,
        (match, code) => {

            return `
                <pre class="code-block">
                    <code>${code.trim()}</code>
                </pre>
            `;

        }
    );


    /* Inline code */

    safe = safe.replace(
        /`([^`]+)`/g,
        "<code>$1</code>"
    );


    /* Bold */

    safe = safe.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
    );


    /* Italic */

    safe = safe.replace(
        /\*(.*?)\*/g,
        "<em>$1</em>"
    );


    /* Line breaks */

    safe = safe.replace(
        /\n/g,
        "<br>"
    );


    return safe;

}


/* =========================
   ESCAPE HTML
========================= */

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================
   LOADING MESSAGE
========================= */

function addLoadingMessage() {

    const container =
        $("#messages") ||
        $("#chatMessages") ||
        $(".messages") ||
        $(".chat-messages");


    if (!container) return null;


    const id =
        "loading_" +
        Date.now();


    const element =
        document.createElement("div");


    element.id = id;

    element.className =
        "message-row assistant-message qtm-loading";


    element.innerHTML = `
        <div class="message-bubble loading-bubble">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;


    container.appendChild(element);

    scrollToBottom();


    return id;

}


function removeLoadingMessage(id) {

    if (!id) return;

    const element =
        document.getElementById(id);

    if (element) {

        element.remove();

    }

}


/* =========================
   GENERATING STATE
========================= */

function setGeneratingState(active) {

    const buttons = $$(
        "#sendBtn, .send-btn, [data-action='send']"
    );


    buttons.forEach(button => {

        button.disabled = active;

        button.classList.toggle(
            "generating",
            active
        );

    });


    const input =
        $("#messageInput") ||
        $("#prompt") ||
        $("textarea");


    if (input) {

        input.disabled = active;

        input.placeholder =
            active
                ? "QTM AI is thinking..."
                : "Ask QTM AI anything...";

    }

}


/* =========================
   AUTO RESIZE
========================= */

function autoResize(element) {

    element.style.height = "auto";

    element.style.height =
        Math.min(
            element.scrollHeight,
            180
        ) + "px";

}


/* =========================
   SCROLL
========================= */

function scrollToBottom() {

    const container =
        $("#messages") ||
        $("#chatMessages") ||
        $(".messages") ||
        $(".chat-messages");


    if (!container) return;


    requestAnimationFrame(() => {

        container.scrollTop =
            container.scrollHeight;

    });

}


/* =========================
   CHAT TITLE
========================= */

function createTitle(message) {

    let title =
        message
            .replace(/\s+/g, " ")
            .trim();


    if (title.length > 36) {

        title =
            title.substring(0, 36)
            .trim() +
            "…";

    }


    return title || "New conversation";

}


/* =========================
   ERROR HANDLING
========================= */

function getFriendlyError(error) {

    if (
        error?.name ===
        "AbortError"
    ) {

        return "QTM AI took too long to respond. Please try again.";

    }


    const message =
        error?.message || "";


    if (
        message.includes(
            "Failed to fetch"
        )
    ) {

        return `
QTM AI could not connect to the server.

Please check that the Cloudflare Worker is online and that the /v1/chat endpoint is available.
        `.trim();

    }


    return (
        "QTM AI encountered an error: " +
        message
    );

}


/* =========================
   GLOBAL API
========================= */

window.QTM = {

    send: sendCurrentMessage,

    newChat: createNewChat,

    getCurrentChat,

    getChats: () => chats,

    clearChats: () => {

        chats = [];

        currentChatId = null;

        localStorage.removeItem(
            STORAGE_KEYS.chats
        );

        localStorage.removeItem(
            STORAGE_KEYS.currentChat
        );

        createNewChat();

    },

    api: API_URL

};


/* =========================
   DEBUG
========================= */

console.log(
    "%c QTM AI ",
    "font-weight:bold;font-size:18px"
);

console.log(
    "Worker:",
    API_URL
);

console.log(
    "Chat endpoint:",
    CHAT_ENDPOINT
);
