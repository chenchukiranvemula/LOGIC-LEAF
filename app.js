"use strict";

/*
=========================================================
 LOGIC-LEAF FRONTEND
=========================================================

 Worker:
 https://logic-leaf.qtmkiller6.workers.dev

 Endpoints:
 /v1/chat
 /v1/vision
 /v1/file
 /v1/image
 /v1/pdf
 /v1/search
 /v1/history
 /v1/conversation
=========================================================
*/


const API_URL =
  "https://logic-leaf.qtmkiller6.workers.dev";


/* ===================================================== */
/* STATE */
/* ===================================================== */

let conversationId =
  localStorage.getItem("logic_leaf_conversation") ||
  crypto.randomUUID();

let userId =
  localStorage.getItem("logic_leaf_user") ||
  ("web-" + crypto.randomUUID());

let attachments = [];

let isGenerating = false;


/* ===================================================== */
/* DOM */
/* ===================================================== */

const $ = id =>
  document.getElementById(id);

const chat =
  $("chat");

const messageInput =
  $("messageInput");

const sendBtn =
  $("sendBtn");

const fileInput =
  $("fileInput");

const cameraInput =
  $("cameraInput");

const attachmentPreview =
  $("attachmentPreview");

const historyList =
  $("historyList");

const searchPanel =
  $("searchPanel");

const searchInput =
  $("searchInput");

const searchResults =
  $("searchResults");

const settingsModal =
  $("settingsModal");


/* ===================================================== */
/* INITIALIZE */
/* ===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  init
);


async function init() {

  localStorage.setItem(
    "logic_leaf_conversation",
    conversationId
  );

  localStorage.setItem(
    "logic_leaf_user",
    userId
  );

  setupEvents();

  await checkAPI();

  await loadHistory();

  await loadConversation();

}


/* ===================================================== */
/* EVENTS */
/* ===================================================== */

function setupEvents() {

  $("openSidebar").onclick =
    openSidebar;

  $("closeSidebar").onclick =
    closeSidebar;

  $("newChatBtn").onclick =
    newChat;

  $("attachBtn").onclick =
    () => fileInput.click();

  $("cameraBtn").onclick =
    () => cameraInput.click();

  $("imageBtn").onclick =
    generateImage;

  $("pdfBtn").onclick =
    generatePDF;

  $("searchBtn").onclick =
    toggleSearch;

  $("searchToggle").onclick =
    toggleSearch;

  $("runSearchBtn").onclick =
    runSearch;

  $("settingsBtn").onclick =
    () => settingsModal.classList.remove("hidden");

  $("closeSettings").onclick =
    () => settingsModal.classList.add("hidden");

  $("profileBtn").onclick =
    () => settingsModal.classList.remove("hidden");

  fileInput.onchange =
    handleFiles;

  cameraInput.onchange =
    handleFiles;

  sendBtn.onclick =
    sendMessage;

  messageInput.addEventListener(
    "input",
    autoResize
  );

  messageInput.addEventListener(
    "keydown",
    e => {

      if (
        e.key === "Enter" &&
        !e.shiftKey
      ) {

        e.preventDefault();

        sendMessage();
      }

    }
  );


  document
    .querySelectorAll(
      ".suggestions button"
    )
    .forEach(button => {

      button.onclick = () => {

        messageInput.value =
          button.dataset.prompt;

        autoResize();

        sendMessage();

      };

    });

}


/* ===================================================== */
/* SIDEBAR */
/* ===================================================== */

function openSidebar() {

  $("sidebar")
    .classList
    .remove("closed");

}

function closeSidebar() {

  $("sidebar")
    .classList
    .add("closed");

}


/* ===================================================== */
/* NEW CHAT */
/* ===================================================== */

