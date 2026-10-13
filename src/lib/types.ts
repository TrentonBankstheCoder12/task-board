/** Domain types for the board. Plain JSON-serializable data, so it can be persisted as-is. */

export type Priority = "low" | "medium" | "high" | "urgent";
export const PRIORITIES: readonly Priority[] = ["urgent", "high", "medium", "low"];

export interface Card {
  id: string;
  title: string;
  description: string;
  labelIds: string[];
  /** ISO date YYYY-MM-DD, or null when there is no deadline. */
  due: string | null;
  priority: Priority;
  /** ISO timestamp; passed in by the caller so the reducer stays pure. */
  createdAt: string;
}

export interface Column {
  id: string;
  title: string;
  /** Ordered card ids. Order in this array is the order on screen. */
  cardIds: string[];
  /** Work-in-progress limit; null means unlimited. */
  wipLimit: number | null;
}

export interface Label {
  id: string;
  name: string;
  /** Key into the fixed label palette (see components/labelColors.ts). */
  color: LabelColor;
}

export const LABEL_COLORS = ["blue", "teal", "violet", "amber", "rose", "slate"] as const;
export type LabelColor = (typeof LABEL_COLORS)[number];

/**
 * Normalized board: cards live in a lookup table, columns hold only ids.
 * Moving a card is then an id shuffle between two arrays, and a card can
 * never be "in two places" with diverging copies.
 */
export interface Board {
  columns: Column[];
  cards: Record<string, Card>;
  labels: Label[];
}
