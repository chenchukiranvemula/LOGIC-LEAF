/* =========================================================
   QTM AI — APP.JS
   Firebase Google Authentication
   ========================================================= */

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


/* =========================================================
   FIREBASE CONFIG
========================================================= */

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

const provider =
    new GoogleAuthProvider();


provider.setCustomParameters({
    prompt: "select_account"
});


/* =========================================================
   QTM API
========================================================= */

const API =
    "https://ck.qtmkiller6.workers.dev";

const CHAT_API =
    API + "/v1/chat";


/* =========================================================
   STORAGE
========================================================= */

const CHATS_KEY =
    "qtm_ai_chats";

const CURRENT_KEY =
    "qtm_ai_current";


let chats = [];
let currentChatId = null;
let currentUser = null;
let generating = false;


/* =========================================================
   DOM
========================================================= */

const loginScreen =
    document.getElementById(
        "loginScreen"
    );

const app =
    document.getElementById(
        "app"
    );

const googleLogin =
    document.getElementById(
        "googleLogin"
    );

const loginError =
    document.getElementById(
        "loginError"
    );

const messages =
    document.getElementById(
        "messages"
    );

const chatList =
    document.getElementById(
        "chatList"
    );

const input =
    document.getElementById(
        "input"
    );

const send =
    document.getElementById(
        "send"
    );

const newChat =
    document.getElementById(
        "newChat"
    );

const logout =
    document.getElementById(
        "logout"
    );


/* =========================================================
   GOOGLE LOGIN
========================================================= */

googleLogin.addEventListener(
    "click",
    async () => {

        setLoginState(true);

        clearLoginError();

        try {

            await signInWithPopup(
                auth,
                provider
            );

        } catch (error) {

            console.error(
                "Google Login:",
                error
            );

            showLoginError(
                getAuthError(error)
            );

            setLoginState(false);

        }

    }
);


/* =========================================================
   AUTH STATE
========================================================= */

onAuthStateChanged(
    auth,
    user => {

        if (user) {

            currentUser = user;

            showApplication();

        } else {

            currentUser = null;

            showLogin();

        }

    }
);


/* =========================================================
   SHOW LOGIN
========================================================= */

function showLogin() {

    loginScreen.classList.remove(
        "hidden"
    );

    app.classList.add(
        "hidden"
    );

    setLoginState(false);

}


/* =========================================================
   SHOW APPLICATION
========================================================= */

function showApplication() {

    loginScreen.classList.add(
        "hidden"
    );

    app.classList.remove(
        "hidden"
    );


    updateProfile();


    loadChats();


    if (
        !currentChatId ||
        !getCurrentChat()
    ) {

        createChat();

    } else {

        render();

    }

}


/* =========================================================
   PROFILE
========================================================= */

function updateProfile() {

    if (!currentUser)
        return;


    const username =
        document.getElementById(
            "username"
        );

    const email =
        document.getElementById(
            "email"
        );

    const avatar =
        document.getElementById(
            "avatar"
        );


    username.textContent =
        currentUser.displayName ||
        "Google User";


    email.textContent =
        currentUser.email ||
        "";


    avatar.src =
        currentUser.photoURL ||
        makeAvatar(
            currentUser.displayName
        );

}


/* =========================================================
   LOGOUT
========================================================= */

logout.addEventListener(
    "click",
    async () => {

        if (generating)
            return;


        try {

            await signOut(auth);

        } catch (error) {

            console.error(
                error
            );

        }

    }
);


/* =========================================================
   NEW CHAT
========================================================= */

newChat.addEventListener(
    "click",
    () => {

        if (!generating) {

            createChat();

        }

    }
);


function createChat() {

    const chat = {

        id:
            "chat_" +
            Date.now() +
            "_" +
            Math.random()
                .toString(36)
                .slice(2,8),

        title:
            "New conversation",

        messages: [],

        created:
            Date.now()

    };


    chats.unshift(
        chat
    );


    currentChatId =
        chat.id;


    saveChats();

    render();

}


/* =========================================================
   GET CHAT
========================================================= */

function getCurrentChat() {

    return chats.find(
        chat =>
            chat.id ===
            currentChatId
    );

}


/* =========================================================
   LOAD / SAVE
========================================================= */

function loadChats() {

    try {

        chats =
            JSON.parse(
                localStorage.getItem(
                    CHATS_KEY
                )
            ) || [];


        currentChatId =
            localStorage.getItem(
                CURRENT_KEY
            );

    } catch {

        chats = [];

        currentChatId = null;

    }

}


function saveChats() {

    localStorage.setItem(
        CHATS_KEY,
        JSON.stringify(
            chats
        )
    );


    if (currentChatId) {

        localStorage.setItem(
            CURRENT_KEY,
            currentChatId
        );

    }

}


/* =========================================================
   SEND
========================================================= */

send.addEventListener(
    "click",
    sendMessage
);


input.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
                "Enter" &&
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


/* =========================================================
   SEND MESSAGE
========================================================= */

