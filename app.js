/*
==================================================
QTM AI V2
FRONTEND
Cloudflare Worker + API Keys + Chat
==================================================
*/

const API_URL =
  "https://qtm-ai.qtmkiller6.workers.dev";


const messages =
  document.getElementById("messages");

const promptBox =
  document.getElementById("prompt");

const composer =
  document.getElementById("composer");

const chatList =
  document.getElementById("chatList");

const sendBtn =
  document.getElementById("sendBtn");


let history = [];

let qtmApiKey =
  localStorage.getItem("qtm_api_key") || "";


/* =================================================
   API REQUEST HELPER
================================================= */

async function readJSON(response) {

  const text =
    await response.text();

  try {

    return JSON.parse(text);

  } catch (error) {

    console.error(
      "Server returned non-JSON:",
      text
    );

    throw new Error(
      "Cloudflare Worker returned an invalid response."
    );
  }
}


/* =================================================
   CREATE QTM API KEY
================================================= */

async function createApiKey() {

  const response =
    await fetch(
      API_URL + "/api/keys/create",
      {
        method: "POST"
      }
    );


  const data =
    await readJSON(response);


  if (!response.ok) {

    throw new Error(
      data.error ||
      "Could not create QTM API key."
    );
  }


  if (!data.api_key) {

    throw new Error(
      "Worker did not return an API key."
    );
  }


  qtmApiKey =
    data.api_key;


  localStorage.setItem(
    "qtm_api_key",
    qtmApiKey
  );


  console.log(
    "QTM API key created successfully."
  );


  return qtmApiKey;
}


/* =================================================
   GET API KEY
================================================= */

async function getApiKey() {

  if (qtmApiKey) {

    return qtmApiKey;

  }


  return await createApiKey();
}


/* =================================================
   ADD MESSAGE
================================================= */

function addMessage(
  role,
  text
) {

  const welcome =
    messages.querySelector(
      ".welcome"
    );


  if (welcome) {
    welcome.remove();
  }


  const row =
    document.createElement(
      "div"
    );


  row.className =
    "message " + role;


  const bubble =
    document.createElement(
      "div"
    );


  bubble.className =
    "bubble";


  bubble.textContent =
    text;


  row.appendChild(
    bubble
  );


  messages.appendChild(
    row
  );


  messages.scrollTop =
    messages.scrollHeight;


  return bubble;
}


/* =================================================
   CHAT TITLE
================================================= */

function saveChatTitle(text) {

  if (
    chatList.children.length > 0
  ) {

    return;

  }


  const item =
    document.createElement(
      "div"
    );


  item.className =
    "chat-item";


  item.textContent =
    text.substring(
      0,
      40
    );


  chatList.appendChild(
    item
  );
}


/* =================================================
   ASK QTM AI
================================================= */

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


  sendBtn.disabled = true;


  try {

    /*
    Get QTM API key.
    */

    const key =
      await getApiKey();


    /*
    Send conversation
    to Cloudflare Worker.
    */

    const response =
      await fetch(
        API_URL + "/v1/chat",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "X-QTM-Key":
              key
          },

          body: JSON.stringify({
            messages:
              history
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
        "Chat API error: " +
        response.status
      );
    }


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

    console.error(
      "QTM AI error:",
      error
    );


    bubble.textContent =
      "QTM AI couldn't respond.\n\n" +
      error.message;


    /*
    If the API key is invalid,
    remove it and allow a new
    one to be created next time.
    */

    if (
      error.message
        .toLowerCase()
        .includes("invalid qtm api key")
    ) {

      localStorage.removeItem(
        "qtm_api_key"
      );

      qtmApiKey = "";

    }

  }


  sendBtn.disabled = false;

  promptBox.focus();
}


/* =================================================
   SEND
================================================= */

composer.addEventListener(
  "submit",
  function(event) {

    event.preventDefault();


    const text =
      promptBox.value.trim();


    if (!text) {
      return;
    }


    promptBox.value = "";


    saveChatTitle(
      text
    );


    askQTM(
      text
    );

  }
);


/* =================================================
   ENTER TO SEND
================================================= */

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


/* =================================================
   QUICK BUTTONS
================================================= */

function setupQuickButtons() {

  document
    .querySelectorAll(
      ".quick button"
    )
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

}


setupQuickButtons();


/* =================================================
   NEW CHAT
================================================= */

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
            Welcome to QTM AI.
            Ask questions, study,
            create and explore.
          </p>

          <div class="quick">

            <button
              data-prompt="Explain this topic simply">
              📚 Explain a topic
            </button>

            <button
              data-prompt="Help me study for an exam">
              🎓 Study help
            </button>

            <button
              data-prompt="Give me ideas for a project">
              💡 Project ideas
            </button>

            <button
              data-prompt="Create a PDF about renewable energy">
              📄 Create a PDF
            </button>

          </div>

        </div>
      `;


      setupQuickButtons();


      promptBox.focus();

    }
  );


/* =================================================
   CLEAR
================================================= */

document
  .getElementById("clearBtn")
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
            Welcome to QTM AI.
            Ask questions, study,
            create and explore.
          </p>

        </div>
      `;


      promptBox.focus();

    }
  );


/* =================================================
   MOBILE MENU
================================================= */

document
  .getElementById("menuBtn")
  .addEventListener(
    "click",
    function() {

      document
        .getElementById("sidebar")
        .classList.toggle(
          "open"
        );

    }
  );


/* =================================================
   ATTACH
================================================= */

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


/* =================================================
   FILE
================================================= */

document
  .getElementById("fileInput")
  .addEventListener(
    "change",
    function() {

      if (
        !this.files.length
      ) {

        return;

      }


      const file =
        this.files[0];


      addMessage(
        "user",
        "📎 Attached: " +
        file.name
      );


      addMessage(
        "assistant",
        "📎 File received. File analysis will be added in a future QTM AI version."
      );


      this.value = "";

    }
  );


/* =================================================
   IMAGE
================================================= */

document
  .getElementById("imageBtn")
  .addEventListener(
    "click",
    function() {

      addMessage(
        "assistant",
        "🖼 Image generation will be connected in the next QTM AI upgrade."
      );

    }
  );


/* =================================================
   PDF
================================================= */

document
  .getElementById("pdfBtn")
  .addEventListener(
    "click",
    function() {

      addMessage(
        "assistant",
        "📄 PDF generation will be connected in the next QTM AI upgrade."
      );

    }
  );


/* =================================================
   SETTINGS
================================================= */

document
  .getElementById("settingsBtn")
  .addEventListener(
    "click",
    function() {

      alert(
        "QTM AI Worker is connected to:\n\n" +
        API_URL
      );

    }
  );
