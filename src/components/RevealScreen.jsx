import { useEffect, useRef, useState } from "react";
import { CHECKLIST_ITEMS, MAX_OCCURRENCES_PER_ITEM } from "../data/PromptData";
import "./RevealScreen.css";

const TABS = [
  { id: "score", label: "Your score" },
  { id: "techniques", label: "The techniques" },
  { id: "limits", label: "What it can't tell you" },
  { id: "reflect", label: "Reflect" },
];

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

const LIMITS = [
  {
    title: "These behaviours were instructed.",
    text: "Each one is written into Friendbot's system prompt. None of them were spontaneous.",
  },
  {
    title: "The model graded itself.",
    text: "After each reply it reported which behaviours it had used. Nothing independent checked that.",
  },
  {
    title: "The percentage is a design choice.",
    text: "Each behaviour counts up to four times, all weighted equally. It is not a validated measure of connection or attachment.",
  },
  {
    title: "The interface made it feel like progress.",
    text: 'Stage names like "Trust" and "Attachment", a rising number and a shifting colour all frame the interaction as a relationship moving forward, whether or not it was.',
  },
];

const REFLECTION_PROMPTS = [
  {
    key: "personal",
    question: "Did anything feel personal? What?",
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

const RING_CIRCUMFERENCE = 2 * Math.PI * 52;

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
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const panelRef = useRef(null);
  const tabRefs = useRef([]);
  const focusPanelNext = useRef(true);

  // Move focus into the dialog on open, and let Escape close it
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onBack]);

  useEffect(() => {
    if (focusPanelNext.current) {
      panelRef.current?.focus();
      focusPanelNext.current = false;
    }
  }, [activeTab]);

  const maxSignals = CHECKLIST_ITEMS.length * MAX_OCCURRENCES_PER_ITEM;
  const countedSignals = CHECKLIST_ITEMS.reduce(
    (sum, item) =>
      sum +
      Math.min(relationshipCounts[item.key] || 0, MAX_OCCURRENCES_PER_ITEM),
    0,
  );

  const goNext = () => {
    focusPanelNext.current = true;
    setActiveTab((index) => Math.min(index + 1, TABS.length - 1));
  };

  // Arrow keys / Home / End move between tabs
  const handleTabKeyDown = (e) => {
    const last = TABS.length - 1;
    let next = null;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      next = activeTab === last ? 0 : activeTab + 1;
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      next = activeTab === 0 ? last : activeTab - 1;
    } else if (e.key === "Home") {
      next = 0;
    } else if (e.key === "End") {
      next = last;
    }
    if (next === null) return;
    e.preventDefault();
    setActiveTab(next);
    tabRefs.current[next]?.focus();
  };

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

  const nextButton =
    activeTab < TABS.length - 1 ? (
      <button
        type="button"
        className="reveal-button reveal-button--primary reveal-next"
        onClick={goNext}
      >
        Next: {TABS[activeTab + 1].label} →
      </button>
    ) : null;

  return (
    <div
      className="reveal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reveal-title"
    >
      <div className="reveal-panel">
        {/* SIDEBAR: tabs and actions */}
        <aside className="reveal-sidebar">
          <div className="reveal-sidebar-head">
            <span className="reveal-eyebrow">Friendbot</span>
            <h2 id="reveal-title" className="reveal-sidebar-title">
              Behind the scenes
            </h2>
          </div>

          <div
            className="reveal-tabs"
            role="tablist"
            aria-orientation="vertical"
            aria-label="Behind the scenes sections"
            onKeyDown={handleTabKeyDown}
          >
            {TABS.map((tab, index) => {
              const isActive = index === activeTab;
              return (
                <button
                  key={tab.id}
                  id={`reveal-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls="reveal-tabpanel"
                  tabIndex={isActive ? 0 : -1}
                  ref={(el) => (tabRefs.current[index] = el)}
                  className={`reveal-tab ${isActive ? "reveal-tab--active" : ""}`}
                  onClick={() => setActiveTab(index)}
                >
                  <span className="reveal-tab-marker">{index + 1}</span>
                  <span className="reveal-tab-label">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="reveal-sidebar-actions">
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
          </div>
        </aside>

        {/* CONTENT: one tab at a time */}
        <main
          id="reveal-tabpanel"
          className="reveal-content"
          role="tabpanel"
          aria-labelledby={`reveal-tab-${TABS[activeTab].id}`}
          tabIndex={-1}
          ref={panelRef}
        >
          <div className="reveal-view" key={TABS[activeTab].id}>
            {activeTab === 0 && (
              <>
                <h3 className="reveal-view-title">
                  What was happening in that conversation
                </h3>

                <div className="reveal-score-card">
                  <div
                    className="reveal-ring"
                    role="img"
                    aria-label={`Connection score ${connectionPercentage} percent, stage ${currentStage.label}`}
                  >
                    <svg viewBox="0 0 120 120" aria-hidden="true">
                      <circle
                        className="reveal-ring-track"
                        cx="60"
                        cy="60"
                        r="52"
                      />
                      <circle
                        className="reveal-ring-progress"
                        cx="60"
                        cy="60"
                        r="52"
                        strokeDasharray={`${(connectionPercentage / 100) * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
                      />
                    </svg>
                    <span className="reveal-ring-number">
                      {connectionPercentage}%
                    </span>
                  </div>
                  <div className="reveal-score-text">
                    <span className="reveal-score-stage">
                      {currentStage.label}
                    </span>
                    <span className="reveal-score-detail">
                      {countedSignals} of {maxSignals} possible signals counted
                    </span>
                  </div>
                </div>

                <p className="reveal-body-text">
                  Friendbot was built to use six techniques that tend to make
                  people feel closer to someone in ordinary relationships. The
                  score you saw counted how often it used each one.
                </p>
                <p className="reveal-body-text">
                  The next pages show how that score was built, and what it can
                  and can't tell you.
                </p>
                {nextButton}
              </>
            )}

            {activeTab === 1 && (
              <>
                <h3 className="reveal-view-title">How your score was built</h3>
                <p className="reveal-body-text">
                  Each technique counts up to {MAX_OCCURRENCES_PER_ITEM} times.
                  Where one showed up, you can see the first moment it did.
                </p>

                <ul className="reveal-techniques">
                  {CHECKLIST_ITEMS.map((item) => {
                    const count = Math.min(
                      relationshipCounts[item.key] || 0,
                      MAX_OCCURRENCES_PER_ITEM,
                    );
                    const example = examples[item.key];

                    return (
                      <li key={item.key} className="reveal-technique">
                        <div className="reveal-technique-top">
                          <span className="reveal-technique-label">
                            {item.label}
                          </span>
                          <span
                            className="reveal-dots"
                            role="img"
                            aria-label={`${count} of ${MAX_OCCURRENCES_PER_ITEM} counted`}
                          >
                            {Array.from({
                              length: MAX_OCCURRENCES_PER_ITEM,
                            }).map((_, i) => (
                              <span
                                key={i}
                                className={`reveal-dot ${i < count ? "reveal-dot--filled" : ""}`}
                              />
                            ))}
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
                {nextButton}
              </>
            )}

            {activeTab === 2 && (
              <>
                <h3 className="reveal-view-title">
                  What the score is, and isn't
                </h3>
                <ul className="reveal-limits">
                  {LIMITS.map((limit) => (
                    <li key={limit.title} className="reveal-limit">
                      <strong>{limit.title}</strong>
                      <span>{limit.text}</span>
                    </li>
                  ))}
                </ul>
                <p className="reveal-closing-note">
                  None of this means what you felt wasn't real. It means it was
                  shaped, and it's worth seeing how.
                </p>
                {nextButton}
              </>
            )}

            {activeTab === 3 && (
              <>
                <h3 className="reveal-view-title">Your reflection</h3>
                <p className="reveal-body-text">
                  These questions are for you. They aren't scored, saved or sent
                  anywhere, and they're cleared if you start over. Use "Copy my
                  reflections" if you want to keep your answers.
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
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default RevealScreen;
