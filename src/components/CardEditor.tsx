import { useState } from "react";
import type { CardDraft } from "../lib/board";
import { PRIORITIES, type Card, type Label, type Priority } from "../lib/types";
import { PRIORITY_LABEL } from "./CardFace";
import { Modal } from "./Modal";

interface Props {
  /** Existing card to edit, or null to create one. */
  card: Card | null;
  columnTitle: string;
  labels: Label[];
  onSave: (draft: Required<CardDraft>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

/** One form for both creating and editing a card. */
export function CardEditor({ card, columnTitle, labels, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(card?.title ?? "");
  const [description, setDescription] = useState(card?.description ?? "");
  const [labelIds, setLabelIds] = useState<string[]>(card?.labelIds ?? []);
  const [due, setDue] = useState(card?.due ?? "");
  const [priority, setPriority] = useState<Priority>(card?.priority ?? "medium");
  const [error, setError] = useState<string | null>(null);

  const toggleLabel = (id: string) => setLabelIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  return (
    <Modal title={card ? "Edit card" : `New card in ${columnTitle}`} onClose={onClose}>
      <form
        className="editor"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return setError("Give the card a title.");
          onSave({ title, description, labelIds, due: due || null, priority });
        }}
      >
        <label className="field">
          <span>Title</span>
          <input
            data-autofocus
            value={title}
            maxLength={140}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "title-error" : undefined}
            onChange={(e) => {
              setTitle(e.target.value);
              setError(null);
            }}
          />
        </label>
        {error && (
          <p id="title-error" className="field-error" role="alert">
            {error}
          </p>
        )}
        <label className="field">
          <span>Description</span>
          <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div className="editor__row">
          <label className="field">
            <span>Priority</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Due date</span>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
        </div>
        {labels.length > 0 && (
          <fieldset className="field">
            <legend>Labels</legend>
            <div className="label-picks">
              {labels.map((l) => (
                <label key={l.id} className={`chip chip--${l.color} chip--pick`}>
                  <input type="checkbox" checked={labelIds.includes(l.id)} onChange={() => toggleLabel(l.id)} />
                  {l.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="editor__actions">
          {onDelete && (
            <button type="button" className="btn btn--danger" onClick={onDelete}>
              Delete card
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn btn--quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn">
            {card ? "Save card" : "Add card"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
