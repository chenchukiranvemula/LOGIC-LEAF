/*
==================================================
QTM AI V1
Frontend
==================================================
*/

/*
IMPORTANT:

After you deploy worker.js, replace:

YOUR_WORKER_URL

with your actual Cloudflare Worker URL.

Example:

https://qtm-ai.username.workers.dev
*/

const API_URL =
  localStorage.getItem("qtm_api_url") ||
  "YOUR_WORKER_URL";


const messages =
  document.getElementById("messages");

const promptBox =
  document.getElementById("prompt");

const composer =
  document.getElementById("composer");

const chatList =
  document.getElementById("chatList");


let history = [];


/* ADD MESSAGE */

function addMessage(role, text) {

  const welcome =
    messages.querySelector(".welcome");

  if (welcome) {
    welcome.remove();
  }

  const row =
    document.createElement("div");

  row.className =
    "message " + role;

  const bubble =
    document.createElement("div");

  bubble.className =
    "bubble";

  bubble.textContent =
    text;

  row.appendChild(bubble);

  messages.appendChild(row);

  messages.scrollTop =
    messages.scrollHeight;

  return bubble;
}


/* CHAT TITLE */

function saveChatTitle(text) {

  if (chatList.children.length > 0) {
    return;
  }

  const item =
    document.createElement("div");

  item.className =
    "chat-item";

  item.textContent =
    text.substring(0, 40);

  chatList.appendChild(item);
}


/* ASK QTM AI */

async function askQTM(text) {

  history.push({
    role: "user",
    content: text
  });

  addMessage(
    "user",
    text
  );

  const bubble =
    addMessage(
      "assistant",
      "Thinking..."
    );


  try {

    const response =
      await fetch(
        API_URL + "/api/chat",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            messages: history
          })
        }
      );


    if (!response.ok) {
      throw new Error(
        "API error " +
        response.status
      );
    }


    const data =
      await response.json();


    const answer =
      data.answer ||
      "QTM AI returned no answer.";


    bubble.textContent =
      answer;


    history.push({
      role: "assistant",
      content: answer
    });


  } catch (error) {

    bubble.textContent =
      "QTM AI is not connected yet.\n\n" +
      "Deploy worker.js and replace " +
      "YOUR_WORKER_URL in app.js with " +
      "your Worker URL.";

    console.error(error);
  }
}


/* SEND MESSAGE */

composer.addEventListener(
  "submit",
  function(event) {

    event.preventDefault();

    const text =
      promptBox.value.trim();

    if (!text) return;

    promptBox.value = "";

    saveChatTitle(text);

    askQTM(text);
  }
);


/* ENTER TO SEND */

promptBox.addEventListener(
  "keydown",
  function(event) {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      composer.requestSubmit();
    }
  }
);


/* QUICK BUTTONS */

document
  .querySelectorAll(".quick button")
  .forEach(button => {

    button.addEventListener(
      "click",
      function() {

        promptBox.value =
          button.dataset.prompt;

        composer.requestSubmit();
      }
    );

  });


/* NEW CHAT */

document
  .getElementById("newChat")
  .addEventListener(
    "click",
    function() {

      history = [];

      messages.innerHTML = `
        <div class="welcome">

          <div class="logo-orb">
            Q
          </div>

          <h1>
            How can I help you?
          </h1>

          <p>
            Start a new QTM AI conversation.
          </p>

        </div>
      `;
    }
  );


/* CLEAR */

document
  .getElementById("clearBtn")
  .addEventListener(
    "click",
    function() {

      history = [];

      messages.innerHTML = "";
    }
  );


/* MOBILE MENU */

document
  .getElementById("menuBtn")
  .addEventListener(
    "click",
    function() {

      document
        .getElementById("sidebar")
        .classList.toggle("open");

    }
  );


/* ATTACH */

document
  .getElementById("attachBtn")
  .addEventListener(
    "click",
    function() {

      document
        .getElementById("fileInput")
        .click();

    }
  );


/* FILE SELECT */

document
  .getElementById("fileInput")
  .addEventListener(
    "change",
    function() {

      if (!this.files.length) return;

      const file =
        this.files[0];

      addMessage(
        "user",
        "📎 Attached: " +
        file.name
      );

    }
  );


/* IMAGE */

document
  .getElementById("imageBtn")
  .addEventListener(
    "click",
    function() {

      addMessage(
        "assistant",
        "🖼 QTM Image generation will be connected in the next version."
      );

    }
  );


/* PDF */

document
  .getElementById("pdfBtn")
  .addEventListener(
    "click",
    function() {

      addMessage(
        "assistant",
        "📄 QTM PDF generation will be connected in the next version."
      );

    }
  );


/* SETTINGS */

document
  .getElementById("settingsBtn")
  .addEventListener(
    "click",
    function() {

      const url =
        prompt(
          "Enter your QTM AI Worker URL:",
          API_URL ===
          "YOUR_WORKER_URL"
            ? ""
            : API_URL
        );

      if (url) {

        localStorage.setItem(
          "qtm_api_url",
          url
        );

        location.reload();
      }

    }
  );