async function sendMessage() {

    if (
        generating ||
        !currentUser
    )
        return;


    const text =
        input.value.trim();


    if (!text)
        return;


    const chat =
        getCurrentChat();


    if (!chat)
        return;


    input.value = "";

    input.style.height =
        "auto";


    chat.messages.push({

        role:
            "user",

        content:
            text

    });


    if (
        chat.title ===
        "New conversation"
    ) {

        chat.title =
            text.length > 40
                ? text.slice(0,40) + "..."
                : text;

    }


    saveChats();

    render();


    generating = true;

    send.disabled = true;

    input.disabled = true;

    input.placeholder =
        "QTM AI is thinking...";


    const loading =
        addLoading();


    try {

        const answer =
            await askAI(
                text,
                chat
            );


        loading.remove();


        chat.messages.push({

            role:
                "assistant",

            content:
                answer

        });


        saveChats();

        render();


    } catch (error) {

        console.error(
            error
        );


        loading.remove();


        chat.messages.push({

            role:
                "assistant",

            content:
                "⚠️ " +
                error.message

        });


        saveChats();

        render();

    } finally {

        generating = false;

        send.disabled = false;

        input.disabled = false;

        input.placeholder =
            "Ask QTM AI anything...";

    }

}


/* =========================================================
   CALL CLOUDFLARE WORKER
========================================================= */

async function askAI(
    text,
    chat
) {

    /*
       Get Firebase ID token.

       This token proves that the user
       is authenticated with Firebase.
    */

    const idToken =
        await currentUser.getIdToken(
            true
        );


    const response =
        await fetch(
            CHAT_API,
            {

                method:
                    "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        "Bearer " +
                        idToken

                },

                body:
                    JSON.stringify({

                        message:
                            text,

                        messages:
                            chat.messages
                                .slice(-12)
                                .map(
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


    const raw =
        await response.text();


    let data;


    try {

        data =
            JSON.parse(
                raw
            );

    } catch {

        throw new Error(
            "QTM Worker returned invalid JSON."
        );

    }


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
   EXTRACT ANSWER
========================================================= */

function extractAnswer(data) {

    if (
        typeof data ===
        "string"
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
        typeof data.reply ===
        "string"
    ) {

        return data.reply;

    }


    if (
        data.result &&
        typeof data.result.response ===
        "string"
    ) {

        return data.result.response;

    }


    if (
        data.choices &&
        data.choices[0]
    ) {

        return (
            data.choices[0]
                ?.message
                ?.content ||
            data.choices[0]
                ?.text
        );

    }


    throw new Error(
        "AI returned an unknown response."
    );

}


/* =========================================================
   RENDER
========================================================= */

function render() {

    renderChats();

    renderMessages();

}


/* =========================================================
   CHAT LIST
========================================================= */

function renderChats() {

    chatList.innerHTML = "";


    chats.forEach(
        chat => {

            const item =
                document.createElement(
                    "button"
                );


            item.className =
                "chat-item" +
                (
                    chat.id ===
                    currentChatId
                        ? " active"
                        : ""
                );


            item.innerHTML = `
                <span class="chat-icon">✦</span>
                <span class="chat-title"></span>
            `;


            item.querySelector(
                ".chat-title"
            ).textContent =
                chat.title;


            item.addEventListener(
                "click",
                () => {

                    if (generating)
                        return;

                    currentChatId =
                        chat.id;

                    saveChats();

                    render();

                }
            );


            chatList.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   MESSAGES
========================================================= */

function renderMessages() {

    messages.innerHTML = "";


    const chat =
        getCurrentChat();


    if (!chat)
        return;


    if (
        chat.messages.length === 0
    ) {

        messages.innerHTML = `

            <div class="welcome">

                <div class="welcome-logo">
                    Q
                </div>

                <h2>
                    What can I help you with?
                </h2>

                <p>
                    Ask QTM AI anything and start
                    your next conversation.
                </p>

            </div>

        `;

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
                formatMessage(
                    message.content
                );


            row.appendChild(
                bubble
            );


            messages.appendChild(
                row
            );

        }
    );


    scrollBottom();

}


/* =========================================================
   FORMAT MESSAGE
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


function formatMessage(text) {

    let value =
        escapeHTML(
            text || ""
        );


    value =
        value.replace(
            /```([\s\S]*?)```/g,
            (_, code) => {

                return `
                    <pre><code>${code.trim()}</code></pre>
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

function addLoading() {

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


    messages.appendChild(
        row
    );


    scrollBottom();


    return row;

}


/* =========================================================
   SCROLL
========================================================= */

function scrollBottom() {

    requestAnimationFrame(
        () => {

            messages.scrollTop =
                messages.scrollHeight;

        }
    );

}


/* =========================================================
   LOGIN HELPERS
========================================================= */

function setLoginState(
    loading
) {

    googleLogin.disabled =
        loading;


    googleLogin.style.opacity =
        loading ? ".6" : "1";


    googleLogin.innerHTML =
        loading
            ? "Signing in..."
            : `
                <span class="google-icon">G</span>
                <span>Continue with Google</span>
            `;

}


function showLoginError(
    text
) {

    loginError.textContent =
        text;

}


function clearLoginError() {

    loginError.textContent =
        "";

}


function getAuthError(
    error
) {

    switch (
        error?.code
    ) {

        case
            "auth/popup-closed-by-user":

            return "Google sign-in was cancelled.";

        case
            "auth/popup-blocked":

            return "Your browser blocked the Google sign-in popup.";

        case
            "auth/unauthorized-domain":

            return "This website is not authorized in Firebase Authentication.";

        case
            "auth/network-request-failed":

            return "Network error. Check your internet connection.";

        default:

            return (
                error?.message ||
                "Google sign-in failed."
            );

    }

}


/* =========================================================
   AVATAR
========================================================= */

function makeAvatar(
    name
) {

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
   DEBUG
========================================================= */

window.QTM = {

    API,

    CHAT_API,

    getUser:
        () => currentUser,

    newChat:
        createChat

};


console.log(
    "QTM AI loaded."
);

console.log(
    "QTM API:",
    API
);
