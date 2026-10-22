import { useState } from "react";
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

const App = () => {
  const [chatHistory, setChatHistory] = useState([]);
  const [interactionId, setInteractionId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [relationshipCounts, setRelationshipCounts] = useState(
    emptyRelationshipCounts(),
  );

  const connectionPercentage =
    calculateConnectionPercentage(relationshipCounts);
  const currentStage = getCurrentStage(connectionPercentage);

  const generateBotResponse = async (history) => {
    const latestMessage = history[history.length - 1];

    const requestBody = {
      model: "gemini-3.5-flash-lite",
      input: latestMessage.text,

      system_instruction: SYSTEM_PROMPT,
    };

    // Continues previous conversation if it exists
    if (interactionId) {
      requestBody.previous_interaction_id = interactionId;
    }

    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    };

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        requestOptions,
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Something went wrong!");
      }

      // Saves interaction ID for next message
      setInteractionId(data.id);
      console.log("Interaction ID:", data.id);

      const modelOutput = data.steps.find(
        (step) => step.type === "model_output",
      );

      const rawText = modelOutput?.content.find(
        (content) => content.type === "text",
      )?.text;

      if (!rawText) {
        throw new Error("No response text returned by Gemini");
      }

      const { text: botText, flags } = extractMetaTag(rawText);

      // strips hidden meta... tag off reply and reads what relationship behaviour the model used
      if (flags) {
        setRelationshipCounts((prevCounts) => {
          const next = { ...prevCounts };
          Object.keys(flags).forEach((key) => {
            if (flags[key]) next[key] = (next[key] || 0) + 1;
          });
          return next;
        });
      }

      // Removes the typing placeholder and adds the real reply
      setChatHistory((history) => [
        ...history.filter((chat) => !chat.isTyping),
        { role: "model", text: botText },
      ]);
    } catch (error) {
      console.error(error);
      setChatHistory((history) => [
        ...history.filter((chat) => !chat.isTyping),
        {
          role: "model",
          text: "Sorry, something went wrong on my end. Mind trying that again?",
        },
      ]);
    } finally {
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