function newChat() {

  conversationId =
    crypto.randomUUID();

  localStorage.setItem(
    "logic_leaf_conversation",
    conversationId
  );

  chat.innerHTML = `
    <div id="welcome" class="welcome">

      <div class="welcome-logo">
        LL
      </div>

      <h1>How can I help you?</h1>

      <p>
        Ask questions, solve problems, write code,
        analyze files, search knowledge, create images
        and generate documents.
      </p>

      <div class="suggestions">

        <button data-prompt="Explain quantum computing simply">
          <span>Explain</span>
          Quantum computing
        </button>

        <button data-prompt="Help me build a website">
          <span>Build</span>
          A website
        </button>

        <button data-prompt="Create a study plan for JEE">
          <span>Study</span>
          Create a study plan
        </button>

        <button data-prompt="Write a Python program to sort a list">
          <span>Code</span>
          Python program
        </button>

      </div>

    </div>
  `;

  document
    .querySelectorAll(
      ".suggestions button"
    )
    .forEach(button => {

      button.onclick = () => {

        messageInput.value =
          button.dataset.prompt;

        autoResize();

        sendMessage();

      };

    });

  attachments = [];

  renderAttachments();

  loadHistory();

  if (
    window.innerWidth <= 760
  ) {
    closeSidebar();
  }

}


/* ===================================================== */
/* API CHECK */
/* ===================================================== */

async function checkAPI() {

  const status =
    $("apiStatus");

  try {

    const response =
      await fetch(
        API_URL + "/",
        {
          method: "GET"
        }
      );

    const data =
      await response.json();

    if (
      response.ok &&
      data.ok
    ) {

      status.textContent =
        "Online";

      status.style.color =
        "#9ee7b0";

    } else {

      status.textContent =
        "Unavailable";

    }

  } catch (error) {

    status.textContent =
      "Connection failed";

  }

}


/* ===================================================== */
/* LOAD HISTORY */
/* ===================================================== */

async function loadHistory() {

  try {

    const response =
      await fetch(
        API_URL + "/v1/history",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            userId
          })
        }
      );

    const data =
      await response.json();

    if (
      !data.ok
    ) {
      return;
    }

    historyList.innerHTML = "";

    const chats =
      data.chats || [];

    if (
      chats.length === 0
    ) {

      historyList.innerHTML =
        `<div class="history-empty">
          No conversations yet
        </div>`;

      return;
    }

    chats.forEach(item => {

      const button =
        document.createElement("button");

      button.className =
        "history-item";

      if (
        item.conversation_id ===
        conversationId
      ) {
        button.classList.add("active");
      }

      button.textContent =
        item.title ||
        "New conversation";

      button.onclick =
        () => openConversation(
          item.conversation_id
        );

      historyList.appendChild(
        button
      );

    });

  } catch (error) {

    console.warn(
      "History error:",
      error
    );

  }

}


/* ===================================================== */
/* OPEN CONVERSATION */
/* ===================================================== */

async function openConversation(id) {

  conversationId = id;

  localStorage.setItem(
    "logic_leaf_conversation",
    id
  );

  await loadConversation();

  await loadHistory();

  if (
    window.innerWidth <= 760
  ) {
    closeSidebar();
  }

}


/* ===================================================== */
/* LOAD CONVERSATION */
/* ===================================================== */

async function loadConversation() {

  try {

    const response =
      await fetch(
        API_URL + "/v1/conversation",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            conversationId
          })
        }
      );

    const data =
      await response.json();

    if (
      !data.ok ||
      !Array.isArray(data.messages)
    ) {
      return;
    }

    if (
      data.messages.length === 0
    ) {
      return;
    }

    chat.innerHTML = "";

    data.messages.forEach(
      message => {

        if (
          message.role === "user"
        ) {

          addUserMessage(
            message.content
          );

        } else {

          addAIMessage(
            message.content
          );

        }

      }
    );

    scrollToBottom();

  } catch (error) {

    console.warn(
      "Conversation load error:",
      error
    );

  }

}


/* ===================================================== */
/* SEND MESSAGE */
/* ===================================================== */

