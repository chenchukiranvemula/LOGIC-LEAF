const API_URL = "https://qtm-ai.qtmkiller6.workers.dev";

const messages = document.getElementById("messages");
const promptBox = document.getElementById("prompt");
const composer = document.getElementById("composer");

async function askQTM(text) {
  addMessage("user", text);

  const bubble = addMessage(
    "assistant",
    "Connecting to QTM AI..."
  );

  try {
    const response = await fetch(
      API_URL + "/api/health",
      {
        method: "GET",
        cache: "no-store"
      }
    );

    const raw = await response.text();

    console.log("STATUS:", response.status);
    console.log("URL:", response.url);
    console.log("RESPONSE:", raw);

    if (!response.ok) {
      throw new Error(
        "Worker returned HTTP " + response.status
      );
    }

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(
        "Worker returned HTML instead of JSON."
      );
    }

    bubble.textContent =
      "✅ QTM AI Worker connected!\n\n" +
      JSON.stringify(data, null, 2);

  } catch (error) {
    bubble.textContent =
      "❌ Connection test failed.\n\n" +
      error.message;

    console.error(error);
  }
}

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

  bubble.textContent = text;

  row.appendChild(bubble);
  messages.appendChild(row);

  messages.scrollTop =
    messages.scrollHeight;

  return bubble;
}

composer.addEventListener(
  "submit",
  function(event) {
    event.preventDefault();

    const text =
      promptBox.value.trim();

    if (!text) return;

    promptBox.value = "";

    askQTM(text);
  }
);

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
