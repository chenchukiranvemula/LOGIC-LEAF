/* =========================================================
   LOGIC-LEAF — app.js
   Frontend controller
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     CONFIG
     ======================================================= */

  const API_URL =
    window.LOGIC_LEAF_API_URL ||
    localStorage.getItem("logic_leaf_api_url") ||
    "https://logic-leaf.qtmkiller6.workers.dev";

  const STORAGE = {
    chats: "logic_leaf_chats",
    current: "logic_leaf_current_chat",
    apiKey: "logic_leaf_api_key",
    user: "logic_leaf_user"
  };

  /* =======================================================
     STATE
     ======================================================= */

  const state = {
    chats: loadJSON(STORAGE.chats, []),
    currentChatId: localStorage.getItem(STORAGE.current) || null,
    messages: [],
    attachments: [],
    busy: false,
    searchMode: false,
    generatedImages: []
  };

  /* =======================================================
     DOM
     ======================================================= */

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const dom = {
    sidebar: $(".sidebar"),
    sidebarOverlay: $(".sidebar-overlay"),

    menuButton:
      $("#menuButton") ||
      $(".menu-button") ||
      $('[data-action="menu"]'),

    newChat:
      $("#newChat") ||
      $(".new-chat") ||
      $('[data-action="new-chat"]'),

    chatList:
      $("#chatList") ||
      $(".chat-list"),

    messages:
      $("#messages") ||
      $(".messages") ||
      $(".chat-messages"),

    welcome:
      $("#welcome") ||
      $(".welcome"),

    composer:
      $("#composer") ||
      $(".composer"),

    input:
      $("#messageInput") ||
      $("#prompt") ||
      $(".composer-input") ||
      $("textarea"),

    sendButton:
      $("#sendButton") ||
      $(".send-button") ||
      $('[data-action="send"]'),

    attachButton:
      $("#attachButton") ||
      $('[data-action="attach"]'),

    cameraButton:
      $("#cameraButton") ||
      $('[data-action="camera"]'),

    imageButton:
      $("#imageButton") ||
      $('[data-action="image"]'),

    pdfButton:
      $("#pdfButton") ||
      $('[data-action="pdf"]'),

    searchButton:
      $("#searchButton") ||
      $('[data-action="search"]'),

    fileInput:
      $("#fileInput") ||
      'input[type="file"]',

    cameraInput:
      $("#cameraInput"),

    attachments:
      $("#attachments") ||
      $(".attachments"),

    toolMenu:
      $("#toolMenu") ||
      $(".tool-menu"),

    settingsButton:
      $("#settingsButton") ||
      $('[data-action="settings"]'),

    apiButton:
      $("#apiButton") ||
      $('[data-action="api"]'),

    loginButton:
      $("#loginButton") ||
      $('[data-action="login"]'),

    toast:
      $("#toast") ||
      $(".toast"),

    modalBackdrop:
      $("#modalBackdrop") ||
      $(".modal-backdrop")
  };

  /* =======================================================
     START
     ======================================================= */

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    ensureChat();

    bindEvents();

    renderSidebar();
    renderMessages();

    autoResize();

    console.log("LOGIC-LEAF frontend ready");
    console.log("Worker:", API_URL);
  }

  /* =======================================================
     EVENTS
     ======================================================= */

  function bindEvents() {

    if (dom.menuButton) {
      dom.menuButton.addEventListener("click", toggleSidebar);
    }

    if (dom.sidebarOverlay) {
      dom.sidebarOverlay.addEventListener(
        "click",
        closeSidebar
      );
    }

    if (dom.newChat) {
      dom.newChat.addEventListener("click", newChat);
    }

    if (dom.input) {

      dom.input.addEventListener(
        "input",
        autoResize
      );

      dom.input.addEventListener(
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
    }

    if (dom.sendButton) {
      dom.sendButton.addEventListener(
        "click",
        sendMessage
      );
    }

    if (dom.attachButton) {
      dom.attachButton.addEventListener(
        "click",
        () => openFilePicker(false)
      );
    }

    if (dom.cameraButton) {
      dom.cameraButton.addEventListener(
        "click",
        openCamera
      );
    }

    if (dom.imageButton) {
      dom.imageButton.addEventListener(
        "click",
        generateImageFromComposer
      );
    }

    if (dom.pdfButton) {
      dom.pdfButton.addEventListener(
        "click",
        () => openFilePicker(true)
      );
    }

    if (dom.searchButton) {
      dom.searchButton.addEventListener(
        "click",
        toggleSearchMode
      );
    }

    if (dom.fileInput) {
      dom.fileInput.addEventListener(
        "change",
        handleFiles
      );
    }

    if (dom.cameraInput) {
      dom.cameraInput.addEventListener(
        "change",
        handleFiles
      );
    }

    if (dom.settingsButton) {
      dom.settingsButton.addEventListener(
        "click",
        openSettings
      );
    }

    if (dom.apiButton) {
      dom.apiButton.addEventListener(
        "click",
        openApiSettings
      );
    }

    if (dom.loginButton) {
      dom.loginButton.addEventListener(
        "click",
        openLogin
      );
    }

    document.addEventListener(
      "click",
      handleDocumentClick
    );
  }

  /* =======================================================
     SIDEBAR
     ======================================================= */

  function toggleSidebar() {

    if (!dom.sidebar) return;

    const collapsed =
      dom.sidebar.classList.contains("collapsed");

    if (collapsed) {
      dom.sidebar.classList.remove("collapsed");

      if (dom.sidebarOverlay) {
        dom.sidebarOverlay.classList.add("show");
      }
    } else {
      closeSidebar();
    }
  }

  function closeSidebar() {

    if (!dom.sidebar) return;

    if (window.innerWidth <= 760) {
      dom.sidebar.classList.add("collapsed");

      if (dom.sidebarOverlay) {
        dom.sidebarOverlay.classList.remove("show");
      }
    } else {
      dom.sidebar.classList.add("collapsed");
    }
  }

  /* =======================================================
     CHAT MANAGEMENT
     ======================================================= */

  function ensureChat() {

    if (!state.currentChatId) {

      const chat = createChatObject();

      state.chats.unshift(chat);
      state.currentChatId = chat.id;

      saveChats();
    }

    const existing =
      state.chats.find(
        chat => chat.id === state.currentChatId
      );

    if (existing) {
      state.messages = existing.messages || [];
    }
  }

  function createChatObject() {

    return {
      id:
        Date.now().toString(36) +
        Math.random().toString(36).slice(2),

      title: "New chat",

      createdAt: Date.now(),

      updatedAt: Date.now(),

      messages: []
    };
  }

  function newChat() {

    const chat = createChatObject();

    state.chats.unshift(chat);

    state.currentChatId = chat.id;

    state.messages = [];

    state.attachments = [];

    localStorage.setItem(
      STORAGE.current,
      chat.id
    );

    saveChats();

    renderSidebar();
    renderMessages();

    if (dom.input) {
      dom.input.value = "";
      autoResize();
      dom.input.focus();
    }

    renderAttachments();

    closeSidebar();
  }

  function currentChat() {

    return state.chats.find(
      chat => chat.id === state.currentChatId
    );
  }

  function saveCurrentChat() {

    const chat = currentChat();

    if (!chat) return;

    chat.messages = state.messages;

    chat.updatedAt = Date.now();

    if (
      state.messages.length > 0 &&
      chat.title === "New chat"
    ) {

      const firstUser =
        state.messages.find(
          message => message.role === "user"
        );

      if (firstUser) {

        chat.title =
          firstUser.content
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 42) ||
          "New chat";
      }
    }

    saveChats();
  }

  function saveChats() {

    localStorage.setItem(
      STORAGE.chats,
      JSON.stringify(state.chats)
    );

    localStorage.setItem(
      STORAGE.current,
      state.currentChatId || ""
    );
  }

  function loadChat(id) {

    const chat =
      state.chats.find(
        item => item.id === id
      );

    if (!chat) return;

    state.currentChatId = id;
    state.messages = chat.messages || [];

    localStorage.setItem(
      STORAGE.current,
      id
    );

    renderSidebar();
    renderMessages();

    closeSidebar();
  }

  /* =======================================================
     SIDEBAR RENDER
     ======================================================= */

  function renderSidebar() {

    if (!dom.chatList) return;

    dom.chatList.innerHTML = "";

    const chats =
      [...state.chats]
        .sort(
          (a, b) =>
            b.updatedAt - a.updatedAt
        );

    if (!chats.length) {

      dom.chatList.innerHTML = `
        <div class="empty-chats">
          Your conversations will appear here.
        </div>
      `;

      return;
    }

    chats.forEach(chat => {

      const item =
        document.createElement("button");

      item.className =
        "chat-item" +
        (
          chat.id === state.currentChatId
            ? " active"
            : ""
        );

      item.textContent =
        chat.title || "New chat";

      item.title =
        chat.title || "New chat";

      item.addEventListener(
        "click",
        () => loadChat(chat.id)
      );

      dom.chatList.appendChild(item);
    });
  }

  /* =======================================================
     MESSAGE RENDERING
     ======================================================= */

  function renderMessages() {

    if (!dom.messages) return;

    dom.messages.innerHTML = "";

    if (
      !state.messages.length &&
      dom.welcome
    ) {

      dom.welcome.style.display = "flex";

      dom.messages.appendChild(
        dom.welcome
      );

      return;
    }

    if (dom.welcome) {
      dom.welcome.style.display = "none";
    }

    state.messages.forEach(
      message => renderMessage(message)
    );

    scrollToBottom();
  }

  function renderMessage(message) {

    if (!dom.messages) return;

    const wrapper =
      document.createElement("div");

    wrapper.className =
      `message ${
        message.role === "user"
          ? "user"
          : "ai"
      }`;

    const inner =
      document.createElement("div");

    inner.className = "message-inner";

    const label =
      document.createElement("div");

    label.className = "message-label";

    label.textContent =
      message.role === "user"
        ? "You"
        : "LOGIC-LEAF";

    const content =
      document.createElement("div");

    content.className =
      "message-content";

    if (message.type === "image") {

      content.innerHTML =
        renderImageMessage(message);

    } else {

      content.innerHTML =
        renderMarkdown(
          message.content || ""
        );
    }

    inner.appendChild(label);
    inner.appendChild(content);

    if (message.role !== "user") {

      const actions =
        document.createElement("div");

      actions.className =
        "message-actions";

      actions.innerHTML = `
        <button
          class="message-action"
          title="Copy"
          data-copy-message
        >
          ${iconCopy()}
        </button>

        <button
          class="message-action"
          title="Regenerate"
          data-regenerate-message
        >
          ${iconRefresh()}
        </button>
      `;

      actions
        .querySelector("[data-copy-message]")
        ?.addEventListener(
          "click",
          () => copyText(
            message.content || ""
          )
        );

      actions
        .querySelector("[data-regenerate-message]")
        ?.addEventListener(
          "click",
          () => regenerate(message)
        );

      inner.appendChild(actions);
    }

    wrapper.appendChild(inner);

    dom.messages.appendChild(wrapper);
  }

  /* =======================================================
     MARKDOWN
     ======================================================= */

  function renderMarkdown(text) {

    let safe = escapeHTML(
      String(text)
    );

    const blocks = [];

    safe = safe.replace(
      /```([\w+-]*)\n?([\s\S]*?)```/g,
      (_, lang, code) => {

        const index = blocks.length;

        blocks.push(`
          <div class="code-block">
            <div class="code-header">
              <span>${escapeHTML(
                lang || "code"
              )}</span>

              <button
                class="code-copy"
                data-code-index="${index}"
              >
                Copy
              </button>
            </div>

            <pre><code>${code}</code></pre>
          </div>
        `);

        return `@@CODE_${index}@@`;
      }
    );

    safe = safe
      .replace(
        /^### (.*)$/gm,
        "<h3>$1</h3>"
      )
      .replace(
        /^## (.*)$/gm,
        "<h2>$1</h2>"
      )
      .replace(
        /^# (.*)$/gm,
        "<h1>$1</h1>"
      )
      .replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
      )
      .replace(
        /`([^`]+)`/g,
        "<code>$1</code>"
      )
      .replace(
        /^\s*[-*]\s+(.*)$/gm,
        "<li>$1</li>"
      )
      .replace(
        /(<li>.*<\/li>)/gs,
        "<ul>$1</ul>"
      )
      .replace(
        /\n{2,}/g,
        "</p><p>"
      )
      .replace(
        /\n/g,
        "<br>"
      );

    safe =
      "<p>" +
      safe +
      "</p>";

    blocks.forEach(
      (block, index) => {

        safe = safe.replace(
          `<p>@@CODE_${index}@@</p>`,
          block
        );

        safe = safe.replace(
          `@@CODE_${index}@@`,
          block
        );
      }
    );

    return safe;
  }

  function renderImageMessage(message) {

    if (!message.url) {

      return `
        <div class="error-message">
          Image was returned without a usable image URL.
        </div>
      `;
    }

    return `
      <div class="generated-image">
        <img
          src="${escapeAttribute(message.url)}"
          alt="Generated image"
          loading="lazy"
        />

        <div class="image-actions">
          <button
            class="secondary-button"
            onclick="window.open('${escapeAttribute(
              message.url
            )}', '_blank')"
          >
            Open image
          </button>
        </div>
      </div>
    `;
  }

  /* =======================================================
     SEND MESSAGE
     ======================================================= */

  async function sendMessage() {

    if (state.busy) return;

    const text =
      dom.input?.value.trim() || "";

    if (
      !text &&
      !state.attachments.length
    ) {
      return;
    }

    state.busy = true;

    updateSendState();

    const attachments =
      [...state.attachments];

    if (dom.input) {
      dom.input.value = "";
      autoResize();
    }

    renderAttachments();

    const userMessage = {
      role: "user",
      content: text || "Analyze the attached file.",
      attachments: attachments.map(
        item => ({
          name: item.name,
          type: item.type
        })
      )
    };

    state.messages.push(
      userMessage
    );

    saveCurrentChat();
    renderMessages();

    const loadingId =
      addLoadingMessage();

    try {

      let response;

      const imageAttachment =
        attachments.find(
          item =>
            item.type.startsWith("image/")
        );

      const pdfAttachment =
        attachments.find(
          item =>
            item.type === "application/pdf"
        );

      if (imageAttachment) {

        response =
          await visionRequest(
            text,
            imageAttachment
          );

      } else if (pdfAttachment) {

        response =
          await fileRequest(
            text,
            pdfAttachment
          );

      } else if (state.searchMode) {

        response =
          await searchRequest(
            text
          );

      } else {

        response =
          await chatRequest(
            text
          );
      }

      removeLoadingMessage(
        loadingId
      );

      const assistantMessage = {
        role: "assistant",
        content:
          extractText(response)
      };

      state.messages.push(
        assistantMessage
      );

      saveCurrentChat();

      renderMessages();

    } catch (error) {

      console.error(error);

      removeLoadingMessage(
        loadingId
      );

      state.messages.push({
        role: "assistant",
        content:
          `I couldn't complete that request.\n\n${error.message || "Unknown server error."}`
      });

      saveCurrentChat();
      renderMessages();

      showToast(
        error.message ||
        "Request failed"
      );

    } finally {

      state.attachments = [];

      renderAttachments();

      state.busy = false;

      updateSendState();
    }
  }

  /* =======================================================
     CHAT REQUEST
     ======================================================= */

  async function chatRequest(text) {

    const history =
      state.messages
        .filter(
          message =>
            message.role === "user" ||
            message.role === "assistant"
        )
        .slice(-30)
        .map(
          message => ({
            role: message.role,
            content: message.content
          })
        );

    const payload = {
      message: text,

      prompt: text,

      messages: history,

      conversation_id:
        state.currentChatId,

      history,

      stream: false
    };

    return request(
      "/v1/chat",
      payload
    );
  }

  /* =======================================================
     VISION
     ======================================================= */

  async function visionRequest(
    text,
    file
  ) {

    const base64 =
      await fileToBase64(file);

    return request(
      "/v1/vision",
      {
        message:
          text ||
          "Analyze this image carefully.",

        prompt:
          text ||
          "Analyze this image carefully.",

        image: base64,

        image_base64: base64,

        mime_type: file.type,

        conversation_id:
          state.currentChatId,

        history:
          state.messages.slice(-20)
      }
    );
  }

  /* =======================================================
     FILE / PDF
     ======================================================= */

  async function fileRequest(
    text,
    file
  ) {

    const base64 =
      await fileToBase64(file);

    return request(
      "/v1/file",
      {
        message:
          text ||
          "Analyze this file.",

        prompt:
          text ||
          "Analyze this file.",

        file: base64,

        file_base64: base64,

        filename: file.name,

        mime_type: file.type,

        conversation_id:
          state.currentChatId
      }
    );
  }

  /* =======================================================
     SEARCH
     ======================================================= */

  async function searchRequest(text) {

    return request(
      "/v1/search",
      {
        query: text,

        q: text,

        conversation_id:
          state.currentChatId
      }
    );
  }

  /* =======================================================
     IMAGE GENERATION
     ======================================================= */

  async function generateImageFromComposer() {

    if (state.busy) return;

    const prompt =
      dom.input?.value.trim() || "";

    if (!prompt) {

      showToast(
        "Describe the image you want to create."
      );

      dom.input?.focus();

      return;
    }

    state.busy = true;

    updateSendState();

    if (dom.input) {
      dom.input.value = "";
      autoResize();
    }

    state.messages.push({
      role: "user",
      content:
        `Create an image: ${prompt}`
    });

    saveCurrentChat();
    renderMessages();

    const loadingId =
      addLoadingMessage();

    try {

      const response =
        await request(
          "/v1/image",
          {
            prompt,

            conversation_id:
              state.currentChatId
          }
        );

      removeLoadingMessage(
        loadingId
      );

      const imageURL =
        extractImageURL(response);

      if (!imageURL) {
        throw new Error(
          "The image endpoint did not return an image."
        );
      }

      state.messages.push({
        role: "assistant",
        type: "image",
        content:
          "Generated image",
        url: imageURL
      });

      saveCurrentChat();
      renderMessages();

    } catch (error) {

      removeLoadingMessage(
        loadingId
      );

      state.messages.push({
        role: "assistant",
        content:
          `Image generation failed.\n\n${error.message}`
      });

      saveCurrentChat();
      renderMessages();

      showToast(
        error.message ||
        "Image generation failed"
      );

    } finally {

      state.busy = false;

      updateSendState();
    }
  }

  /* =======================================================
     GENERIC REQUEST
     ======================================================= */

  async function request(
    endpoint,
    body
  ) {

    const headers = {
      "Content-Type":
        "application/json"
    };

    const apiKey =
      localStorage.getItem(
        STORAGE.apiKey
      );

    if (apiKey) {
      headers.Authorization =
        `Bearer ${apiKey}`;
    }

    const response =
      await fetch(
        API_URL + endpoint,
        {
          method: "POST",
          headers,
          body: JSON.stringify(body)
        }
      );

    const raw =
      await response.text();

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      data = {
        text: raw
      };
    }

    if (!response.ok) {

      const message =
        data?.error ||
        data?.message ||
        data?.details ||
        raw ||
        `HTTP ${response.status}`;

      throw new Error(
        String(message)
      );
    }

    return data;
  }

  /* =======================================================
     RESPONSE EXTRACTION
     ======================================================= */

  function extractText(data) {

    if (!data) {
      return "No response received.";
    }

    if (typeof data === "string") {
      return data;
    }

    const candidates = [
      data.response,
      data.answer,
      data.text,
      data.content,
      data.message,
      data.result?.response,
      data.result?.answer,
      data.result?.text,
      data.result?.content,
      data.output_text
    ];

    for (const value of candidates) {

      if (
        typeof value === "string" &&
        value.trim()
      ) {
        return value;
      }
    }

    if (
      Array.isArray(data.response)
    ) {
      return data.response
        .map(item =>
          typeof item === "string"
            ? item
            : item?.text || ""
        )
        .join("\n");
    }

    return JSON.stringify(
      data,
      null,
      2
    );
  }

  function extractImageURL(data) {

    if (!data) return null;

    const candidates = [
      data.url,
      data.image_url,
      data.image,
      data.imageUrl,
      data.result?.url,
      data.result?.image_url,
      data.result?.image,
      data.result?.imageUrl
    ];

    for (const value of candidates) {

      if (
        typeof value === "string" &&
        (
          value.startsWith("http") ||
          value.startsWith("data:image/")
        )
      ) {
        return value;
      }
    }

    return null;
  }

  /* =======================================================
     FILE PICKERS
     ======================================================= */

  function openFilePicker(pdfOnly) {

    if (!dom.fileInput) {
      showToast(
        "File input is missing from HTML."
      );
      return;
    }

    dom.fileInput.accept =
      pdfOnly
        ? ".pdf,application/pdf"
        : "image/*,.pdf,.txt,.csv,.json,.doc,.docx";

    dom.fileInput.multiple = true;

    dom.fileInput.click();
  }

  function openCamera() {

    if (!dom.cameraInput) {

      if (dom.fileInput) {

        dom.fileInput.accept =
          "image/*";

        dom.fileInput.capture =
          "environment";

        dom.fileInput.click();

        return;
      }

      showToast(
        "Camera input is missing from HTML."
      );

      return;
    }

    dom.cameraInput.accept =
      "image/*";

    dom.cameraInput.capture =
      "environment";

    dom.cameraInput.click();
  }

  async function handleFiles(event) {

    const files =
      [...(event.target.files || [])];

    if (!files.length) return;

    for (const file of files) {

      if (
        state.attachments.length >= 5
      ) {
        showToast(
          "Maximum 5 attachments."
        );
        break;
      }

      if (
        file.size >
        15 * 1024 * 1024
      ) {
        showToast(
          `${file.name} is larger than 15 MB.`
        );
        continue;
      }

      state.attachments.push(
        file
      );
    }

    event.target.value = "";

    renderAttachments();
  }

  function renderAttachments() {

    if (!dom.attachments) return;

    dom.attachments.innerHTML = "";

    state.attachments.forEach(
      (file, index) => {

        const item =
          document.createElement("div");

        item.className =
          "attachment";

        if (
          file.type.startsWith("image/")
        ) {

          const img =
            document.createElement("img");

          img.src =
            URL.createObjectURL(file);

          img.alt =
            file.name;

          item.appendChild(img);

        } else {

          item.innerHTML = `
            <div class="attachment-file">
              <strong>${escapeHTML(
                file.type ===
                "application/pdf"
                  ? "PDF"
                  : "FILE"
              )}</strong>

              <span>${escapeHTML(
                file.name
              )}</span>
            </div>
          `;
        }

        const remove =
          document.createElement("button");

        remove.className =
          "remove-attachment";

        remove.innerHTML =
          iconClose();

        remove.addEventListener(
          "click",
          () => {

            state.attachments.splice(
              index,
              1
            );

            renderAttachments();
          }
        );

        item.appendChild(remove);

        dom.attachments.appendChild(
          item
        );
      }
    );
  }

  /* =======================================================
     SEARCH MODE
     ======================================================= */

  function toggleSearchMode() {

    state.searchMode =
      !state.searchMode;

    if (dom.searchButton) {

      dom.searchButton.classList.toggle(
        "active",
        state.searchMode
      );
    }

    showToast(
      state.searchMode
        ? "Search mode enabled"
        : "Search mode disabled"
    );
  }

  /* =======================================================
     LOADING
     ======================================================= */

  function addLoadingMessage() {

    const id =
      "loading-" +
      Date.now();

    if (!dom.messages) return id;

    const wrapper =
      document.createElement("div");

    wrapper.className =
      "message ai";

    wrapper.id = id;

    wrapper.innerHTML = `
      <div class="message-inner">
        <div class="message-label">
          LOGIC-LEAF
        </div>

        <div class="message-content">
          <div class="typing">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    `;

    dom.messages.appendChild(
      wrapper
    );

    scrollToBottom();

    return id;
  }

  function removeLoadingMessage(id) {

    document
      .getElementById(id)
      ?.remove();
  }

  /* =======================================================
     REGENERATE
     ======================================================= */

  async function regenerate(message) {

    const index =
      state.messages.indexOf(message);

    if (index === -1) return;

    const previousUser =
      state.messages
        .slice(0, index)
        .reverse()
        .find(
          item =>
            item.role === "user"
        );

    if (!previousUser) return;

    state.messages.splice(
      index,
      1
    );

    saveCurrentChat();
    renderMessages();

    if (dom.input) {
      dom.input.value =
        previousUser.content;
    }

    await sendMessage();
  }

  /* =======================================================
     SETTINGS
     ======================================================= */

  function openSettings() {

    const api =
      API_URL;

    showModal(
      `
      <div class="modal-header">
        <div class="modal-title">
          Settings
        </div>

        <button
          class="modal-close"
          data-close-modal
        >
          ${iconClose()}
        </button>
      </div>

      <div class="settings-row">
        <div class="settings-info">
          <strong>LOGIC-LEAF</strong>
          <span>AI assistant</span>
        </div>
      </div>

      <div class="settings-row">
        <div class="settings-info">
          <strong>Worker status</strong>
          <span>${escapeHTML(api)}</span>
        </div>
      </div>

      <div class="settings-row">
        <div class="settings-info">
          <strong>Conversation history</strong>
          <span>Stored locally in this browser</span>
        </div>
      </div>

      <div style="margin-top:18px">
        <button
          class="secondary-button"
          id="clearHistoryButton"
        >
          Clear local history
        </button>
      </div>
      `
    );

    $("#clearHistoryButton")
      ?.addEventListener(
        "click",
        () => {

          if (
            !confirm(
              "Delete all local conversations?"
            )
          ) {
            return;
          }

          state.chats = [];

          localStorage.removeItem(
            STORAGE.chats
          );

          newChat();

          closeModal();

          showToast(
            "History cleared"
          );
        }
      );
  }

  /* =======================================================
     API KEY
     ======================================================= */

  function openApiSettings() {

    const current =
      localStorage.getItem(
        STORAGE.apiKey
      ) || "";

    showModal(
      `
      <div class="modal-header">
        <div class="modal-title">
          API Key
        </div>

        <button
          class="modal-close"
          data-close-modal
        >
          ${iconClose()}
        </button>
      </div>

      <p style="
        color:#9298a4;
        font-size:11px;
        line-height:1.6;
        margin-bottom:14px;
      ">
        Optional API authentication for your
        LOGIC-LEAF Worker.
      </p>

      <div class="api-key-box">
        <input
          id="apiKeyInput"
          class="input"
          type="password"
          placeholder="Enter API key"
          value="${escapeAttribute(current)}"
        />
      </div>

      <div style="
        display:flex;
        gap:8px;
        margin-top:12px;
      ">
        <button
          class="primary-button"
          id="saveApiKey"
        >
          Save key
        </button>

        <button
          class="secondary-button"
          id="removeApiKey"
        >
          Remove
        </button>
      </div>
      `
    );

    $("#saveApiKey")
      ?.addEventListener(
        "click",
        () => {

          const value =
            $("#apiKeyInput")
              ?.value.trim();

          if (value) {

            localStorage.setItem(
              STORAGE.apiKey,
              value
            );

          } else {

            localStorage.removeItem(
              STORAGE.apiKey
            );
          }

          closeModal();

          showToast(
            "API key saved"
          );
        }
      );

    $("#removeApiKey")
      ?.addEventListener(
        "click",
        () => {

          localStorage.removeItem(
            STORAGE.apiKey
          );

          closeModal();

          showToast(
            "API key removed"
          );
        }
      );
  }

  /* =======================================================
     LOGIN
     ======================================================= */

  function openLogin() {

    showModal(
      `
      <div class="modal-header">
        <div class="modal-title">
          Sign in
        </div>

        <button
          class="modal-close"
          data-close-modal
        >
          ${iconClose()}
        </button>
      </div>

      <button
        class="google-button"
        id="googleLoginButton"
      >
        ${googleIcon()}
        Continue with Google
      </button>

      <div style="
        margin:14px 0;
        text-align:center;
        color:#666d79;
        font-size:10px;
      ">
        Google authentication is handled
        by your Firebase setup.
      </div>

      <div class="settings-row">
        <div class="settings-info">
          <strong>Firebase</strong>
          <span>logic-leaf</span>
        </div>
      </div>
      `
    );

    $("#googleLoginButton")
      ?.addEventListener(
        "click",
        () => {

          showToast(
            "Connect Firebase Google Auth in your HTML configuration."
          );
        }
      );
  }

  /* =======================================================
     MODAL
     ======================================================= */

  function showModal(content) {

    if (!dom.modalBackdrop) {

      const backdrop =
        document.createElement("div");

      backdrop.id =
        "modalBackdrop";

      backdrop.className =
        "modal-backdrop";

      backdrop.innerHTML = `
        <div class="modal">
          ${content}
        </div>
      `;

      document.body.appendChild(
        backdrop
      );

      dom.modalBackdrop =
        backdrop;

    } else {

      dom.modalBackdrop.innerHTML = `
        <div class="modal">
          ${content}
        </div>
      `;
    }

    dom.modalBackdrop.classList.add(
      "open"
    );
  }

  function closeModal() {

    dom.modalBackdrop
      ?.classList.remove("open");
  }

  /* =======================================================
     CLICK HANDLER
     ======================================================= */

  function handleDocumentClick(event) {

    if (
      event.target.closest(
        "[data-close-modal]"
      )
    ) {
      closeModal();
    }

    if (
      event.target ===
      dom.modalBackdrop
    ) {
      closeModal();
    }

    const codeButton =
      event.target.closest(
        "[data-code-index]"
      );

    if (codeButton) {

      const index =
        Number(
          codeButton.dataset.codeIndex
        );

      const blocks =
        $$(".code-block");

      const block =
        blocks[index];

      const code =
        block?.querySelector(
          "code"
        )?.innerText || "";

      copyText(code);
    }
  }

  /* =======================================================
     UI
     ======================================================= */

  function updateSendState() {

    if (!dom.sendButton) return;

    dom.sendButton.disabled =
      state.busy;
  }

  function autoResize() {

    if (!dom.input) return;

    dom.input.style.height =
      "auto";

    dom.input.style.height =
      Math.min(
        dom.input.scrollHeight,
        180
      ) + "px";
  }

  function scrollToBottom() {

    if (!dom.messages) return;

    const area =
      dom.messages.closest(
        ".chat-area"
      );

    if (area) {

      requestAnimationFrame(
        () => {
          area.scrollTop =
            area.scrollHeight;
        }
      );
    }
  }

  /* =======================================================
     UTILITIES
     ======================================================= */

  async function fileToBase64(file) {

    const buffer =
      await file.arrayBuffer();

    let binary = "";

    const bytes =
      new Uint8Array(buffer);

    const chunk =
      0x8000;

    for (
      let i = 0;
      i < bytes.length;
      i += chunk
    ) {

      binary += String.fromCharCode(
        ...bytes.subarray(
          i,
          i + chunk
        )
      );
    }

    return (
      "data:" +
      file.type +
      ";base64," +
      btoa(binary)
    );
  }

  function copyText(text) {

    navigator.clipboard
      ?.writeText(text)
      .then(
        () =>
          showToast(
            "Copied"
          )
      )
      .catch(
        () =>
          showToast(
            "Copy failed"
          )
      );
  }

  function showToast(message) {

    if (!dom.toast) {

      const toast =
        document.createElement("div");

      toast.className =
        "toast";

      document.body.appendChild(
        toast
      );

      dom.toast = toast;
    }

    dom.toast.textContent =
      message;

    dom.toast.classList.add(
      "show"
    );

    clearTimeout(
      showToast.timer
    );

    showToast.timer =
      setTimeout(
        () => {
          dom.toast
            ?.classList.remove(
              "show"
            );
        },
        2400
      );
  }

  function loadJSON(
    key,
    fallback
  ) {

    try {

      const value =
        localStorage.getItem(key);

      return value
        ? JSON.parse(value)
        : fallback;

    } catch {

      return fallback;
    }
  }

  function escapeHTML(value) {

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

  function escapeAttribute(value) {
    return escapeHTML(value);
  }

  /* =======================================================
     SVG ICONS
     ======================================================= */

  function iconClose() {

    return `
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
      >
        <path d="M6 6l12 12"/>
        <path d="M18 6L6 18"/>
      </svg>
    `;
  }

  function iconCopy() {

    return `
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect
          x="8"
          y="8"
          width="12"
          height="12"
          rx="2"
        />
        <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>
      </svg>
    `;
  }

  function iconRefresh() {

    return `
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M20 11a8.1 8.1 0 0 0-15.5-2"/>
        <path d="M4 5v4h4"/>
        <path d="M4 13a8.1 8.1 0 0 0 15.5 2"/>
        <path d="M20 19v-4h-4"/>
      </svg>
    `;
  }

  function googleIcon() {

    return `
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
      >
        <path
          fill="#4285F4"
          d="M21.35 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.21 2.91-7.22z"
        />
        <path
          fill="#34A853"
          d="M12 21.66c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.75 9.75 0 0 0 12 21.66z"
        />
        <path
          fill="#FBBC05"
          d="M6.54 13.74A5.86 5.86 0 0 1 6.23 12c0-.6.11-1.19.31-1.74V7.73H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.06 1.05 4.27l3.24-2.53z"
        />
        <path
          fill="#EA4335"
          d="M12 6.23c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.32 14.63 2.34 12 2.34a9.75 9.75 0 0 0-8.7 5.39l3.24 2.53C7.31 7.95 9.46 6.23 12 6.23z"
        />
      </svg>
    `;
  }

})();