async function sendMessage() {

  if (isGenerating) {
    return;
  }

  const text =
    messageInput.value.trim();

  if (
    !text &&
    attachments.length === 0
  ) {
    return;
  }

  isGenerating = true;

  sendBtn.disabled = true;

  const files =
    [...attachments];

  attachments = [];

  renderAttachments();

  const visibleText =
    text ||
    "Please analyze the attached file.";

  hideWelcome();

  addUserMessage(
    visibleText,
    files
  );

  messageInput.value = "";

  autoResize();

  const typing =
    addTyping();

  try {

    let answer;

    /*
    ================================================
    FILE / VISION
    ================================================
    */

    if (
      files.length > 0
    ) {

      const first =
        files[0];

      if (
        first.type.startsWith(
          "image/"
        )
      ) {

        answer =
          await visionRequest(
            first,
            text
          );

      } else {

        answer =
          await fileRequest(
            first,
            text
          );

      }

    } else {

      answer =
        await chatRequest(
          text,
          false
        );

    }

    typing.remove();

    addAIMessage(
      answer
    );

    await loadHistory();

  } catch (error) {

    console.error(error);

    typing.remove();

    addAIMessage(
      "I couldn't complete that request. Please check the Worker endpoint and try again.",
      true
    );

  }

  isGenerating = false;

  sendBtn.disabled = false;

}


/* ===================================================== */
/* CHAT REQUEST */
/* ===================================================== */

async function chatRequest(
  message,
  search = false
) {

  const response =
    await fetch(
      API_URL + "/v1/chat",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

          message,

          userId,

          conversationId,

          search: search

        })
      }
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    !data.ok
  ) {

    throw new Error(
      data.error ||
      "Chat request failed"
    );

  }

  if (
    data.conversationId
  ) {

    conversationId =
      data.conversationId;

    localStorage.setItem(
      "logic_leaf_conversation",
      conversationId
    );

  }

  return (
    data.answer ||
    "I couldn't generate a response."
  );

}


/* ===================================================== */
/* VISION REQUEST */
/* ===================================================== */

async function visionRequest(
  file,
  question
) {

  const base64 =
    await fileToBase64(file);

  const response =
    await fetch(
      API_URL + "/v1/vision",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

          message:
            question ||
            "Analyze this image.",

          userId,

          conversationId,

          fileName:
            file.name,

          mimeType:
            file.type,

          image:
            base64

        })
      }
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    !data.ok
  ) {

    throw new Error(
      data.error ||
      "Vision request failed"
    );

  }

  return (
    data.answer ||
    data.response ||
    "Image analysis completed."
  );

}


/* ===================================================== */
/* FILE REQUEST */
/* ===================================================== */

async function fileRequest(
  file,
  question
) {

  const base64 =
    await fileToBase64(file);

  const response =
    await fetch(
      API_URL + "/v1/file",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

          message:
            question ||
            "Analyze this file.",

          userId,

          conversationId,

          fileName:
            file.name,

          mimeType:
            file.type ||
            "application/octet-stream",

          file:
            base64

        })
      }
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    !data.ok
  ) {

    throw new Error(
      data.error ||
      "File request failed"
    );

  }

  return (
    data.answer ||
    data.response ||
    "File analysis completed."
  );

}


/* ===================================================== */
/* FILE TO BASE64 */
/* ===================================================== */

function fileToBase64(file) {

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();

      reader.onload = () => {

        const result =
          String(reader.result);

        const comma =
          result.indexOf(",");

        resolve(
          comma >= 0
            ? result.slice(
                comma + 1
              )
            : result
        );

      };

      reader.onerror =
        reject;

      reader.readAsDataURL(file);

    }
  );

}


/* ===================================================== */
/* IMAGE GENERATION */
/* ===================================================== */

async function generateImage() {

  if (isGenerating) {
    return;
  }

  const prompt =
    messageInput.value.trim();

  if (!prompt) {

    messageInput.focus();

    messageInput.placeholder =
      "Describe the image you want...";

    return;

  }

  isGenerating = true;

  sendBtn.disabled = true;

  hideWelcome();

  addUserMessage(
    "Create an image: " +
    prompt
  );

  messageInput.value = "";

  autoResize();

  const typing =
    addTyping();

  try {

    const response =
      await fetch(
        API_URL + "/v1/image",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            prompt
          })
        }
      );

    const contentType =
      response.headers.get(
        "content-type"
      ) || "";

    if (
      contentType.includes(
        "application/json"
      )
    ) {

      const data =
        await response.json();

      if (
        !response.ok ||
        data.ok === false
      ) {

        throw new Error(
          data.error ||
          "Image generation failed"
        );

      }

      const imageSource =
        extractImageSource(
          data
        );

      typing.remove();

      if (
        imageSource
      ) {

        addGeneratedImage(
          imageSource
        );

      } else {

        addAIMessage(
          data.answer ||
          "The image endpoint returned a response, but no image data was found."
        );

      }

    } else {

      const blob =
        await response.blob();

      if (
        !blob.type.startsWith(
          "image/"
        )
      ) {

        throw new Error(
          "Worker did not return an image."
        );

      }

      const imageURL =
        URL.createObjectURL(blob);

      typing.remove();

      addGeneratedImage(
        imageURL
      );

    }

  } catch (error) {

    typing.remove();

    addAIMessage(
      "Image generation failed: " +
      error.message,
      true
    );

  }

  isGenerating = false;

  sendBtn.disabled = false;

}


