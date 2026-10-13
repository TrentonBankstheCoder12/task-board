import { describe, expect, it } from "vitest";
import { boardReducer } from "./board";
import { canRedo, canUndo, initHistory, withHistory } from "./history";
import { seedBoard } from "./seed";

const reducer = withHistory(boardReducer);
const start = () => initHistory(seedBoard(new Date(2026, 9, 12)));
const doneIds = (h: ReturnType<typeof start>) => h.present.columns.find((c) => c.id === "col-done")!.cardIds;

describe("undo/redo", () => {
  it("undoes and redoes a move", () => {
    const h0 = start();
    const h1 = reducer(h0, { type: "card/move", cardId: "c1", toColumnId: "col-done", toIndex: 0 });
    expect(doneIds(h1)).toEqual(["c1", "c10"]);

    const h2 = reducer(h1, { type: "history/undo" });
    expect(h2.present).toBe(h0.present); // exact previous snapshot, not a recomputation
    expect(canRedo(h2)).toBe(true);

    const h3 = reducer(h2, { type: "history/redo" });
    expect(h3.present).toBe(h1.present);
  });

  it("does not record no-op actions", () => {
    const h0 = start();
    const h1 = reducer(h0, { type: "card/move", cardId: "c10", toColumnId: "col-done", toIndex: 0 });
    expect(h1).toBe(h0);
    expect(canUndo(h1)).toBe(false);
  });

  it("a new action after undo clears the redo stack", () => {
    let h = start();
    h = reducer(h, { type: "card/delete", id: "c1" });
    h = reducer(h, { type: "history/undo" });
    h = reducer(h, { type: "column/rename", id: "col-done", title: "Shipped" });
    expect(canRedo(h)).toBe(false);
    expect(h.present.cards.c1).toBeDefined();
  });

  it("undo/redo at the ends of history is a safe no-op", () => {
    const h = start();
    expect(reducer(h, { type: "history/undo" })).toBe(h);
    expect(reducer(h, { type: "history/redo" })).toBe(h);
  });

  it("caps history length", () => {
    const capped = withHistory(boardReducer, 3);
    let h = start();
    for (const title of ["a", "b", "c", "d", "e"]) h = capped(h, { type: "column/rename", id: "col-done", title });
    expect(h.past).toHaveLength(3);
    // Undo as far as possible: lands on "b", the oldest state still kept.
    for (let i = 0; i < 10; i++) h = capped(h, { type: "history/undo" });
    expect(h.present.columns.find((c) => c.id === "col-done")!.title).toBe("b");
  });
});
