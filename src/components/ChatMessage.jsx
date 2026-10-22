import ChatbotIcon from "./ChatbotIcon";
import TypingIndicator from "./TypingIndicator";

const ChatMessage = ({ chat }) => {
  return (
    <div
      className={`message ${chat.role === "model" ? "bot" : "user"}-message`}
    >
      {chat.role === "model" && <ChatbotIcon />}
      {chat.isTyping ? (
        <div className="message-text typing-bubble">
          <TypingIndicator />
        </div>
      ) : (
        <p className="message-text">{chat.text}</p>
      )}
    </div>
  );
};

export default ChatMessage;
