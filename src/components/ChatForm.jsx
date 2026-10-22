import { useRef } from "react";

const ChatForm = ({
  chatHistory,
  setChatHistory,
  generateBotResponse,
  isTyping,
  setIsTyping,
}) => {
  const inputRef = useRef();

  const handleFormSubmit = (e) => {
    e.preventDefault();

    if (isTyping) return;

    const userMessage = inputRef.current.value.trim();

    if (!userMessage) return;
    inputRef.current.value = "";

    const updatedHistory = [
      ...chatHistory,
      { role: "user", text: userMessage },
    ];

    // Update chat history with the users message
    setChatHistory(updatedHistory);
    setIsTyping(true);

    // Delay 600 ms before typing bubble and generating response
    setTimeout(() => {
      // Typing placeholder
      setChatHistory((history) => [
        ...history,
        { role: "model", text: "", isTyping: true },
      ]);

      // Call function to generate bot response
      generateBotResponse(updatedHistory);
    }, 600);
  };

  return (
    <form action="#" className="chat-form" onSubmit={handleFormSubmit}>
      <input
        ref={inputRef}
        type="text"
        placeholder={isTyping ? "Friendbot is typing..." : "Type a message..."}
        className="message-input"
        disabled={isTyping}
        required
      />
      <button
        className="material-symbols-rounded"
        disabled={isTyping}
        type="submit"
      >
        arrow_upward
      </button>
    </form>
  );
};

export default ChatForm;
