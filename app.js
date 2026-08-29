/*
==================================================
QTM AI V2
FRONTEND
API KEY + CHAT
==================================================
*/

/*
  IMPORTANT:
  Change this to your Cloudflare Worker URL.

  Example:
  https://qtm-ai.yourname.workers.dev
*/

const API_URL =
  localStorage.getItem("qtm_api_url") ||
  "YOUR_WORKER_URL";


/* ELEMENTS */

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

const sidebar =
  document.getElementById("sidebar");


/* STATE */

let history = [];

let qtmApiKey =
  localStorage.getItem("qtm_api_key") || "";


/* =================================================
   API KEY
================================================= */

async function createApiKey() {

  try {

    const response =
      await fetch(
        API_URL + "/api/keys/create",
        {
          method: "POST"
        }
      );

    const data =
      await response.json();

    if (!response.ok || !data.api_key) {

      throw new Error(
        data.error ||
        "Could not create API key."
      );

    }

    qtmApiKey =
      data.api_key;

    localStorage.setItem(
      "qtm_api_key",
      qtmApiKey
    );

    console.log(
      "QTM API key created."
    );

    return qtmApiKey;

  } catch (error) {

    console.error(
      "API key error:",
      error
    );

    throw error;
  }
}


/* Get existing key or create one */

async function getApiKey() {

  if (qtmApiKey) {
    return qtmApiKey;
  }

  return await createApiKey();
}


/* =================================================
   ADD MESSAGE
================================================= */

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


/* =================================================
   CHAT TITLE
================================================= */

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
      Make sure we have a QTM API key.
    */

    const key =
      await getApiKey();


    /*
      Call V2 endpoint.
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
            messages: history
          })
        }
      );


    const data =
      await response.json();


    /*
      API error
    */

    if (!response.ok) {

      throw new Error(
        data.error ||
        "API error " +
        response.status
      );

    }


    /*
      Get AI answer
    */

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
      If the saved API key is invalid,
      remove it so a new one can be created.
    */

    if (
      error.message
        .toLowerCase()
        .includes("api key")
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
   SEND MESSAGE
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


    saveChatTitle(text);


    askQTM(text);

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
   QUICK PROMPTS
================================================= */

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


      /*
        Re-enable quick buttons
        after rebuilding the HTML.
      */

      messages
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


      promptBox.focus();

    }
  );


/* =================================================
   CLEAR CHAT
================================================= */

document
  .getElementById("clearBtn")
  .addEventListener(
    "click",
    function() {

      history = [];

      messages.innerHTML = "";

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

      sidebar.classList.toggle(
        "open"
      );

    }
  );


/* =================================================
   ATTACH FILE
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
   FILE SELECT
================================================= */

document
  .getElementById("fileInput")
  .addEventListener(
    "change",
    function() {

      if (!this.files.length) {
        return;
      }


      const file =
        this.files[0];


      addMessage(
        "user",
        "📎 Attached: " +
        file.name
      );


      /*
        File understanding will be
        connected in the next backend upgrade.
      */

      addMessage(
        "assistant",
        "📎 File received: " +
        file.name +
        "\n\nFile analysis will be connected in the next QTM AI upgrade."
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
        "🖼 Image generation is planned for the next QTM AI upgrade."
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
        "📄 PDF generation is planned for the next QTM AI upgrade."
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

      const current =
        API_URL ===
        "YOUR_WORKER_URL"
          ? ""
          : API_URL;


      const url =
        prompt(
          "Enter your QTM AI Worker URL:",
          current
        );


      if (!url) {
        return;
      }


      const cleanURL =
        url
          .trim()
          .replace(/\/+$/, "");


      localStorage.setItem(
        "qtm_api_url",
        cleanURL
      );


      /*
        Keep existing API key if
        the Worker is unchanged.
      */

      location.reload();

    }
  );
