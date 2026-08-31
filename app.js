"use strict";

/* =========================================================
   QTM AI — APP.JS
   ========================================================= */

const API_URL =
    "https://ck.qtmkiller6.workers.dev";

const CHAT_URL =
    API_URL + "/v1/chat";

const AUTH_URL =
    API_URL + "/api/auth/google";

const ME_URL =
    API_URL + "/api/auth/me";

const LOGOUT_URL =
    API_URL + "/api/auth/logout";


/*
   IMPORTANT:
   Replace this with your Google OAuth Web Client ID.

   Example:
   1234567890-abcdefg.apps.googleusercontent.com
*/

const GOOGLE_CLIENT_ID =
    "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";


const STORAGE_CHATS =
    "qtm_ai_chats";

const STORAGE_CURRENT =
    "qtm_ai_current";

const STORAGE_USER =
    "qtm_ai_user";


let chats = [];
let currentChatId = null;
let currentUser = null;
let generating = false;


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        loadLocalData();

        setupEvents();

        initializeGoogle();

        const authenticated =
            await restoreSession();

        if (authenticated) {

            showApp();

        }

    }
);


/* =========================================================
   GOOGLE LOGIN
========================================================= */

function initializeGoogle() {

    if (
        GOOGLE_CLIENT_ID.includes(
            "YOUR_GOOGLE_CLIENT_ID"
        )
    ) {

        console.warn(
            "QTM AI: Google Client ID has not been configured."
        );

        return;

    }


    const waitForGoogle =
        setInterval(
            () => {

                if (
                    window.google &&
                    google.accounts &&
                    google.accounts.id
                ) {

                    clearInterval(
                        waitForGoogle
                    );

                    google.accounts.id.initialize({

                        client_id:
                            GOOGLE_CLIENT_ID,

                        callback:
                            handleGoogleCredential,

                        auto_select:
                            false,

                        cancel_on_tap_outside:
                            true

                    });


                    const button =
                        document.getElementById(
                            "googleButton"
                        );


                    if (button) {

                        google.accounts.id.renderButton(

                            button,

                            {
                                type:
                                    "standard",

                                theme:
                                    "outline",

                                size:
                                    "large",

                                text:
                                    "signin_with",

                                shape:
                                    "rectangular",

                                logo_alignment:
                                    "left",

                                width:
                                    300

                            }

                        );

                    }

                }

            },
            100
        );


    setTimeout(
        () => clearInterval(waitForGoogle),
        10000
    );

}


/* =========================================================
   GOOGLE CREDENTIAL
========================================================= */

async function handleGoogleCredential(
    response
) {

    if (
        !response ||
        !response.credential
    ) {

        showLoginError(
            "Google did not return a valid credential."
        );

        return;

    }


    setLoginLoading(true);


    try {

        const result =
            await fetch(
                AUTH_URL,
                {

                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json"
                    },

                    credentials:
                        "include",

                    body:
                        JSON.stringify({

                            credential:
                                response.credential

                        })

                }
            );


        const data =
            await readJSON(result);


        if (!result.ok) {

            throw new Error(
                data.error ||
                "Google sign-in failed."
            );

        }


        currentUser =
            data.user;


        localStorage.setItem(
            STORAGE_USER,
            JSON.stringify(
                currentUser
            )
        );


        showApp();


    } catch (error) {

        console.error(
            "Google login error:",
            error
        );

        showLoginError(
            error.message ||
            "Unable to sign in."
        );

    } finally {

        setLoginLoading(false);

    }

}


/* =========================================================
   RESTORE SESSION
========================================================= */