/* ===================================================== */
/* EXTRACT IMAGE */
/* ===================================================== */

function extractImageSource(
  data
) {

  const possible = [

    data.image,

    data.image_url,

    data.imageUrl,

    data.url,

    data.data,

    data.result?.image,

    data.result?.image_url,

    data.result?.url

  ];

  for (
    const value of possible
  ) {

    if (
      typeof value !==
      "string"
    ) {
      continue;
    }

    if (
      value.startsWith(
        "data:image/"
      )
    ) {
      return value;
    }

    if (
      value.startsWith(
        "http://"
      ) ||
      value.startsWith(
        "https://"
      )
    ) {
      return value;
    }

    /*
      Base64 image
    */

    if (
      value.length > 100
    ) {

      return (
        "data:image/png;base64," +
        value
      );

    }

  }

  return null;

}


/* ===================================================== */
/* GENERATED IMAGE UI */
/* ===================================================== */

function addGeneratedImage(
  src
) {

  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.className =
    "message ai";

  const label =
    document.createElement(
      "div"
    );

  label.className =
    "ai-label";

  label.textContent =
    "LOGIC-LEAF";

  const bubble =
    document.createElement(
      "div"
    );

  bubble.className =
    "message-bubble";

  const image =
    document.createElement(
      "img"
    );

  image.className =
    "generated-image";

  image.src =
    src;

  image.alt =
    "Generated image";

  const actions =
    document.createElement(
      "div"
    );

  actions.className =
    "image-actions";

  const download =
    document.createElement(
      "button"
    );

  download.textContent =
    "Download";

  download.onclick =
    () => downloadImage(
      src
    );

  actions.appendChild(
    download
  );

  bubble.appendChild(
    image
  );

  bubble.appendChild(
    actions
  );

  wrapper.appendChild(
    label
  );

  wrapper.appendChild(
    bubble
  );

  chat.appendChild(
    wrapper
  );

  scrollToBottom();

}


/* ===================================================== */
/* DOWNLOAD IMAGE */
/* ===================================================== */

async function downloadImage(
  src
) {

  try {

    const response =
      await fetch(src);

    const blob =
      await response.blob();

    const url =
      URL.createObjectURL(
        blob
      );

    const a =
      document.createElement(
        "a"
      );

    a.href = url;

    a.download =
      "logic-leaf-image.png";

    document.body.appendChild(a);

    a.click();

    a.remove();

    URL.revokeObjectURL(url);

  } catch {

    window.open(
      src,
      "_blank"
    );

  }

}


/* ===================================================== */
/* PDF / DOCUMENT */
/* ===================================================== */

async function generatePDF() {

  if (isGenerating) {
    return;
  }

  const prompt =
    messageInput.value.trim();

  if (!prompt) {

    messageInput.placeholder =
      "Describe the document you want...";

    messageInput.focus();

    return;

  }

  isGenerating = true;

  sendBtn.disabled = true;

  hideWelcome();

  addUserMessage(
    "Create a document: " +
    prompt
  );

  messageInput.value = "";

  autoResize();

  const typing =
    addTyping();

  try {

    const response =
      await fetch(
        API_URL + "/v1/pdf",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            prompt,

            title:
              "LOGIC-LEAF Document"

          })
        }
      );

    if (
      !response.ok
    ) {

      const data =
        await safeJSON(
          response
        );

      throw new Error(
        data?.error ||
        "Document generation failed"
      );

    }

    const html =
      await response.text();

    typing.remove();

    addDocumentResult(
      html
    );

  } catch (error) {

    typing.remove();

    addAIMessage(
      "Document generation failed: " +
      error.message,
      true
    );

  }

  isGenerating = false;

  sendBtn.disabled = false;

}


