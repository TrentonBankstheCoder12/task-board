import type { Board, Card, Column, Label, Priority } from "./types";

/**
 * The board reducer: (board, action) -> new board. It is pure: no ids,
 * clocks or randomness are generated here; callers pass them in. That makes
 * every action replayable, which is what lets undo/redo and tests work by
 * simply comparing values.
 *
 * Invalid actions (unknown ids, out-of-range indexes) return the SAME board
 * object. The history layer uses that identity to avoid recording no-ops.
 */

export type CardDraft = Pick<Card, "title"> & Partial<Pick<Card, "description" | "labelIds" | "due" | "priority">>;

export type BoardAction =
  | { type: "card/add"; columnId: string; id: string; createdAt: string; draft: CardDraft; position?: "top" | "bottom" }
  | { type: "card/update"; id: string; patch: Partial<Omit<Card, "id" | "createdAt">> }
  | { type: "card/delete"; id: string }
  | { type: "card/move"; cardId: string; toColumnId: string; toIndex: number }
  | { type: "column/add"; id: string; title: string }
  | { type: "column/rename"; id: string; title: string }
  | { type: "column/delete"; id: string }
  | { type: "column/move"; id: string; toIndex: number }
  | { type: "column/wip"; id: string; limit: number | null }
  | { type: "label/add"; label: Label }
  | { type: "label/delete"; id: string }
  | { type: "board/replace"; board: Board };

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/** Move one element inside an array, returning a new array. */
export function arrayMove<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function findColumnOf(board: Board, cardId: string): Column | undefined {
  return board.columns.find((c) => c.cardIds.includes(cardId));
}

function updateColumn(board: Board, id: string, fn: (c: Column) => Column): Board {
  return { ...board, columns: board.columns.map((c) => (c.id === id ? fn(c) : c)) };
}

const PRIORITY_SET = new Set<Priority>(["low", "medium", "high", "urgent"]);

