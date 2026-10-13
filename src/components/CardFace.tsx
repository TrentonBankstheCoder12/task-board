import { dueStatus, type DueStatus } from "../lib/filters";
import type { Card, Label, Priority } from "../lib/types";

const PRIORITY_RANK: Record<Priority, number> = { low: 1, medium: 2, high: 3, urgent: 4 };
export const PRIORITY_LABEL: Record<Priority, string> = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };

const dueFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
export const formatDue = (iso: string) => dueFmt.format(new Date(`${iso}T00:00:00Z`));

const DUE_TEXT: Record<Exclude<DueStatus, "none">, string> = {
  overdue: "Overdue",
  today: "Due today",
  soon: "Due",
  later: "Due",
};

/** Priority as rising bars: rank is readable from shape, and the text label is always present for screen readers. */
export function PriorityGlyph({ priority }: { priority: Priority }) {
  const rank = PRIORITY_RANK[priority];
  return (
    <span className={`priority priority--${priority}`} title={`${PRIORITY_LABEL[priority]} priority`}>
      <svg viewBox="0 0 14 12" width="14" height="12" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={i * 3.6} y={9 - i * 3} width="2.6" height={3 + i * 3} rx="0.8" className={i < rank ? "on" : "off"} />
        ))}
      </svg>
      <span className={priority === "urgent" || priority === "high" ? "" : "sr-only"}>{PRIORITY_LABEL[priority]}</span>
      {priority !== "urgent" && priority !== "high" && <span className="sr-only"> priority</span>}
    </span>
  );
}

/** Visual content of a card, shared by the board and the drag overlay. */
export function CardFace({ card, labels, today }: { card: Card; labels: Label[]; today: string }) {
  const status = dueStatus(card.due, today);
  const cardLabels = card.labelIds.map((id) => labels.find((l) => l.id === id)).filter((l): l is Label => !!l);
  return (
    <>
      {cardLabels.length > 0 && (
        <ul className="chips" aria-label="Labels">
          {cardLabels.map((l) => (
            <li key={l.id} className={`chip chip--${l.color}`}>
              {l.name}
            </li>
          ))}
        </ul>
      )}
      <p className="card__title">{card.title}</p>
      {card.description && <p className="card__desc">{card.description}</p>}
      <div className="card__meta">
        <PriorityGlyph priority={card.priority} />
        {card.due && status !== "none" && (
          <span className={`due due--${status}`}>
            {(status === "overdue" || status === "today") && (
              <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden>
                <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <path d="M6 3.2V6l1.8 1.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            )}
            {DUE_TEXT[status]} {formatDue(card.due)}
          </span>
        )}
      </div>
    </>
  );
}
