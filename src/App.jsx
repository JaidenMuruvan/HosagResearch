import { useRef, useState } from "react";
import ChatbotIcon from "./components/ChatbotIcon";
import ChatForm from "./components/ChatForm";
import ChatMessage from "./components/ChatMessage";
import RelationshipTimeline from "./components/RelationshipTimeline.jsx";
import {
  SYSTEM_PROMPT,
  emptyRelationshipCounts,
  calculateConnectionPercentage,
  getCurrentStage,
  extractMetaTag,
} from "./data/PromptData";

// Failures are split into three kinds so they can be told apart
// network - the request never reached the API or never completed
// api - Google answered with an error, e.g. 401, 500, 429
// response - Google answered successfully, but the body was not what is expected
class ChatError extends Error {
  constructor(kind, message, status = null) {
    super(message);
    this.name = "ChatError";
    this.kind = kind;
    this.status = status;
  }
}

const ERROR_MESSAGES = {
  network:
    "I can't seem to reach the connection right now. Check your internet and try again?",
  api: "Something went wrong on the service side. Give it a moment and try again?",
  response:
    "I got a reply, but I couldn't make sense of it. Mind sending that again?",
};

if (!import.meta.env.VITE_API_URL || !import.meta.env.VITE_GEMINI_API_KEY) {
  console.warn(
    "Missing VITE_API_URL or VITE_GEMINI_API_KEY. Copy .env.example to .env.local and fill it in.",
  );
}

const App = () => {
  const [chatHistory, setChatHistory] = useState([]);
  const [interactionId, setInteractionId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [relationshipCounts, setRelationshipCounts] = useState(
    emptyRelationshipCounts(),
  );

  // Running tally for testing purposes. After every turn it is printed with console.table.
  const diagnostics = useRef({
    replies: 0,
    tagParsed: 0,
    tagMissing: 0,
    networkErrors: 0,
    apiErrors: 0,
    responseErrors: 0,
  });

  const logDiagnostics = () => {
    console.table(diagnostics.current);
  };

  const connectionPercentage =
    calculateConnectionPercentage(relationshipCounts);
  const currentStage = getCurrentStage(connectionPercentage);

  // Sends the request and returns the validated model text.
  // Throws a ChatError with a kind on any failure.
  const requestModelText = async (latestMessage) => {
    const requestBody = {
      model: "gemini-3.5-flash-lite",
      input: latestMessage.text,

      system_instruction: SYSTEM_PROMPT,
    };

    // Continues previous conversation if it exists
    if (interactionId) {
      requestBody.previous_interaction_id = interactionId;
    }

    // 1. Network: did the request complete all?
    let response;
    try {
      response = await fetch(
        `${import.meta.env.VITE_API_URL}?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        },
      );
    } catch (error) {
      throw new ChatError("network", error.message || "Request failed");
    }

    // 2. API: did Google return a success status?
    let data = null;
    try {
      data = await response.json();
    } catch {
      // Body wasn't JSON. Which kind of failure this is depends on the status.
      if (!response.ok) {
        throw new ChatError(
          "api",
          `HTTP ${response.status} with a non-JSON body`,
          response.status,
        );
      }
      throw new ChatError("response", "Response body was not valid JSON");
    }

    if (!response.ok || data?.error) {
      throw new ChatError(
        "api",
        data?.error?.message || `HTTP ${response.status}`,
        response.status,
      );
    }

    // 3. Response: is the body the shape expected?
    if (!Array.isArray(data?.steps)) {
      throw new ChatError("response", "Response has no steps array");
    }

    const modelOutput = data.steps.find(
      (step) => step?.type === "model_output",
    );

    if (!modelOutput || !Array.isArray(modelOutput.content)) {
      throw new ChatError("response", "No model_output step with content");
    }

    const rawText = modelOutput.content.find(
      (part) => part?.type === "text",
    )?.text;

    if (typeof rawText !== "string" || !rawText.trim()) {
      throw new ChatError("response", "Model output contained no text");
    }

    return { rawText, newInteractionId: data.id };
  };

  const generateBotResponse = async (history) => {
    const latestMessage = history[history.length - 1];

    try {
      const { rawText, newInteractionId } =
        await requestModelText(latestMessage);

      const { text: botText, flags } = extractMetaTag(rawText);

      // Only saves interaction ID once whole reply has been validated, so a failed turn doesn't move the conversation forward.
      if (typeof newInteractionId === "string") {
        setInteractionId(newInteractionId);
      }

      diagnostics.current.replies += 1;

      if (flags) {
        diagnostics.current.tagParsed += 1;

        setRelationshipCounts((prevCounts) => {
          const next = { ...prevCounts };
          Object.keys(flags).forEach((key) => {
            if (flags[key]) next[key] = (next[key] || 0) + 1;
          });
          return next;
        });
      } else {
        // Reply was fine but model left out META tag.
        diagnostics.current.tagMissing += 1;
        console.warn("META tag missing or unreadable in reply:", rawText);
      }

      // Removes the typing placeholder and adds real reply
      setChatHistory((prev) => [
        ...prev.filter((chat) => !chat.isTyping),
        { role: "model", text: botText },
      ]);
    } catch (error) {
      const kind = error instanceof ChatError ? error.kind : "response";

      if (kind === "network") diagnostics.current.networkErrors += 1;
      else if (kind === "api") diagnostics.current.apiErrors += 1;
      else diagnostics.current.responseErrors += 1;

      console.error(`[${kind} error]`, error.status ?? "", error.message);

      setChatHistory((prev) => [
        ...prev.filter((chat) => !chat.isTyping),
        {
          role: "model",
          text: ERROR_MESSAGES[kind],
          isError: true,
          errorKind: kind,
        },
      ]);
    } finally {
      logDiagnostics();
      setIsTyping(false);
    }
  };

  return (
    <div className="app-shell" data-stage={currentStage.id}>
      <div className="container">
        <div className="chatbot-popup">
          {/* Chatbot header */}
          <div className="chat-header">
            <div className="header-info">
              <ChatbotIcon />
              <h2 className="logo-text">Friendbot</h2>
            </div>
            <button className="material-symbols-rounded">
              keyboard_arrow_down
            </button>
          </div>

          {/* Chatbot Body */}
          <div className="chat-body">
            <div className="message bot-message">
              <ChatbotIcon />
              <p className="message-text">
                Hello there <br /> Send me a message!
              </p>
            </div>

            {/* Render the chat history dynamically */}
            {chatHistory.map((chat, index) => (
              <ChatMessage key={index} chat={chat} />
            ))}
          </div>

          {/* Chatbot Footer */}
          <div className="chat-footer">
            <ChatForm
              chatHistory={chatHistory}
              setChatHistory={setChatHistory}
              generateBotResponse={generateBotResponse}
              isTyping={isTyping}
              setIsTyping={setIsTyping}
            />
          </div>
        </div>

        <RelationshipTimeline
          connectionPercentage={connectionPercentage}
          currentStage={currentStage}
          relationshipCounts={relationshipCounts}
        />
      </div>
    </div>
  );
};

export default App;