/* ===================================================== */
/* DOCUMENT RESULT */
/* ===================================================== */

function addDocumentResult(
  html
) {

  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.className =
    "message ai";

  const label =
    document.createElement(
      "div"
    );

  label.className =
    "ai-label";

  label.textContent =
    "LOGIC-LEAF DOCUMENT";

  const bubble =
    document.createElement(
      "div"
    );

  bubble.className =
    "message-bubble";

  const button =
    document.createElement(
      "button"
    );

  button.className =
    "image-actions";

  button.style.cssText =
    `
      border:1px solid rgba(255,255,255,.12);
      background:#151a22;
      color:#e5e9ee;
      padding:9px 12px;
      border-radius:9px;
      cursor:pointer;
      margin-bottom:10px;
    `;

  button.textContent =
    "Open / Save as PDF";

  button.onclick =
    () => {

      const win =
        window.open(
          "",
          "_blank"
        );

      if (!win) {
        alert(
          "Please allow pop-ups for LOGIC-LEAF."
        );
        return;
      }

      win.document.open();

      win.document.write(
        html
      );

      win.document.close();

    };

  bubble.appendChild(
    button
  );

  const info =
    document.createElement(
      "div"
    );

  info.textContent =
    "The generated document will open in a new tab. Use your browser's Print → Save as PDF option.";

  info.style.color =
    "#858d99";

  info.style.fontSize =
    "12px";

  bubble.appendChild(
    info
  );

  wrapper.appendChild(
    label
  );

  wrapper.appendChild(
    bubble
  );

  chat.appendChild(
    wrapper
  );

  scrollToBottom();

}


/* ===================================================== */
/* SEARCH */
/* ===================================================== */

function toggleSearch() {

  searchPanel
    .classList
    .toggle("open");

  if (
    searchPanel.classList.contains(
      "open"
    )
  ) {

    searchInput.focus();

  }

}


async function runSearch() {

  const query =
    searchInput.value.trim();

  if (!query) {
    return;
  }

  searchResults.innerHTML =
    `
      <div class="search-result">
        Searching...
      </div>
    `;

  try {

    const response =
      await fetch(
        API_URL + "/v1/search",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            query
          })
        }
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.ok
    ) {

      throw new Error(
        data.error ||
        "Search failed"
      );

    }

    searchResults.innerHTML = "";

    const results =
      data.results || [];

    if (
      results.length === 0
    ) {

      searchResults.innerHTML =
        `
          <div class="search-result">
            No indexed results found.
          </div>
        `;

      return;

    }

    results.forEach(
      result => {

        const div =
          document.createElement(
            "div"
          );

        div.className =
          "search-result";

        div.innerHTML =
          `
            <div class="search-source">
              ${escapeHTML(
                result.source ||
                "Indexed source"
              )}
            </div>

            <div class="search-text">
              ${escapeHTML(
                result.text ||
                ""
              )}
            </div>
          `;

        searchResults.appendChild(
          div
        );

      }
    );

  } catch (error) {

    searchResults.innerHTML =
      `
        <div class="search-result">
          Search failed:
          ${escapeHTML(
            error.message
          )}
        </div>
      `;

  }

}


/* ===================================================== */
/* FILES */
/* ===================================================== */

function handleFiles(
  event
) {

  const selected =
    Array.from(
      event.target.files || []
    );

  if (
    selected.length === 0
  ) {
    return;
  }

  /*
    Prevent huge uploads from
    silently exhausting browser memory.
  */

  const maxSize =
    20 * 1024 * 1024;

  selected.forEach(
    file => {

      if (
        file.size > maxSize
      ) {

        alert(
          file.name +
          " is larger than 20 MB."
        );

        return;

      }

      attachments.push(
        file
      );

    }
  );

  renderAttachments();

  event.target.value = "";

}


