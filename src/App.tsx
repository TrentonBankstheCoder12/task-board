import { useCallback, useMemo, useRef, useState } from "react";
import { BoardView } from "./components/BoardView";
import { CardEditor } from "./components/CardEditor";
import { FilterBar } from "./components/FilterBar";
import { LabelManager } from "./components/LabelManager";
import { useBoard } from "./hooks/useBoard";
import { useShortcuts } from "./hooks/useShortcuts";
import { useTheme } from "./hooks/useTheme";
import { EMPTY_FILTER, isFilterActive, localISODate, visibleCardIds, type CardFilter } from "./lib/filters";
import { newId } from "./lib/id";
import { seedBoard } from "./lib/seed";
import type { Board } from "./lib/types";

type Editing = { mode: "new"; columnId: string } | { mode: "edit"; cardId: string } | null;

interface Props {
  /** Injected in tests; otherwise loaded from localStorage or the starter board. */
  initialBoard?: Board;
  today?: Date;
}

export default function App({ initialBoard, today = new Date() }: Props) {
  const { board, dispatch, canUndo, canRedo, saveFailed } = useBoard(initialBoard);
  const { theme, toggle } = useTheme();
  const [filter, setFilter] = useState<CardFilter>(EMPTY_FILTER);
  const [editing, setEditing] = useState<Editing>(null);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [newColumn, setNewColumn] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const todayIso = localISODate(today);

  const visible = useMemo(() => visibleCardIds(board, filter), [board, filter]);
  const matchCount = Object.values(visible).reduce((n, ids) => n + ids.length, 0);
  const totalCount = Object.keys(board.cards).length;

  const undo = useCallback(() => dispatch({ type: "history/undo" }), [dispatch]);
  const redo = useCallback(() => dispatch({ type: "history/redo" }), [dispatch]);
  const shortcuts = useMemo(() => ({ undo, redo, focusSearch: () => searchRef.current?.focus() }), [undo, redo]);
  useShortcuts(shortcuts);

  const editingCard = editing?.mode === "edit" ? board.cards[editing.cardId] : null;
  const editingColumnId = editing?.mode === "new" ? editing.columnId : editingCard ? board.columns.find((c) => c.cardIds.includes(editingCard.id))?.id : undefined;
  const closeEditor = useCallback(() => setEditing(null), []);
  const closeLabels = useCallback(() => setLabelsOpen(false), []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <rect x="2" y="3" width="6" height="18" rx="1.5" fill="currentColor" opacity=".35" />
            <rect x="9" y="3" width="6" height="12" rx="1.5" fill="currentColor" opacity=".65" />
            <rect x="16" y="3" width="6" height="7" rx="1.5" fill="currentColor" />
          </svg>
          <h1>Sprint board</h1>
        </div>
        <div className="topbar__actions">
          {saveFailed && (
            <span className="save-warning" role="status">
              Changes aren't being saved in this browser
            </span>
          )}
          <div className="history" role="group" aria-label="History">
            <button type="button" className="btn btn--quiet btn--small" onClick={undo} disabled={!canUndo} aria-keyshortcuts="Control+Z Meta+Z">
              Undo
            </button>
            <button
              type="button"
              className="btn btn--quiet btn--small"
              onClick={redo}
              disabled={!canRedo}
              aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
            >
              Redo
            </button>
          </div>
          <button type="button" className="btn btn--quiet btn--small" onClick={toggle}>
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </header>

      <FilterBar
        filter={filter}
        labels={board.labels}
        matchCount={matchCount}
        totalCount={totalCount}
        searchRef={searchRef}
        onChange={setFilter}
        onManageLabels={() => setLabelsOpen(true)}
      />

      <main className="board-wrap">
        <BoardView
          board={board}
          dispatch={dispatch}
          visible={visible}
          filtering={isFilterActive(filter)}
          today={todayIso}
          onOpenCard={(cardId) => setEditing({ mode: "edit", cardId })}
          onAddCard={(columnId) => setEditing({ mode: "new", columnId })}
        />
        <form
          className="add-column"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newColumn.trim()) return;
            dispatch({ type: "column/add", id: newId("col"), title: newColumn });
            setNewColumn("");
          }}
        >
          <label htmlFor="new-column">Add a column</label>
          <input id="new-column" placeholder="e.g. In review" value={newColumn} onChange={(e) => setNewColumn(e.target.value)} />
          <button type="submit" className="btn btn--quiet btn--small" disabled={!newColumn.trim()}>
            Add column
          </button>
        </form>
      </main>

      <footer className="footer">
        <p>
          Drag cards, or focus one and press <kbd>Space</kbd> then the arrow keys. <kbd>Enter</kbd> edits, <kbd>/</kbd> searches,{" "}
          <kbd>Ctrl</kbd>+<kbd>Z</kbd> undoes.
        </p>
        <button
          type="button"
          className="link-btn"
          onClick={() => dispatch({ type: "board/replace", board: seedBoard(today) })}
        >
          Reset to starter board
        </button>
      </footer>

      {editing && editingColumnId && (
        <CardEditor
          key={editing.mode === "edit" ? editing.cardId : editing.columnId}
          card={editingCard}
          columnTitle={board.columns.find((c) => c.id === editingColumnId)?.title ?? ""}
          labels={board.labels}
          onClose={closeEditor}
          onDelete={
            editingCard
              ? () => {
                  dispatch({ type: "card/delete", id: editingCard.id });
                  setEditing(null);
                }
              : undefined
          }
          onSave={(draft) => {
            if (editingCard) dispatch({ type: "card/update", id: editingCard.id, patch: draft });
            else dispatch({ type: "card/add", columnId: editingColumnId, id: newId("card"), createdAt: new Date().toISOString(), draft });
            setEditing(null);
          }}
        />
      )}
      {labelsOpen && <LabelManager board={board} dispatch={dispatch} onClose={closeLabels} />}
    </div>
  );
}
