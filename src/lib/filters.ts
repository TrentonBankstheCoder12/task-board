import type { Board, Card, Priority } from "./types";

export interface CardFilter {
  query: string;
  /** A card must carry ALL selected labels; selecting labels narrows the board. */
  labelIds: string[];
  /** Empty means any priority. */
  priorities: Priority[];
}

export const EMPTY_FILTER: CardFilter = { query: "", labelIds: [], priorities: [] };

export const isFilterActive = (f: CardFilter) => f.query.trim() !== "" || f.labelIds.length > 0 || f.priorities.length > 0;

export function matchesFilter(card: Card, f: CardFilter, labelNames: Record<string, string> = {}): boolean {
  if (f.priorities.length > 0 && !f.priorities.includes(card.priority)) return false;
  if (!f.labelIds.every((id) => card.labelIds.includes(id))) return false;
  // Every word must appear somewhere: "stripe payout" finds "Reconcile Stripe payouts".
  const words = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = [card.title, card.description, ...card.labelIds.map((id) => labelNames[id] ?? "")]
    .join(" ")
    .toLowerCase();
  return words.every((w) => haystack.includes(w));
}

/** Visible card ids per column, keeping board order. Filtering never mutates the board. */
export function visibleCardIds(board: Board, f: CardFilter): Record<string, string[]> {
  const labelNames = Object.fromEntries(board.labels.map((l) => [l.id, l.name]));
  const active = isFilterActive(f);
  return Object.fromEntries(
    board.columns.map((c) => [
      c.id,
      active ? c.cardIds.filter((id) => matchesFilter(board.cards[id], f, labelNames)) : c.cardIds,
    ]),
  );
}

export type DueStatus = "overdue" | "today" | "soon" | "later" | "none";

/** Classify a due date relative to today (both YYYY-MM-DD). String compare works for ISO dates. */
export function dueStatus(due: string | null, today: string, soonDays = 3): DueStatus {
  if (!due) return "none";
  if (due < today) return "overdue";
  if (due === today) return "today";
  const soon = new Date(`${today}T00:00:00Z`);
  soon.setUTCDate(soon.getUTCDate() + soonDays);
  return due <= soon.toISOString().slice(0, 10) ? "soon" : "later";
}

/** Local calendar date as YYYY-MM-DD (not UTC, so "today" matches the user's wall clock). */
export function localISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