function renderAttachments() {

  if (
    attachments.length === 0
  ) {

    attachmentPreview
      .classList
      .add("hidden");

    attachmentPreview.innerHTML =
      "";

    return;

  }

  attachmentPreview
    .classList
    .remove("hidden");

  attachmentPreview.innerHTML =
    "";

  attachments.forEach(
    (file, index) => {

      const chip =
        document.createElement(
          "div"
        );

      chip.className =
        "attachment-chip";

      if (
        file.type.startsWith(
          "image/"
        )
      ) {

        const img =
          document.createElement(
            "img"
          );

        img.src =
          URL.createObjectURL(
            file
          );

        chip.appendChild(
          img
        );

      } else {

        const icon =
          document.createElement(
            "div"
          );

        icon.textContent =
          "FILE";

        icon.style.fontSize =
          "9px";

        icon.style.color =
          "#8e96a3";

        chip.appendChild(
          icon
        );

      }

      const info =
        document.createElement(
          "div"
        );

      info.className =
        "attachment-chip-info";

      info.innerHTML =
        `
          <strong>
            ${escapeHTML(
              file.name
            )}
          </strong>

          <span>
            ${formatBytes(
              file.size
            )}
          </span>
        `;

      chip.appendChild(
        info
      );

      const remove =
        document.createElement(
          "button"
        );

      remove.className =
        "remove-attachment";

      remove.textContent =
        "×";

      remove.onclick =
        () => {

          attachments.splice(
            index,
            1
          );

          renderAttachments();

        };

      chip.appendChild(
        remove
      );

      attachmentPreview.appendChild(
        chip
      );

    }
  );

}


/* ===================================================== */
/* MESSAGE UI */
/* ===================================================== */

function hideWelcome() {

  const welcome =
    $("welcome");

  if (welcome) {
    welcome.remove();
  }

}


function addUserMessage(
  text,
  files = []
) {

  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.className =
    "message user";

  const bubble =
    document.createElement(
      "div"
    );

  bubble.className =
    "message-bubble";

  bubble.textContent =
    text;

  if (
    files.length
  ) {

    const names =
      document.createElement(
        "div"
      );

    names.style.marginTop =
      "8px";

    names.style.color =
      "#929aa7";

    names.style.fontSize =
      "11px";

    names.textContent =
      files
        .map(
          file =>
            "📎 " + file.name
        )
        .join("\n");

    bubble.appendChild(
      names
    );

  }

  wrapper.appendChild(
    bubble
  );

  chat.appendChild(
    wrapper
  );

  scrollToBottom();

}


function addAIMessage(
  text,
  error = false
) {

  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.className =
    "message ai";

  if (error) {
    wrapper.classList.add(
      "error"
    );
  }

  const label =
    document.createElement(
      "div"
    );

  label.className =
    "ai-label";

  label.textContent =
    "LOGIC-LEAF";

  const bubble =
    document.createElement(
      "div"
    );

  bubble.className =
    "message-bubble";

  bubble.innerHTML =
    renderMarkdown(
      text
    );

  wrapper.appendChild(
    label
  );

  wrapper.appendChild(
    bubble
  );

  chat.appendChild(
    wrapper
  );

  addCopyButtons(
    wrapper
  );

  scrollToBottom();

}


/* ===================================================== */
/* TYPING */
/* ===================================================== */