async function restoreSession() {

    try {

        const response =
            await fetch(
                ME_URL,
                {
                    method:
                        "GET",

                    credentials:
                        "include",

                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );


        if (!response.ok) {

            return false;

        }


        const data =
            await readJSON(response);


        if (
            data &&
            data.authenticated &&
            data.user
        ) {

            currentUser =
                data.user;


            localStorage.setItem(
                STORAGE_USER,
                JSON.stringify(
                    currentUser
                )
            );


            return true;

        }


    } catch (error) {

        console.log(
            "No active server session."
        );

    }


    return false;

}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {

    try {

        await fetch(
            LOGOUT_URL,
            {
                method:
                    "POST",

                credentials:
                    "include"
            }
        );

    } catch (error) {

        console.warn(error);

    }


    currentUser = null;

    localStorage.removeItem(
        STORAGE_USER
    );


    document
        .getElementById("app")
        ?.classList.add("hidden");


    document
        .getElementById("loginScreen")
        ?.classList.remove("hidden");


    if (
        window.google &&
        google.accounts &&
        google.accounts.id
    ) {

        google.accounts.id.disableAutoSelect();

    }

}


/* =========================================================
   SHOW APP
========================================================= */

function showApp() {

    document
        .getElementById("loginScreen")
        ?.classList.add("hidden");


    document
        .getElementById("app")
        ?.classList.remove("hidden");


    updateUserUI();


    loadLocalData();


    if (
        !currentChatId ||
        !getCurrentChat()
    ) {

        createNewChat();

    } else {

        renderAll();

    }

}


/* =========================================================
   USER UI
========================================================= */

function updateUserUI() {

    if (!currentUser) return;


    const name =
        document.getElementById(
            "userName"
        );

    const email =
        document.getElementById(
            "userEmail"
        );

    const avatar =
        document.getElementById(
            "userAvatar"
        );


    if (name) {

        name.textContent =
            currentUser.name ||
            "Google User";

    }


    if (email) {

        email.textContent =
            currentUser.email ||
            "Signed in";

    }


    if (avatar) {

        avatar.src =
            currentUser.picture ||
            createAvatar(
                currentUser.name
            );

    }

}


/* =========================================================
   EVENTS
========================================================= */

function setupEvents() {

    document
        .getElementById("newChat")
        ?.addEventListener(
            "click",
            () => {

                if (!generating) {

                    createNewChat();

                }

            }
        );


    document
        .getElementById("sendBtn")
        ?.addEventListener(
            "click",
            sendMessage
        );


    document
        .getElementById("logoutButton")
        ?.addEventListener(
            "click",
            logout
        );


    const input =
        document.getElementById(
            "messageInput"
        );


    if (input) {

        input.addEventListener(
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


        input.addEventListener(
            "input",
            () => {

                input.style.height =
                    "auto";

                input.style.height =
                    Math.min(
                        input.scrollHeight,
                        180
                    ) + "px";

            }
        );

    }

}


/* =========================================================
   LOCAL DATA
========================================================= */

function loadLocalData() {

    try {

        chats =
            JSON.parse(
                localStorage.getItem(
                    STORAGE_CHATS
                )
            ) || [];


        currentChatId =
            localStorage.getItem(
                STORAGE_CURRENT
            );


    } catch {

        chats = [];

        currentChatId = null;

    }

}


function saveData() {

    localStorage.setItem(
        STORAGE_CHATS,
        JSON.stringify(chats)
    );


    if (currentChatId) {

        localStorage.setItem(
            STORAGE_CURRENT,
            currentChatId
        );

    }

}


/* =========================================================
   CHAT
========================================================= */

function createNewChat() {

    const chat = {

        id:
            "qtm_" +
            Date.now() +
            "_" +
            Math.random()
                .toString(36)
                .slice(2,8),

        title:
            "New conversation",

        messages: [],

        createdAt:
            Date.now()

    };


    chats.unshift(chat);

    currentChatId =
        chat.id;


    saveData();

    renderAll();

}


function getCurrentChat() {

    return chats.find(
        chat =>
            chat.id ===
            currentChatId
    );

}


/* =========================================================
   SEND MESSAGE
========================================================= */

async function sendMessage() {

    if (generating) return;


    if (!currentUser) {

        showLoginError(
            "Please sign in first."
        );

        return;

    }


    const input =
        document.getElementById(
            "messageInput"
        );


    if (!input) return;


    const text =
        input.value.trim();


    if (!text) return;


    const chat =
        getCurrentChat();


    if (!chat) return;


    input.value = "";

    input.style.height =
        "auto";


    chat.messages.push({

        role:
            "user",

        content:
            text,

        timestamp:
            Date.now()

    });


    if (
        chat.title ===
        "New conversation"
    ) {

        chat.title =
            text.length > 38
                ? text.slice(0,38) + "..."
                : text;

    }


    saveData();

    renderAll();


    generating = true;

    setGenerating(true);


    const loading =
        showLoading();


    try {

        const answer =
            await askQTM(
                text,
                chat
            );


        removeLoading(
            loading
        );


        chat.messages.push({

            role:
                "assistant",

            content:
                answer,

            timestamp:
                Date.now()

        });


        saveData();

        renderAll();


    } catch (error) {

        removeLoading(
            loading
        );


        chat.messages.push({

            role:
                "assistant",

            content:
                "QTM AI error:\n\n" +
                error.message,

            error:
                true,

            timestamp:
                Date.now()

        });


        saveData();

        renderAll();

    } finally {

        generating = false;

        setGenerating(false);

    }

}


/* =========================================================
   QTM API
========================================================= */

async function askQTM(
    text,
    chat
) {

    const response =
        await fetch(
            CHAT_URL,
            {

                method:
                    "POST",

                credentials:
                    "include",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Accept":
                        "application/json"
                },

                body:
                    JSON.stringify({

                        message:
                            text,

                        messages:
                            chat.messages.map(
                                item => ({

                                    role:
                                        item.role,

                                    content:
                                        item.content

                                })
                            ),

                        conversation_id:
                            chat.id

                    })

            }
        );


    const data =
        await readJSON(
            response
        );


    if (!response.ok) {

        throw new Error(
            data.error ||
            data.message ||
            "AI request failed."
        );

    }


    return extractAnswer(
        data
    );

}


/* =========================================================
   RESPONSE
========================================================= */

function extractAnswer(data) {

    if (
        typeof data ===
        "string"
    ) {

        return data;

    }


    const values = [

        data?.response,

        data?.reply,

        data?.answer,

        data?.content,

        data?.message

    ];


    for (
        const value of values
    ) {

        if (
            typeof value ===
            "string"
        ) {

            return value;

        }

    }


    if (
        data?.result &&
        typeof data.result ===
        "string"
    ) {

        return data.result;

    }


    if (
        data?.result?.response
    ) {

        return data.result.response;

    }


    if (
        Array.isArray(
            data?.choices
        )
    ) {

        const choice =
            data.choices[0];


        if (
            choice?.message?.content
        ) {

            return choice.message.content;

        }


        if (
            choice?.text
        ) {

            return choice.text;

        }

    }


    throw new Error(
        "Unknown AI response format."
    );

}


/* =========================================================
   RENDER
========================================================= */

function renderAll() {

    renderSidebar();

    renderMessages();

}


/* SIDEBAR */

function renderSidebar() {

    const list =
        document.getElementById(
            "chatList"
        );


    if (!list) return;


    list.innerHTML = "";


    chats.forEach(
        chat => {

            const button =
                document.createElement(
                    "button"
                );


            button.className =
                "chat-item" +
                (
                    chat.id ===
                    currentChatId
                        ? " active"
                        : ""
                );


            button.innerHTML = `

                <span class="chat-icon">
                    ✦
                </span>

                <span class="chat-title"></span>

            `;


            button
                .querySelector(
                    ".chat-title"
                )
                .textContent =
                    chat.title;


            button.addEventListener(
                "click",
                () => {

                    if (generating)
                        return;

                    currentChatId =
                        chat.id;

                    saveData();

                    renderAll();

                }
            );


            list.appendChild(
                button
            );

        }
    );

}


/* MESSAGES */

function renderMessages() {

    const area =
        document.getElementById(
            "messages"
        );


    if (!area) return;


    area.innerHTML = "";


    const chat =
        getCurrentChat();


    if (!chat) return;


    if (
        chat.messages.length === 0
    ) {

        renderWelcome(
            area
        );

        return;

    }


    chat.messages.forEach(
        message => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "message-row " +
                (
                    message.role ===
                    "user"
                        ? "user"
                        : "assistant"
                );


            const bubble =
                document.createElement(
                    "div"
                );


            bubble.className =
                "message";


            bubble.innerHTML =
                formatText(
                    message.content
                );


            row.appendChild(
                bubble
            );


            area.appendChild(
                row
            );

        }
    );


    scrollBottom();

}


