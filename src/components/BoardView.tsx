import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, type KeyboardEvent } from "react";
import { visibleToFullIndex } from "../lib/board";
import type { Board, Card, Column, Label } from "../lib/types";
import type { BoardDispatch } from "../hooks/useBoard";
import { CardFace } from "./CardFace";
import { ColumnHeader } from "./ColumnHeader";

interface Props {
  board: Board;
  dispatch: BoardDispatch;
  /** Visible card ids per column after filters. */
  visible: Record<string, string[]>;
  filtering: boolean;
  today: string;
  onOpenCard: (id: string) => void;
  onAddCard: (columnId: string) => void;
}

/**
 * Drag and drop with @dnd-kit.
 *
 * While a card is being dragged we keep a local *preview* of the columns and
 * only dispatch ONE `card/move` on drop. That keeps the reducer and the undo
 * history clean: a drag across three columns is one undoable step, not twenty.
 */
export function BoardView({ board, dispatch, visible, filtering, today, onOpenCard, onAddCard }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Record<string, string[]> | null>(null);
  const items = preview ?? visible;

  const sensors = useSensors(
    // A small distance lets a plain click open the card instead of starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Space picks up / drops, arrows move, Escape cancels. Enter is left free to open the card.
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    }),
  );

  const columnOf = (id: string, source: Record<string, string[]>) =>
    id in source ? id : Object.keys(source).find((col) => source[col].includes(id));

  const titleOf = (id: string) => board.cards[id]?.title ?? "card";
  const columnTitle = (id: string | undefined) => board.columns.find((c) => c.id === id)?.title ?? "column";

  const describePosition = (id: string, source: Record<string, string[]>) => {
    const col = columnOf(id, source);
    if (!col) return "";
    return `position ${source[col].indexOf(id) + 1} of ${source[col].length} in ${columnTitle(col)}`;
  };

  // Screen reader narration for keyboard drags, written in task terms.
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(String(active.id))}. Use arrow keys to move, Space to drop, Escape to cancel.`,
    onDragOver: ({ active }) => (preview ? `${titleOf(String(active.id))} is now at ${describePosition(String(active.id), preview)}.` : undefined),
    onDragEnd: ({ active }) => `Dropped ${titleOf(String(active.id))}${preview ? ` at ${describePosition(String(active.id), preview)}` : ""}.`,
    onDragCancel: ({ active }) => `Move cancelled. ${titleOf(String(active.id))} returned to where it was.`,
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
    setPreview(visible);
  };

  // Moving across columns: update the preview so the target column opens a gap.
  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || !preview) return;
    const id = String(active.id);
    const from = columnOf(id, preview);
    const to = columnOf(String(over.id), preview);
    if (!from || !to || from === to) return;
    const overIndex = String(over.id) === to ? preview[to].length : preview[to].indexOf(String(over.id));
    setPreview({
      ...preview,
      [from]: preview[from].filter((x) => x !== id),
      [to]: [...preview[to].slice(0, overIndex), id, ...preview[to].slice(overIndex)],
    });
  };

  const finish = () => {
    setActiveId(null);
    setPreview(null);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const id = String(active.id);
    if (!over || !preview) return finish();
    const to = columnOf(String(over.id), preview);
    if (!to) return finish();

    // Final slot among the *visible* cards of the target column.
    const without = preview[to].filter((x) => x !== id);
    let visibleIndex = preview[to].indexOf(id);
    if (String(over.id) !== to && String(over.id) !== id) visibleIndex = preview[to].indexOf(String(over.id));
    if (visibleIndex < 0) visibleIndex = without.length;

    // Translate to an index in the full (unfiltered) column, excluding the card itself.
    const fullTarget = board.columns.find((c) => c.id === to)!.cardIds.filter((x) => x !== id);
    const toIndex = visibleToFullIndex(fullTarget, without, visibleIndex);
    dispatch({ type: "card/move", cardId: id, toColumnId: to, toIndex });
    finish();
  };

  const activeCard = activeId ? board.cards[activeId] : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={finish}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: "Press Enter to edit. To move, press Space, use the arrow keys, then press Space again to drop.",
        },
      }}
    >
      <div className="board" role="list" aria-label="Board columns">
        {board.columns.map((col, i) => (
          <ColumnView
            key={col.id}
            column={col}
            index={i}
            columnCount={board.columns.length}
            ids={items[col.id] ?? []}
            board={board}
            dispatch={dispatch}
            filtering={filtering}
            today={today}
            onOpenCard={onOpenCard}
            onAddCard={onAddCard}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 160, easing: "ease-out" }}>
        {activeCard ? (
          <div className={`card card--overlay card--${activeCard.priority}`}>
            <CardFace card={activeCard} labels={board.labels} today={today} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function ColumnView(props: {
  column: Column;
  index: number;
  columnCount: number;
  ids: string[];
  board: Board;
  dispatch: BoardDispatch;
  filtering: boolean;
  today: string;
  onOpenCard: (id: string) => void;
  onAddCard: (columnId: string) => void;
}) {
  const { column, ids, board, filtering, today, onOpenCard, onAddCard } = props;
  // The column body is itself a drop target, so empty columns can receive cards.
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const total = column.cardIds.length;
  const overLimit = column.wipLimit !== null && total > column.wipLimit;
  const hidden = total - ids.filter((id) => column.cardIds.includes(id)).length;

  return (
    <section className={`column${overLimit ? " is-over-limit" : ""}`} role="listitem" aria-labelledby={`col-${column.id}`}>
      <ColumnHeader {...props} total={total} overLimit={overLimit} />
      <SortableContext id={column.id} items={ids} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className={`column__cards${isOver ? " is-over" : ""}`} aria-label={`${column.title} cards`}>
          {ids.map((id) => {
            const card = board.cards[id];
            return card ? <SortableCard key={id} card={card} labels={board.labels} today={today} onOpen={onOpenCard} /> : null;
          })}
          {ids.length === 0 && (
            <li className="column__empty">{filtering && total > 0 ? "No cards match the filters" : "Drop cards here"}</li>
          )}
        </ul>
      </SortableContext>
      <div className="column__foot">
        {filtering && hidden > 0 && <span className="column__hidden">{hidden} hidden by filters</span>}
        <button type="button" className="add-card" onClick={() => onAddCard(column.id)} aria-label={`Add card to ${column.title}`}>
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden>
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          Add card
        </button>
      </div>
    </section>
  );
}

function SortableCard({ card, labels, today, onOpen }: { card: Card; labels: Label[]; today: string; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const style = { transform: CSS.Translate.toString(transform), transition };

  const onKeyDown = (e: KeyboardEvent<HTMLLIElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onOpen(card.id);
      return;
    }
    listeners?.onKeyDown?.(e);
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`card card--${card.priority}${isDragging ? " is-dragging" : ""}`}
      {...attributes}
      {...listeners}
      aria-roledescription="draggable card"
      aria-label={card.title}
      onKeyDown={onKeyDown}
      onClick={() => onOpen(card.id)}
    >
      <CardFace card={card} labels={labels} today={today} />
    </li>
  );
}
