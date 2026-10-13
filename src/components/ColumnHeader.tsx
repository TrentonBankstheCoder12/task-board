import { useEffect, useRef, useState } from "react";
import type { BoardDispatch } from "../hooks/useBoard";
import type { Column } from "../lib/types";

interface Props {
  column: Column;
  index: number;
  columnCount: number;
  total: number;
  overLimit: boolean;
  dispatch: BoardDispatch;
}

/** Column title (click to rename), card count against the WIP limit, and a small actions menu. */
export function ColumnHeader({ column, index, columnCount, total, overLimit, dispatch }: Props) {
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(column.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const commitRename = () => {
    dispatch({ type: "column/rename", id: column.id, title });
    setRenaming(false);
  };

  const setWip = () => {
    const raw = window.prompt(`Work-in-progress limit for "${column.title}" (leave empty for none)`, column.wipLimit?.toString() ?? "");
    if (raw === null) return;
    const n = Number.parseInt(raw, 10);
    dispatch({ type: "column/wip", id: column.id, limit: Number.isFinite(n) && n > 0 ? n : null });
  };

  const run = (fn: () => void) => () => {
    setMenuOpen(false);
    fn();
  };

  return (
    <header className="column__head">
      {renaming ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            commitRename();
          }}
        >
          <label className="sr-only" htmlFor={`rename-${column.id}`}>
            Column name
          </label>
          <input
            id={`rename-${column.id}`}
            className="column__rename"
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setTitle(column.title);
                setRenaming(false);
              }
            }}
          />
        </form>
      ) : (
        <h2 id={`col-${column.id}`} className="column__title">
          <button
            type="button"
            onClick={() => {
              setTitle(column.title);
              setRenaming(true);
            }}
            aria-label={`${column.title}, rename column`}
          >
            {column.title}
          </button>
        </h2>
      )}
      <span className={`count${overLimit ? " is-over" : ""}`} title={overLimit ? "Over the work-in-progress limit" : undefined}>
        {total}
        {column.wipLimit !== null && <span className="count__limit">/{column.wipLimit}</span>}
        {overLimit && <span className="sr-only"> cards, over the limit of {column.wipLimit}</span>}
      </span>
      <div className="menu" ref={menuRef}>
        <button
          type="button"
          className="icon-btn"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`${column.title} column actions`}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
            <circle cx="3.5" cy="8" r="1.3" fill="currentColor" />
            <circle cx="8" cy="8" r="1.3" fill="currentColor" />
            <circle cx="12.5" cy="8" r="1.3" fill="currentColor" />
          </svg>
        </button>
        {menuOpen && (
          <div className="menu__list" role="menu" onKeyDown={(e) => e.key === "Escape" && setMenuOpen(false)}>
            <button role="menuitem" type="button" autoFocus onClick={run(() => setRenaming(true))}>
              Rename
            </button>
            <button role="menuitem" type="button" onClick={run(setWip)}>
              Set WIP limit
            </button>
            <button
              role="menuitem"
              type="button"
              disabled={index === 0}
              onClick={run(() => dispatch({ type: "column/move", id: column.id, toIndex: index - 1 }))}
            >
              Move left
            </button>
            <button
              role="menuitem"
              type="button"
              disabled={index === columnCount - 1}
              onClick={run(() => dispatch({ type: "column/move", id: column.id, toIndex: index + 1 }))}
            >
              Move right
            </button>
            <button
              role="menuitem"
              type="button"
              className="danger"
              disabled={columnCount === 1}
              onClick={run(() => dispatch({ type: "column/delete", id: column.id }))}
            >
              Delete column{total > 0 ? ` and ${total} card${total === 1 ? "" : "s"}` : ""}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
