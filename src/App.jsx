import { useEffect, useRef, useState } from "react";
import ChatbotIcon from "./components/ChatbotIcon";
import ChatForm from "./components/ChatForm";
import ChatMessage from "./components/ChatMessage";
import RelationshipTimeline from "./components/RelationshipTimeline.jsx";
import RevealScreen from "./components/RevealScreen.jsx";
import {
  SYSTEM_PROMPT,
  emptyRelationshipCounts,
  calculateConnectionPercentage,
  getCurrentStage,
  extractMetaTag,
} from "./data/PromptData";

// Defined point where reveal is offered inside the chat.
const REVEAL_NUDGE_AFTER = 8;

const emptyReflections = () => ({ personal: "", noticed: "", interface: "" });

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

const logBadBody = (data) => {
  console.error("Unexpected response structure:", {
    status: data?.status ?? "missing",
    object: data?.object ?? "missing",
    model: data?.model ?? "missing",
    responseKeys: data && typeof data === "object" ? Object.keys(data) : [],
    totalOutputTokens: data?.usage?.total_output_tokens ?? "missing",
    hasSteps: Array.isArray(data?.steps),
  });
};

// slides accent hue from blue to voilet to magenta to coral to amber as connection percentage increases.
const getAccentHue = (percentage) =>
  Math.round((225 + percentage * 1.73) % 360);

const App = () => {
  const [chatHistory, setChatHistory] = useState([]);
  const [interactionId, setInteractionId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [relationshipCounts, setRelationshipCounts] = useState(
    emptyRelationshipCounts(),
  );

  // Reveal Screen state
  const [examples, setExamples] = useState({});
  const [showReveal, setShowReveal] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [reflections, setReflections] = useState(emptyReflections());

  const chatBodyRef = useRef(null);

  // Running tally for testing purposes. After every turn it is printed with console.table.
  const diagnostics = useRef({
    replies: 0,
    tagParsed: 0,
    tagMissing: 0,
    networkErrors: 0,
    apiErrors: 0,
    responseErrors: 0,
    retries: 0,
  });

  const logDiagnostics = () => {
    console.table(diagnostics.current);
  };

  const connectionPercentage =
    calculateConnectionPercentage(relationshipCounts);
  const currentStage = getCurrentStage(connectionPercentage);

  const userMessageCount = chatHistory.filter(
    (chat) => chat.role === "user",
  ).length;

  // At least one real reply, not counting placeholder or errors
  const hasReplies = chatHistory.some(
    (chat) => chat.role === "model" && !chat.isTyping && !chat.isError,
  );

  const showNudge =
    userMessageCount >= REVEAL_NUDGE_AFTER &&
    !nudgeDismissed &&
    !isTyping &&
    hasReplies;

  useEffect(() => {
    const el = chatBodyRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [chatHistory, showNudge]);

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
      logBadBody(data);
      throw new ChatError(
        "response",
        `Response has no steps array (status: ${data?.status ?? "none"})`,
      );
    }

    const modelOutput = data.steps.find(
      (step) => step?.type === "model_output",
    );

    if (!modelOutput || !Array.isArray(modelOutput.content)) {
      logBadBody(data);
      throw new ChatError(
        "response",
        `No model_output step with content (status: ${data?.status ?? "none"})`,
      );
    }

    const rawText = modelOutput.content.find(
      (part) => part?.type === "text",
    )?.text;

    if (typeof rawText !== "string" || !rawText.trim()) {
      logBadBody(data);
      throw new ChatError(
        "response",
        `Model output contained no text (status: ${data?.status ?? "none"})`,
      );
    }

    return { rawText, newInteractionId: data.id };
  };

  // Retries once on network errors, response shape errors and 5xx errors.
  // Failed attemps is counted so test results report the raw failure.

  const requestWithRetry = async (message) => {
    try {
      return await requestModelText(message);
    } catch (error) {
      const retryable =
        error instanceof ChatError &&
        (error.kind === "network" ||
          error.kind === "response" ||
          (error.kind === "api" && error.status >= 500));
      if (!retryable) throw error;

      console.warn(`[${error.kind} error] retrying once:`, error.message);

      if (error.kind === "network") diagnostics.current.networkErrors += 1;
      else if (error.kind === "api") diagnostics.current.apiErrors += 1;
      else diagnostics.current.responseErrors += 1;
      diagnostics.current.retries += 1;

      await new Promise((resolve) => setTimeout(resolve, 800));
      return requestModelText(message);
    }
  };

  const generateBotResponse = async (history) => {
    const latestMessage = history[history.length - 1];

    try {
      const { rawText, newInteractionId } =
        await requestWithRetry(latestMessage);

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

        // Remembers the first real example of each behaviour for reveal.
        setExamples((prevExamples) => {
          const next = { ...prevExamples };
          Object.keys(flags).forEach((key) => {
            if (flags[key] && !next[key]) {
              next[key] = { userText: latestMessage.text, botText };
            }
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

  // Clears the conversation
  const handleReset = () => {
    setChatHistory([]);
    setInteractionId(null);
    setRelationshipCounts(emptyRelationshipCounts());
    setExamples({});
    setReflections(emptyReflections());
    setNudgeDismissed(false);
    setShowReveal(false);
  };

  return (
    <div
      className="app-shell"
      data-stage={currentStage.id}
      style={{ "--hue": getAccentHue(connectionPercentage) }}
    >
      <div className="container">
        <div className="chatbot-popup">
          {/* Chatbot header */}
          <div className="chat-header">
            <div className="header-info">
              <ChatbotIcon />
              <h2 className="logo-text">Friendbot</h2>
            </div>
            <button
              type="button"
              className="reveal-trigger"
              onClick={() => setShowReveal(true)}
              disabled={!hasReplies}
              title={
                hasReplies
                  ? "See what was happening behind the scenes"
                  : "Chat for a bit first"
              }
            >
              End &amp; reflect
            </button>
          </div>

          {/* Chatbot Body */}
          <div className="chat-body" ref={chatBodyRef}>
            {/* Opening message. System prompt is told about this greeting so users first reply makes sense to model */}
            <div className="message bot-message">
              <ChatbotIcon />
              <p className="message-text">
                Hi I'm Friendbot! <br /> What's your name?
              </p>
            </div>

            {/* Render the chat history dynamically */}
            {chatHistory.map((chat, index) => (
              <ChatMessage key={index} chat={chat} />
            ))}

            {showNudge && (
              <div className="reveal-nudge" role="status">
                We've been chatting for a while. Want to see what was going on
                behind the scenes?
                <div className="reveal-nudge-actions">
                  <button
                    type="button"
                    className="reveal-button reveal-button--primary"
                    onClick={() => setShowReveal(true)}
                  >
                    Show me
                  </button>
                  <button
                    type="button"
                    className="reveal-button reveal-button--ghost"
                    onClick={() => setNudgeDismissed(true)}
                  >
                    Keep chatting
                  </button>
                </div>
              </div>
            )}
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

      {showReveal && (
        <RevealScreen
          connectionPercentage={connectionPercentage}
          currentStage={currentStage}
          relationshipCounts={relationshipCounts}
          examples={examples}
          reflections={reflections}
          setReflections={setReflections}
          onBack={() => setShowReveal(false)}
          onReset={handleReset}
          canReset={!isTyping}
        />
      )}
    </div>
  );
};

export default App;