export function boardReducer(board: Board, action: BoardAction): Board {
  switch (action.type) {
    case "card/add": {
      const title = action.draft.title.trim();
      if (!title || board.cards[action.id] || !board.columns.some((c) => c.id === action.columnId)) return board;
      const card: Card = {
        id: action.id,
        title,
        description: action.draft.description?.trim() ?? "",
        labelIds: action.draft.labelIds ?? [],
        due: action.draft.due ?? null,
        priority: action.draft.priority ?? "medium",
        createdAt: action.createdAt,
      };
      return {
        ...updateColumn(board, action.columnId, (c) => ({
          ...c,
          cardIds: action.position === "top" ? [card.id, ...c.cardIds] : [...c.cardIds, card.id],
        })),
        cards: { ...board.cards, [card.id]: card },
      };
    }

    case "card/update": {
      const card = board.cards[action.id];
      if (!card) return board;
      const patch = { ...action.patch };
      if (patch.title !== undefined) {
        patch.title = patch.title.trim();
        if (!patch.title) return board; // a card always needs a title
      }
      if (patch.priority !== undefined && !PRIORITY_SET.has(patch.priority)) return board;
      const next = { ...card, ...patch };
      // Skip no-op edits so they don't pollute undo history.
      if ((Object.keys(patch) as (keyof typeof patch)[]).every((k) => JSON.stringify(next[k]) === JSON.stringify(card[k]))) {
        return board;
      }
      return { ...board, cards: { ...board.cards, [card.id]: next } };
    }

    case "card/delete": {
      if (!board.cards[action.id]) return board;
      const { [action.id]: _removed, ...cards } = board.cards;
      return {
        ...board,
        cards,
        columns: board.columns.map((c) =>
          c.cardIds.includes(action.id) ? { ...c, cardIds: c.cardIds.filter((id) => id !== action.id) } : c,
        ),
      };
    }

    case "card/move": {
      const from = findColumnOf(board, action.cardId);
      const to = board.columns.find((c) => c.id === action.toColumnId);
      if (!from || !to) return board;

      if (from.id === to.id) {
        const fromIndex = from.cardIds.indexOf(action.cardId);
        const toIndex = clamp(action.toIndex, 0, from.cardIds.length - 1);
        if (fromIndex === toIndex) return board;
        return updateColumn(board, from.id, (c) => ({ ...c, cardIds: arrayMove(c.cardIds, fromIndex, toIndex) }));
      }

      // Across columns: remove from source, insert into target at a clamped index.
      const toIndex = clamp(action.toIndex, 0, to.cardIds.length);
      return {
        ...board,
        columns: board.columns.map((c) => {
          if (c.id === from.id) return { ...c, cardIds: c.cardIds.filter((id) => id !== action.cardId) };
          if (c.id === to.id) {
            const ids = [...c.cardIds];
            ids.splice(toIndex, 0, action.cardId);
            return { ...c, cardIds: ids };
          }
          return c;
        }),
      };
    }

    case "column/add": {
      const title = action.title.trim();
      if (!title || board.columns.some((c) => c.id === action.id)) return board;
      return { ...board, columns: [...board.columns, { id: action.id, title, cardIds: [], wipLimit: null }] };
    }

    case "column/rename": {
      const title = action.title.trim();
      const col = board.columns.find((c) => c.id === action.id);
      if (!col || !title || col.title === title) return board;
      return updateColumn(board, action.id, (c) => ({ ...c, title }));
    }

    case "column/delete": {
      const col = board.columns.find((c) => c.id === action.id);
      // Keep at least one column so there is always somewhere to add a card.
      if (!col || board.columns.length === 1) return board;
      // Cards in the column go with it. Undo is the safety net, so no data is truly lost.
      const cards = { ...board.cards };
      for (const id of col.cardIds) delete cards[id];
      return { ...board, cards, columns: board.columns.filter((c) => c.id !== action.id) };
    }

    case "column/move": {
      const from = board.columns.findIndex((c) => c.id === action.id);
      if (from < 0) return board;
      const to = clamp(action.toIndex, 0, board.columns.length - 1);
      if (from === to) return board;
      return { ...board, columns: arrayMove(board.columns, from, to) };
    }

    case "column/wip": {
      const col = board.columns.find((c) => c.id === action.id);
      const limit = action.limit !== null && action.limit > 0 ? Math.floor(action.limit) : null;
      if (!col || col.wipLimit === limit) return board;
      return updateColumn(board, action.id, (c) => ({ ...c, wipLimit: limit }));
    }

    case "label/add": {
      const name = action.label.name.trim();
      if (!name || board.labels.some((l) => l.id === action.label.id || l.name.toLowerCase() === name.toLowerCase())) {
        return board;
      }
      return { ...board, labels: [...board.labels, { ...action.label, name }] };
    }

    case "label/delete": {
      if (!board.labels.some((l) => l.id === action.id)) return board;
      // Also strip the label from every card so no card points at a missing label.
      const cards: Record<string, Card> = {};
      for (const [id, card] of Object.entries(board.cards)) {
        cards[id] = card.labelIds.includes(action.id)
          ? { ...card, labelIds: card.labelIds.filter((l) => l !== action.id) }
          : card;
      }
      return { ...board, cards, labels: board.labels.filter((l) => l.id !== action.id) };
    }

    case "board/replace":
      return action.board;
  }
}

/**
 * Structural invariant: every card is in exactly one column, and every id in
 * a column refers to an existing card. Used by tests and by storage validation.
 */
export function checkInvariants(board: Board): string[] {
  const problems: string[] = [];
  const seen = new Map<string, string>();
  for (const col of board.columns) {
    for (const id of col.cardIds) {
      if (!board.cards[id]) problems.push(`column ${col.id} references missing card ${id}`);
      if (seen.has(id)) problems.push(`card ${id} is in both ${seen.get(id)} and ${col.id}`);
      seen.set(id, col.id);
    }
  }
  for (const id of Object.keys(board.cards)) {
    if (!seen.has(id)) problems.push(`card ${id} is not in any column`);
  }
  const labelIds = new Set(board.labels.map((l) => l.id));
  for (const card of Object.values(board.cards)) {
    for (const l of card.labelIds) if (!labelIds.has(l)) problems.push(`card ${card.id} has unknown label ${l}`);
  }
  return problems;
}

/**
 * Translate a drop position in a *filtered* column into an index in the full
 * column. When a filter hides cards, "drop at visible slot 1" must mean
 * "just before the card the user saw in slot 1", not "full index 1".
 *
 * Both lists must already exclude the card being moved; the result is the
 * index in the column after the move, which is what `card/move` expects.
 */
export function visibleToFullIndex(fullIds: readonly string[], visibleIds: readonly string[], visibleIndex: number): number {
  if (visibleIds.length === 0) return fullIds.length;
  if (visibleIndex < visibleIds.length) return fullIds.indexOf(visibleIds[Math.max(visibleIndex, 0)]);
  return fullIds.indexOf(visibleIds[visibleIds.length - 1]) + 1;
}
