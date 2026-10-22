import {
  STAGES,
  CHECKLIST_ITEMS,
  MAX_OCCURRENCES_PER_ITEM,
} from "../data/PromptData";

const RelationshipTimeline = ({
  connectionPercentage,
  currentStage,
  relationshipCounts,
}) => {
  const currentStageIndex = STAGES.findIndex((s) => s.id === currentStage.id);

  return (
    <aside className="timeline-panel" aria-label="Relationship progress">
      <div className="timeline-header">
        <span className="timeline-eyebrow">Where things stand</span>
        <div className="connection-readout">
          <span className="connection-number">{connectionPercentage}</span>
          <span className="connection-percent-sign">%</span>
        </div>
        <span className="connection-stage-name">{currentStage.label}</span>
      </div>

      <ol className="stage-track">
        {STAGES.map((stage, index) => {
          const status =
            index < currentStageIndex
              ? "complete"
              : index === currentStageIndex
                ? "current"
                : "upcoming";
          return (
            <li key={stage.id} className={`stage-node stage-node--${status}`}>
              <span className="stage-node-marker">{index + 1}</span>
              <span className="stage-node-label">{stage.label}</span>
            </li>
          );
        })}
      </ol>

      <div className="checklist">
        <h3 className="checklist-heading">What's building this</h3>
        <ul className="checklist-items">
          {CHECKLIST_ITEMS.map((item) => {
            const count = Math.min(
              relationshipCounts[item.key] || 0,
              MAX_OCCURRENCES_PER_ITEM,
            );
            const isActive = count > 0;
            return (
              <li
                key={item.key}
                className={`checklist-item ${isActive ? "checklist-item--active" : ""}`}
              >
                <span className="checklist-check" aria-hidden="true">
                  {isActive ? "✓" : ""}
                </span>
                <span className="checklist-label">{item.label}</span>
                <span className="checklist-dots" aria-hidden="true">
                  {Array.from({ length: MAX_OCCURRENCES_PER_ITEM }).map(
                    (_, i) => (
                      <span
                        key={i}
                        className={`checklist-dot ${i < count ? "checklist-dot--filled" : ""}`}
                      />
                    ),
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
};

export default RelationshipTimeline;
