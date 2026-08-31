// ============================================================
// QTM AI - app.js
// Google Login + QTM AI Chat
// Worker: https://ck.qtmkiller6.workers.dev
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


// ============================================================
// FIREBASE
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyC_C_ACJcRupgX9jEUON1FsS58igSA45aw",
    authDomain: "logic-leaf.firebaseapp.com",
    databaseURL: "https://logic-leaf-default-rtdb.firebaseio.com",
    projectId: "logic-leaf",
    storageBucket: "logic-leaf.firebasestorage.app",
    messagingSenderId: "288673697563",
    appId: "1:288673697563:web:c14d08452b01568d1c8dbe",
    measurementId: "G-Z30K3K85LX"
};

const firebaseApp = initializeApp(firebaseConfig);

const auth = getAuth(firebaseApp);

const googleProvider = new GoogleAuthProvider();


// ============================================================
// QTM AI WORKER
// ============================================================

const API_URL =
    "https://ck.qtmkiller6.workers.dev/v1/chat";


// ============================================================
// ELEMENTS
// ============================================================

const chatMessages =
    document.getElementById("chatMessages");

const messageInput =
    document.getElementById("messageInput");

const sendBtn =
    document.getElementById("sendBtn");

const newChatBtn =
    document.getElementById("newChatBtn");

const attachmentBtn =
    document.getElementById("attachmentBtn");

const fileInput =
    document.getElementById("fileInput");

const cameraBtn =
    document.getElementById("cameraBtn");

const imageBtn =
    document.getElementById("imageBtn");

const sidebar =
    document.getElementById("sidebar");

const overlay =
    document.getElementById("overlay");

const menuBtn =
    document.getElementById("menuBtn");

const profileButton =
    document.querySelector(".profile-button");

const account =
    document.querySelector(".account");


// ============================================================
// STATE
// ============================================================

let isThinking = false;

let currentUser = null;


// ============================================================
// WELCOME
// ============================================================

function addWelcomeMessage() {

    if (!chatMessages) return;

    chatMessages.innerHTML = "";

    const welcome =
        document.createElement("div");

    welcome.className =
        "welcome-message";

    welcome.innerHTML = `
        <div class="welcome-logo">Q</div>

        <h1>How can I help you?</h1>

        <p>
            Ask QTM AI anything — study,
            coding, problem solving,
            ideas and more.
        </p>
    `;

    chatMessages.appendChild(welcome);
}


// ============================================================
// ADD MESSAGE
// ============================================================

function addMessage(text, type, thinking = false) {

    const message =
        document.createElement("div");

    message.className =
        `message ${type}`;

    if (thinking) {
        message.classList.add("thinking");
    }

    const avatar =
        document.createElement("div");

    avatar.className =
        "message-avatar";

    if (type === "user") {

        avatar.textContent = "You";

    } else if (type === "error") {

        avatar.textContent = "!";

    } else {

        avatar.textContent = "Q";
    }

    const content =
        document.createElement("div");

    content.className =
        "message-content";

    const textElement =
        document.createElement("div");

    textElement.className =
        "message-text";

    textElement.textContent =
        text;

    content.appendChild(textElement);

    message.appendChild(avatar);

    message.appendChild(content);

    chatMessages.appendChild(message);

    scrollToBottom();

    return message;
}


// ============================================================
// SCROLL
// ============================================================

function scrollToBottom() {

    chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: "smooth"
    });
}


// ============================================================
// SEND MESSAGE TO QTM AI
// ============================================================

async function sendMessage() {

    if (isThinking) return;

    const message =
        messageInput.value.trim();

    if (!message) return;


    addMessage(
        message,
        "user"
    );

    messageInput.value = "";

    messageInput.style.height =
        "auto";


    isThinking = true;

    sendBtn.disabled = true;


    const thinking =
        addMessage(
            "QTM AI is thinking...",
            "ai",
            true
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

                    message: message,

                    user: currentUser
                        ? {
                            uid: currentUser.uid,
                            name: currentUser.displayName || "",
                            email: currentUser.email || ""
                        }
                        : null
                })
            });


        const data =
            await response.json();


        if (!response.ok || !data.ok) {

            throw new Error(
                data.error ||
                "AI request failed"
            );
        }


        thinking.remove();


        addMessage(
            data.reply ||
            "I couldn't generate a response.",
            "ai"
        );


    } catch (error) {

        console.error(
            "QTM AI Error:",
            error
        );


        thinking.remove();


        addMessage(
            "⚠️ QTM AI could not connect right now.\n\n" +
            "Please try again.",
            "error"
        );

    }


    isThinking = false;

    sendBtn.disabled = false;

    messageInput.focus();
}


// ============================================================
// ENTER TO SEND
// ============================================================

messageInput.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();
        }

    }
);


// ============================================================
// AUTO RESIZE
// ============================================================

messageInput.addEventListener(
    "input",
    function() {

        this.style.height =
            "auto";

        this.style.height =
            Math.min(
                this.scrollHeight,
                160
            ) + "px";

    }
);


// ============================================================
// SEND BUTTON
// ============================================================

sendBtn.addEventListener(
    "click",
    sendMessage
);


// ============================================================
// NEW CHAT
// ============================================================

newChatBtn.addEventListener(
    "click",
    function() {

        addWelcomeMessage();

        messageInput.focus();

        closeMobileMenu();

    }
);


// ============================================================
// GOOGLE LOGIN UI
// ============================================================