/* WELCOME */

function renderWelcome(area) {

    const welcome =
        document.createElement(
            "div"
        );


    welcome.className =
        "welcome";


    welcome.innerHTML = `

        <div class="welcome-icon">
            Q
        </div>

        <h1>
            What can I help you with?
        </h1>

        <p>
            Ask QTM AI anything and
            start your next conversation.
        </p>

    `;


    area.appendChild(
        welcome
    );

}


/* =========================================================
   FORMAT
========================================================= */

function escapeHTML(text) {

    return String(text)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


function formatText(text) {

    let value =
        escapeHTML(
            text || ""
        );


    value =
        value.replace(
            /```([\s\S]*?)```/g,
            (_, code) => {

                return `
                    <pre><code>
                        ${code.trim()}
                    </code></pre>
                `;

            }
        );


    value =
        value.replace(
            /`([^`]+)`/g,
            "<code>$1</code>"
        );


    value =
        value.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );


    value =
        value.replace(
            /\n/g,
            "<br>"
        );


    return value;

}


/* =========================================================
   LOADING
========================================================= */

function showLoading() {

    const area =
        document.getElementById(
            "messages"
        );


    if (!area) return null;


    const row =
        document.createElement(
            "div"
        );


    row.className =
        "message-row assistant";


    row.innerHTML = `

        <div class="message loading">

            <span></span>
            <span></span>
            <span></span>

        </div>

    `;


    area.appendChild(
        row
    );


    scrollBottom();


    return row;

}


function removeLoading(element) {

    element?.remove();

}


/* =========================================================
   UI STATE
========================================================= */

function setGenerating(active) {

    const button =
        document.getElementById(
            "sendBtn"
        );


    const input =
        document.getElementById(
            "messageInput"
        );


    if (button) {

        button.disabled =
            active;

    }


    if (input) {

        input.disabled =
            active;

        input.placeholder =
            active
                ? "QTM AI is thinking..."
                : "Ask QTM AI anything...";

    }

}


/* =========================================================
   HELPERS
========================================================= */

async function readJSON(
    response
) {

    const text =
        await response.text();


    try {

        return text
            ? JSON.parse(text)
            : {};

    } catch {

        throw new Error(
            "Server returned invalid JSON."
        );

    }

}


function scrollBottom() {

    const area =
        document.getElementById(
            "messages"
        );


    if (!area) return;


    requestAnimationFrame(
        () => {

            area.scrollTop =
                area.scrollHeight;

        }
    );

}


function createAvatar(name) {

    const letter =
        encodeURIComponent(
            (
                name ||
                "Q"
            )
                .charAt(0)
                .toUpperCase()
        );


    return (
        "https://ui-avatars.com/api/" +
        "?name=" +
        letter +
        "&background=10251a" +
        "&color=72e8a0"
    );

}


/* =========================================================
   LOGIN UI
========================================================= */

function setLoginLoading(
    loading
) {

    const card =
        document.querySelector(
            ".login-card"
        );


    if (!card) return;


    card.classList.toggle(
        "loading-login",
        loading
    );

}


function showLoginError(
    message
) {

    let error =
        document.getElementById(
            "loginError"
        );


    if (!error) {

        error =
            document.createElement(
                "div"
            );

        error.id =
            "loginError";

        error.style.cssText = `
            color:#ff9a9a;
            font-size:11px;
            margin-top:14px;
            line-height:1.5;
        `;


        document
            .querySelector(
                ".google-area"
            )
            ?.after(error);

    }


    error.textContent =
        message;

}


/* =========================================================
   DEBUG
========================================================= */

window.QTM_AI = {

    api:
        API_URL,

    chat:
        CHAT_URL,

    newChat:
        createNewChat,

    send:
        sendMessage,

    logout:
        logout

};


console.log(
    "QTM AI frontend loaded."
);

console.log(
    "Worker:",
    API_URL
);

console.log(
    "Chat:",
    CHAT_URL
);