function addTyping() {

  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.className =
    "message ai";

  wrapper.innerHTML =
    `
      <div class="ai-label">
        LOGIC-LEAF
      </div>

      <div class="typing">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;

  chat.appendChild(
    wrapper
  );

  scrollToBottom();

  return wrapper;

}


/* ===================================================== */
/* MARKDOWN */
/* ===================================================== */

function renderMarkdown(
  input
) {

  let text =
    String(input || "");

  /*
    Escape HTML first.
  */

  text =
    escapeHTML(
      text
    );

  /*
    Code blocks
  */

  text =
    text.replace(
      /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g,
      (_, language, code) => {

        const lang =
          language ||
          "code";

        return `
          <div class="code-wrap">

            <div class="code-head">

              <span class="code-language">
                ${lang}
              </span>

              <button
                class="copy-code"
                data-code="${encodeURIComponent(code)}"
              >
                Copy
              </button>

            </div>

            <pre><code>${code}</code></pre>

          </div>
        `;

      }
    );

  /*
    Inline code
  */

  text =
    text.replace(
      /`([^`]+)`/g,
      "<code>$1</code>"
    );

  /*
    Bold
  */

  text =
    text.replace(
      /\*\*([^*]+)\*\*/g,
      "<strong>$1</strong>"
    );

  /*
    Italic
  */

  text =
    text.replace(
      /(?<!\*)\*([^*]+)\*(?!\*)/g,
      "<em>$1</em>"
    );

  /*
    Headings
  */

  text =
    text.replace(
      /^### (.+)$/gm,
      "<h3>$1</h3>"
    );

  text =
    text.replace(
      /^## (.+)$/gm,
      "<h2>$1</h2>"
    );

  text =
    text.replace(
      /^# (.+)$/gm,
      "<h1>$1</h1>"
    );

  /*
    Links
  */

  text =
    text.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );

  /*
    Bullet lists
  */

  text =
    text.replace(
      /(?:^|\n)([-*] .+(?:\n[-*] .+)*)/g,
      block => {

        const items =
          block
            .trim()
            .split("\n")
            .map(
              line =>
                "<li>" +
                line
                  .replace(
                    /^[-*]\s+/,
                    ""
                  ) +
                "</li>"
            )
            .join("");

        return (
          "\n<ul>" +
          items +
          "</ul>"
        );

      }
    );

  /*
    Numbered lists
  */

  text =
    text.replace(
      /(?:^|\n)((?:\d+\.\s.+)(?:\n\d+\.\s.+)*)/g,
      block => {

        const items =
          block
            .trim()
            .split("\n")
            .map(
              line =>
                "<li>" +
                line
                  .replace(
                    /^\d+\.\s+/,
                    ""
                  ) +
                "</li>"
            )
            .join("");

        return (
          "\n<ol>" +
          items +
          "</ol>"
        );

      }
    );

  /*
    Paragraphs / line breaks
  */

  text =
    text.replace(
      /\n{2,}/g,
      "</p><p>"
    );

  text =
    text.replace(
      /\n/g,
      "<br>"
    );

  return (
    "<p>" +
    text +
    "</p>"
  );

}


/* ===================================================== */
/* COPY CODE */
/* ===================================================== */

function addCopyButtons(
  wrapper
) {

  wrapper
    .querySelectorAll(
      ".copy-code"
    )
    .forEach(
      button => {

        button.onclick =
          async () => {

            const code =
              decodeURIComponent(
                button.dataset.code
              );

            try {

              await navigator.clipboard.writeText(
                code
              );

              button.textContent =
                "Copied";

              setTimeout(
                () => {
                  button.textContent =
                    "Copy";
                },
                1200
              );

            } catch {

              button.textContent =
                "Copy failed";

            }

          };

      }
    );

}


/* ===================================================== */
/* AUTO RESIZE */
/* ===================================================== */

function autoResize() {

  messageInput.style.height =
    "auto";

  messageInput.style.height =
    Math.min(
      messageInput.scrollHeight,
      180
    ) + "px";

}


/* ===================================================== */
/* SCROLL */
/* ===================================================== */

function scrollToBottom() {

  requestAnimationFrame(
    () => {

      chat.scrollTop =
        chat.scrollHeight;

    }
  );

}


/* ===================================================== */
/* UTILITIES */
/* ===================================================== */

function escapeHTML(
  value
) {

  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


function formatBytes(
  bytes
) {

  if (
    bytes === 0
  ) {
    return "0 B";
  }

  const units =
    [
      "B",
      "KB",
      "MB",
      "GB"
    ];

  const i =
    Math.floor(
      Math.log(bytes) /
      Math.log(1024)
    );

  return (
    (bytes /
      Math.pow(
        1024,
        i
      )
    ).toFixed(
      i ? 1 : 0
    ) +
    " " +
    units[i]
  );

}


async function safeJSON(
  response
) {

  try {
    return await response.json();
  } catch {
    return {};
  }

}


/* ===================================================== */
/* KEYBOARD SHORTCUT */
/* ===================================================== */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.ctrlKey &&
      event.key === "k"
    ) {

      event.preventDefault();

      toggleSearch();

    }

    if (
      event.key === "Escape"
    ) {

      searchPanel
        .classList
        .remove("open");

      settingsModal
        .classList
        .add("hidden");

    }

  }
);
