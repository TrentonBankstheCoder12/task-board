import { useState } from "react";
import type { BoardDispatch } from "../hooks/useBoard";
import { newId } from "../lib/id";
import { LABEL_COLORS, type Board, type LabelColor } from "../lib/types";
import { Modal } from "./Modal";

export function LabelManager({ board, dispatch, onClose }: { board: Board; dispatch: BoardDispatch; onClose: () => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<LabelColor>("blue");
  const [error, setError] = useState<string | null>(null);
  const usage = (id: string) => Object.values(board.cards).filter((c) => c.labelIds.includes(id)).length;

  return (
    <Modal title="Labels" onClose={onClose}>
      <ul className="label-admin">
        {board.labels.map((l) => (
          <li key={l.id}>
            <span className={`chip chip--${l.color}`}>{l.name}</span>
            <span className="muted">
              {usage(l.id)} card{usage(l.id) === 1 ? "" : "s"}
            </span>
            <button type="button" className="link-btn danger" onClick={() => dispatch({ type: "label/delete", id: l.id })}>
              Delete<span className="sr-only"> label {l.name}</span>
            </button>
          </li>
        ))}
        {board.labels.length === 0 && <li className="muted">No labels yet.</li>}
      </ul>
      <form
        className="label-form"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = name.trim();
          if (!trimmed) return setError("Enter a label name.");
          if (board.labels.some((l) => l.name.toLowerCase() === trimmed.toLowerCase())) {
            return setError(`"${trimmed}" already exists.`);
          }
          dispatch({ type: "label/add", label: { id: newId("label"), name: trimmed, color } });
          setName("");
          setError(null);
        }}
      >
        <label className="field">
          <span>New label</span>
          <input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} aria-invalid={error ? true : undefined} />
        </label>
        <fieldset className="swatches">
          <legend className="sr-only">Color</legend>
          {LABEL_COLORS.map((c) => (
            <label key={c} className={`swatch chip--${c}`} title={c}>
              <input type="radio" name="label-color" value={c} checked={color === c} onChange={() => setColor(c)} />
              <span className="sr-only">{c}</span>
            </label>
          ))}
        </fieldset>
        <button type="submit" className="btn">
          Add label
        </button>
      </form>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
