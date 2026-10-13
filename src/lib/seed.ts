import type { Board, Card } from "./types";

/**
 * Starter board shown on first visit. The content is a small payments team's
 * sprint, so the demo looks like real work instead of "Task 1, Task 2".
 * Due dates are relative to today so the overdue/soon states always appear.
 */
export function seedBoard(today: Date): Board {
  const day = (offset: number) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const created = today.toISOString();
  const card = (id: string, title: string, rest: Partial<Card> = {}): Card => ({
    id,
    title,
    description: "",
    labelIds: [],
    due: null,
    priority: "medium",
    createdAt: created,
    ...rest,
  });

  const cards: Card[] = [
    card("c1", "Add idempotency keys to the refunds endpoint", {
      description: "Retries from the mobile app can double-refund. Store key + request hash, return the original response.",
      labelIds: ["l-api", "l-risk"],
      priority: "urgent",
      due: day(-1),
    }),
    card("c2", "Reconcile Stripe payouts against the ledger", {
      description: "Nightly job; flag any payout whose total differs from the sum of its ledger entries.",
      labelIds: ["l-data"],
      priority: "high",
      due: day(2),
    }),
    card("c3", "Card freeze toggle in settings", { labelIds: ["l-ui"], priority: "medium", due: day(6) }),
    card("c4", "Migrate amount columns to integer cents", {
      description: "Backfill, dual-write, then switch reads. Keep the old column until the numbers match for a week.",
      labelIds: ["l-data", "l-risk"],
      priority: "high",
    }),
    card("c5", "Rate-limit the login endpoint", { labelIds: ["l-api", "l-risk"], priority: "high", due: day(0) }),
    card("c6", "Empty state for the transactions list", { labelIds: ["l-ui"], priority: "low" }),
    card("c7", "Write runbook for failed ACH returns", { labelIds: ["l-docs"], priority: "medium", due: day(10) }),
    card("c8", "Dark mode for the statements page", { labelIds: ["l-ui"], priority: "low" }),
    card("c9", "Alert when webhook retries exceed 5", { labelIds: ["l-api"], priority: "medium" }),
    card("c10", "Set up CI for the ledger service", { labelIds: ["l-docs"], priority: "medium" }),
  ];

  return {
    labels: [
      { id: "l-api", name: "API", color: "blue" },
      { id: "l-ui", name: "Frontend", color: "violet" },
      { id: "l-data", name: "Data", color: "teal" },
      { id: "l-risk", name: "Risk", color: "rose" },
      { id: "l-docs", name: "Docs", color: "slate" },
    ],
    cards: Object.fromEntries(cards.map((c) => [c.id, c])),
    columns: [
      { id: "col-backlog", title: "Backlog", cardIds: ["c4", "c6", "c7", "c8"], wipLimit: null },
      { id: "col-todo", title: "To do", cardIds: ["c3", "c9"], wipLimit: null },
      { id: "col-doing", title: "In progress", cardIds: ["c1", "c2", "c5"], wipLimit: 3 },
      { id: "col-done", title: "Done", cardIds: ["c10"], wipLimit: null },
    ],
  };
}
