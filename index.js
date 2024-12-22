import * as webllm from "https://esm.run/@mlc-ai/web-llm";

const messages = [
  {
    content: `You are a helpful AI agent assisting in creating an RPG text adventure. 
Use storytelling techniques and present 2 to 4 choices for each part of the adventure. 
All choices should be formatted as '1. choice1 2. choice2 etc.'. 
Additionally, suggest two hex color codes for a beautiful gradient background that suits the mood of the current story context (e.g., "#FFB6C1 and #ADD8E6" for a princess story, "#228B22 and #8B4513" for a forest adventure).
The user can change the storyline at any time. 
When the goal from the first input is reached, respond with 'The End' and no choice is generated anymore.`,
    role: "system",
  },
];

const selectedModel = "Llama-3-8B-Instruct-q4f32_1-MLC-1k";

function updateEngineInitProgressCallback(report) {
  console.log("initialize", report.progress);
  document.getElementById("download-status").textContent = report.text;
}

const engine = new webllm.MLCEngine();
engine.setInitProgressCallback(updateEngineInitProgressCallback);

async function initializeWebLLMEngine() {
  document.getElementById("download-status").classList.remove("hidden");
  const config = {
    temperature: 1.0,
    top_p: 1,
  };
  await engine.reload(selectedModel, config);
  document.getElementById("download-status").classList.add("hidden");
}

async function streamingGenerating(messages, onUpdate, onFinish, onError) {
  try {
    let curMessage = "";
    const completion = await engine.chat.completions.create({
      stream: true,
      messages,
    });
    for await (const chunk of completion) {
      const curDelta = chunk.choices[0].delta.content;
      if (curDelta) {
        curMessage += curDelta;
      }
      onUpdate(curMessage);
      scrollToBottom();
    }
    const finalMessage = await engine.getMessage();
    onFinish(finalMessage);
  } catch (err) {
    onError(err);
  }
}

function scrollToBottom() {
  const chatBox = document.getElementById("chat-box");
  chatBox.scrollTop = chatBox.scrollHeight;
}

function startStory() {
  const input = document.getElementById("user-input").value.trim();
  if (input.length === 0) {
    return;
  }
  const message = {
    content: input,
    role: "user",
  };
  messages.push(message);
  appendMessage(message);
  document.getElementById("user-input").value = "";
  document.getElementById("send").disabled = true;

  continueAdventure();
}

function generateChoices(prompt = "What will you do next?", choices) {
  const optionsContainer = document.getElementById("options-container");
  optionsContainer.innerHTML = "";
  const choicePrompt = document.createElement("p");
  choicePrompt.textContent = prompt;
  choicePrompt.style.textAlign = "center";
  optionsContainer.appendChild(choicePrompt);

  choices.forEach((choice) => {
    const button = document.createElement("button");
    button.textContent = choice;
    button.addEventListener("click", () => handleChoice(choice));
    optionsContainer.appendChild(button);
  });
  optionsContainer.classList.remove("hidden");
}

function handleChoice(choice) {
  const message = {
    content: choice,
    role: "user",
  };
  messages.push(message);
  appendMessage(message);
  continueAdventure();
}

function changeBackgroundColor(response) {
  const colorMatches = response.match(/#([0-9a-fA-F]{6})/g);
  if (colorMatches && colorMatches.length >= 2) {
    document.body.style.background = `linear-gradient(to right, ${colorMatches[0]}, ${colorMatches[1]})`;
  } else {
    document.body.style.background = "#FFFFFF";
  }
}

function continueAdventure() {
  const aiMessage = {
    content: "Thinking...",
    role: "assistant",
  };
  appendMessage(aiMessage);

  const onFinishGenerating = (finalMessage) => {
    console.log("AI Response:", finalMessage);
    updateLastMessage(finalMessage);
    changeBackgroundColor(finalMessage);
    document.getElementById("send").disabled = false;

    if (finalMessage.includes("The End")) {
      generateChoices("The story has ended.", []);
      return;
    }

    const newChoices = extractChoices(finalMessage);
    console.log("newChoices", newChoices);
    if (newChoices.length > 0) {
      generateChoices("", newChoices);
    } else {
      generateChoices("What will you do next?", ["Continue", "Change storyline"]);
    }
  };

  streamingGenerating(messages, updateLastMessage, onFinishGenerating, console.error);
}

function extractChoices(response) {
  const lines = response.split("\n");
  const choices = lines
    .filter((line) => line.trim().startsWith("-") || /^\d+\./.test(line.trim()))
    .map((line) => line.replace(/^[-\d.]+/, "").trim());
  console.log("Response lines:", lines);
  console.log("Filtered choices:", choices);
  return choices;
}

function appendMessage(message) {
  const chatBox = document.getElementById("chat-box");
  const container = document.createElement("div");
  container.classList.add("message-container");
  const newMessage = document.createElement("div");
  newMessage.classList.add("message");
  newMessage.textContent = message.content;

  if (message.role === "user") {
    container.classList.add("user");
  } else {
    container.classList.add("assistant");
  }

  container.appendChild(newMessage);
  chatBox.appendChild(container);
  scrollToBottom();
}

function updateLastMessage(content) {
  const messageDoms = document.getElementById("chat-box").querySelectorAll(".message");
  const lastMessageDom = messageDoms[messageDoms.length - 1];
  lastMessageDom.textContent = content;
  scrollToBottom();
}

document.getElementById("send").addEventListener("click", function () {
  const input = document.getElementById("user-input").value.trim();
  if (input.length === 0) return;

  const message = {
    content: input,
    role: "user",
  };
  messages.push(message);
  appendMessage(message);

  document.getElementById("user-input").value = "";
  document.getElementById("send").disabled = true;
  continueAdventure();
});

document.getElementById("user-input").addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    document.getElementById("send").click();
  }
});

window.addEventListener("load", function () {
  initializeWebLLMEngine().then(() => {
    document.getElementById("send").disabled = false;
    startStory();
  });
});