function updateUserUI(user) {

    currentUser = user;


    const avatarElements =
        document.querySelectorAll(
            ".account-avatar, .profile-button"
        );


    if (user) {

        const photo =
            user.photoURL;

        avatarElements.forEach(
            element => {

                if (photo) {

                    element.innerHTML = `
                        <img
                            src="${escapeHTML(photo)}"
                            alt="Profile"
                        >
                    `;

                } else {

                    element.textContent =
                        (
                            user.displayName ||
                            "U"
                        )
                        .charAt(0)
                        .toUpperCase();
                }

            }
        );


        const accountName =
            document.querySelector(
                ".account-info strong"
            );

        const accountEmail =
            document.querySelector(
                ".account-info span"
            );


        if (accountName) {

            accountName.textContent =
                user.displayName ||
                "Google User";
        }


        if (accountEmail) {

            accountEmail.textContent =
                user.email ||
                "Signed in with Google";
        }


    } else {

        avatarElements.forEach(
            element => {

                element.textContent =
                    "G";

            }
        );


        const accountName =
            document.querySelector(
                ".account-info strong"
            );

        const accountEmail =
            document.querySelector(
                ".account-info span"
            );


        if (accountName) {

            accountName.textContent =
                "Guest";
        }


        if (accountEmail) {

            accountEmail.textContent =
                "Sign in with Google";
        }

    }
}


// ============================================================
// GOOGLE SIGN IN
// ============================================================

async function googleLogin() {

    try {

        const result =
            await signInWithPopup(
                auth,
                googleProvider
            );


        updateUserUI(
            result.user
        );


        closeMobileMenu();


    } catch (error) {

        console.error(
            "Google Login Error:",
            error
        );


        alert(
            "Google Login failed.\n\n" +
            error.message
        );
    }
}


// ============================================================
// LOGOUT
// ============================================================

async function googleLogout() {

    try {

        await signOut(auth);

        updateUserUI(null);

    } catch (error) {

        console.error(
            "Logout Error:",
            error
        );
    }
}


// ============================================================
// ACCOUNT CLICK
// ============================================================

if (account) {

    account.addEventListener(
        "click",
        function() {

            if (currentUser) {

                const logout =
                    confirm(
                        "Sign out of QTM AI?"
                    );

                if (logout) {
                    googleLogout();
                }

            } else {

                googleLogin();

            }

        }
    );
}


// ============================================================
// PROFILE BUTTON
// ============================================================

if (profileButton) {

    profileButton.addEventListener(
        "click",
        function() {

            if (currentUser) {

                const logout =
                    confirm(
                        "Sign out of QTM AI?"
                    );

                if (logout) {
                    googleLogout();
                }

            } else {

                googleLogin();

            }

        }
    );
}


// ============================================================
// FIREBASE AUTH STATE
// ============================================================

onAuthStateChanged(
    auth,
    function(user) {

        updateUserUI(user);

    }
);


// ============================================================
// ATTACH FILE
// ============================================================

if (
    attachmentBtn &&
    fileInput
) {

    attachmentBtn.addEventListener(
        "click",
        function() {

            fileInput.removeAttribute(
                "capture"
            );

            fileInput.setAttribute(
                "accept",
                ".pdf,.txt,.csv,.json,.doc,.docx,image/*"
            );

            fileInput.click();

        }
    );


    fileInput.addEventListener(
        "change",
        function() {

            const file =
                this.files[0];

            if (!file) return;


            addMessage(
                `📎 ${file.name}\n\n` +
                "File selected. Full AI file analysis will be connected in the next backend feature.",
                "ai"
            );


            this.value = "";

        }
    );
}


// ============================================================
// CAMERA
// ============================================================

if (cameraBtn) {

    cameraBtn.addEventListener(
        "click",
        function() {

            if (!fileInput) return;


            fileInput.setAttribute(
                "accept",
                "image/*"
            );


            fileInput.setAttribute(
                "capture",
                "environment"
            );


            fileInput.click();

        }
    );
}


// ============================================================
// IMAGE GENERATION
// ============================================================

if (imageBtn) {

    imageBtn.addEventListener(
        "click",
        function() {

            messageInput.value =
                "Create an image of ";

            messageInput.focus();

        }
    );
}


// ============================================================
// MOBILE MENU
// ============================================================

function closeMobileMenu() {

    if (sidebar) {
        sidebar.classList.remove(
            "open"
        );
    }

    if (overlay) {
        overlay.classList.remove(
            "show"
        );
    }
}


if (menuBtn) {

    menuBtn.addEventListener(
        "click",
        function() {

            sidebar.classList.toggle(
                "open"
            );

            overlay.classList.toggle(
                "show"
            );

        }
    );
}


if (overlay) {

    overlay.addEventListener(
        "click",
        closeMobileMenu
    );
}


// ============================================================
// COPY AI RESPONSE
// ============================================================

chatMessages.addEventListener(
    "click",
    async function(event) {

        const target =
            event.target;


        if (
            !target.classList.contains(
                "message-text"
            )
        ) {
            return;
        }


        const message =
            target.closest(
                ".message"
            );


        if (
            !message ||
            !message.classList.contains(
                "ai"
            )
        ) {
            return;
        }


        try {

            await navigator.clipboard
                .writeText(
                    target.textContent
                );


            target.setAttribute(
                "data-copied",
                "Copied!"
            );


            setTimeout(
                function() {

                    target.removeAttribute(
                        "data-copied"
                    );

                },
                1200
            );

        } catch (error) {

            console.log(
                "Copy failed."
            );
        }

    }
);


// ============================================================
// BASIC HTML ESCAPE
// ============================================================

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ============================================================
// START
// ============================================================

addWelcomeMessage();

messageInput.focus();

console.log(
    "QTM AI ready."
);

console.log(
    "Worker:",
    API_URL
);
