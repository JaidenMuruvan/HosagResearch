import { useEffect, useRef, useState } from "react";
import { CHECKLIST_ITEMS, MAX_OCCURRENCES_PER_ITEM } from "../data/PromptData";
import "./RevealScreen.css";

const TECHNIQUE_NOTES = {
  memory:
    "Having something you said earlier played back to you can make a conversation feel attentive. Friendbot can do this because earlier messages are passed back to it as context, not because it holds you in mind between replies.",
  similarity:
    'People tend to feel closer to those who talk the way they do. Friendbot adjusts its tone because its instructions tell it to, so part of the feeling of "we click" is designed.',
  validation:
    "Having a feeling acknowledged before getting advice is a strong signal of being understood. Friendbot produces that kind of language without experiencing the feeling itself.",
  continuity:
    "Coming back to an earlier topic makes separate messages feel like one ongoing relationship rather than a series of questions.",
  trust:
    "Admitting uncertainty or gently disagreeing can make a speaker seem more honest and credible. It is also a behaviour Friendbot was instructed to show, so the honesty you saw was part of the design.",
  care: "Following up on something that mattered to you signals that you matter. Friendbot can show interest, but it is not care in the way a person's would be.",
};

const REFLECTION_PROMPTS = [
  {
    key: "personal",
    question: "What felt personal?",
    hint: "Was there a moment where Friendbot seemed to know or understand you?",
  },
  {
    key: "noticed",
    question: "What did you notice?",
    hint: "Anything you spotted while chatting, or only now looking back?",
  },
  {
    key: "interface",
    question: "How did the interface shape how you saw the conversation?",
    hint: "Think about the percentage, the stage names and the colour changes.",
  },
];

const truncate = (text, max) =>
  text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;

const RevealScreen = ({
  connectionPercentage,
  currentStage,
  relationshipCounts,
  examples,
  reflections,
  setReflections,
  onBack,
  onReset,
  canReset,
}) => {
  const headingRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    headingRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onBack]);

  const handleCopy = async () => {
    const body = REFLECTION_PROMPTS.map(
      (p) => `${p.question}\n${reflections[p.key]?.trim() || "(no response)"}`,
    ).join("\n\n");

    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.warn("Could not copy reflections:", error);
    }
  };

  return (
    <div
      className="reveal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reveal-title"
    >
      <div className="reveal-panel">
        <header className="reveal-header">
          <span className="reveal-eyebrow">Behind the scenes</span>
          <h2
            id="reveal-title"
            className="reveal-title"
            ref={headingRef}
            tabIndex={-1}
          >
            What was happening in that conversation
          </h2>
          <p className="reveal-lead">
            Friendbot was built to use six techniques that tend to make people
            feel closer to someone in ordinary relationships. The score you saw
            counted how often it used each one. Here is how that score was
            built, and what it can and can't tell you.
          </p>
          <div className="reveal-score">
            <span className="reveal-score-number">{connectionPercentage}%</span>
            <span className="reveal-score-stage">{currentStage.label}</span>
          </div>
        </header>

        <section className="reveal-section">
          <h3 className="reveal-section-title">How your score was built</h3>
          <ul className="reveal-techniques">
            {CHECKLIST_ITEMS.map((item) => {
              const rawCount = relationshipCounts[item.key] || 0;
              const count = Math.min(rawCount, MAX_OCCURRENCES_PER_ITEM);
              const example = examples[item.key];

              return (
                <li key={item.key} className="reveal-technique">
                  <div className="reveal-technique-top">
                    <span className="reveal-technique-label">{item.label}</span>
                    <span className="reveal-technique-count">
                      {count} of {MAX_OCCURRENCES_PER_ITEM} counted
                    </span>
                  </div>
                  <p className="reveal-technique-note">
                    {TECHNIQUE_NOTES[item.key]}
                  </p>
                  {example ? (
                    <blockquote className="reveal-example">
                      <span className="reveal-example-line">
                        <strong>You said:</strong>{" "}
                        {truncate(example.userText, 120)}
                      </span>
                      <span className="reveal-example-line">
                        <strong>Friendbot replied:</strong>{" "}
                        {truncate(example.botText, 220)}
                      </span>
                    </blockquote>
                  ) : (
                    <p className="reveal-example-empty">
                      This didn't show up in your conversation.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="reveal-section">
          <h3 className="reveal-section-title">What the score is, and isn't</h3>
          <ul className="reveal-caveats">
            <li>
              <strong>These behaviours were instructed.</strong> Each one is
              written into Friendbot's system prompt. None of them were
              spontaneous.
            </li>
            <li>
              <strong>The model graded itself.</strong> After each reply it
              reported which behaviours it had used. Nothing independent checked
              that.
            </li>
            <li>
              <strong>The percentage is a design choice.</strong> Each behaviour
              counts up to four times, all weighted equally. It is not a
              validated measure of connection or attachment.
            </li>
            <li>
              <strong>The interface made it feel like progress.</strong> Stage
              names like "Trust" and "Attachment", a rising number and a
              shifting colour all frame the interaction as a relationship moving
              forward, whether or not it was.
            </li>
          </ul>
          <p className="reveal-closing-note">
            None of this means what you felt wasn't real. It means it was
            shaped, and it's worth seeing how.
          </p>
        </section>

        <section className="reveal-section">
          <h3 className="reveal-section-title">Your reflection</h3>
          <p className="reveal-reflection-intro">
            These answers stay in this window. They aren't saved or sent
            anywhere, and they're cleared if you start over.
          </p>
          {REFLECTION_PROMPTS.map((prompt) => (
            <div key={prompt.key} className="reveal-prompt">
              <label
                className="reveal-prompt-question"
                htmlFor={`reflection-${prompt.key}`}
              >
                {prompt.question}
              </label>
              <span className="reveal-prompt-hint">{prompt.hint}</span>
              <textarea
                id={`reflection-${prompt.key}`}
                className="reveal-textarea"
                rows={3}
                value={reflections[prompt.key] || ""}
                onChange={(e) =>
                  setReflections((prev) => ({
                    ...prev,
                    [prompt.key]: e.target.value,
                  }))
                }
              />
            </div>
          ))}
          <button
            type="button"
            className="reveal-button reveal-button--ghost"
            onClick={handleCopy}
          >
            {copied ? "Copied" : "Copy my reflections"}
          </button>
        </section>

        <footer className="reveal-footer">
          <button
            type="button"
            className="reveal-button reveal-button--primary"
            onClick={onBack}
          >
            Back to chat
          </button>
          <button
            type="button"
            className="reveal-button reveal-button--ghost"
            onClick={onReset}
            disabled={!canReset}
          >
            Start over
          </button>
        </footer>
      </div>
    </div>
  );
};

export default RevealScreen;
