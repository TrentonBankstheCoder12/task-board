import { describe, expect, it } from "vitest";
import { arrayMove, boardReducer, checkInvariants, visibleToFullIndex, type BoardAction } from "./board";
import { seedBoard } from "./seed";
import type { Board } from "./types";

const T = "2026-10-12T00:00:00.000Z";

function tiny(): Board {
  return {
    labels: [{ id: "bug", name: "Bug", color: "rose" }],
    columns: [
      { id: "a", title: "A", cardIds: ["1", "2", "3"], wipLimit: null },
      { id: "b", title: "B", cardIds: ["4"], wipLimit: null },
    ],
    cards: Object.fromEntries(
      ["1", "2", "3", "4"].map((id) => [
        id,
        { id, title: `Card ${id}`, description: "", labelIds: id === "1" ? ["bug"] : [], due: null, priority: "medium", createdAt: T },
      ]),
    ) as Board["cards"],
  };
}

const ids = (b: Board) => Object.fromEntries(b.columns.map((c) => [c.id, c.cardIds]));

describe("card/move", () => {
  it("reorders within a column", () => {
    const b = boardReducer(tiny(), { type: "card/move", cardId: "1", toColumnId: "a", toIndex: 2 });
    expect(ids(b)).toEqual({ a: ["2", "3", "1"], b: ["4"] });
  });

  it("moves between columns at the requested index", () => {
    const b = boardReducer(tiny(), { type: "card/move", cardId: "2", toColumnId: "b", toIndex: 0 });
    expect(ids(b)).toEqual({ a: ["1", "3"], b: ["2", "4"] });
  });

  it("clamps out-of-range indexes instead of corrupting the column", () => {
    const b = boardReducer(tiny(), { type: "card/move", cardId: "1", toColumnId: "b", toIndex: 99 });
    expect(ids(b)).toEqual({ a: ["2", "3"], b: ["4", "1"] });
  });

  it("returns the same object for no-op or invalid moves", () => {
    const board = tiny();
    expect(boardReducer(board, { type: "card/move", cardId: "1", toColumnId: "a", toIndex: 0 })).toBe(board);
    expect(boardReducer(board, { type: "card/move", cardId: "nope", toColumnId: "a", toIndex: 0 })).toBe(board);
    expect(boardReducer(board, { type: "card/move", cardId: "1", toColumnId: "nope", toIndex: 0 })).toBe(board);
  });

  it("does not mutate the previous board (required for undo)", () => {
    const board = tiny();
    const snapshot = structuredClone(board);
    boardReducer(board, { type: "card/move", cardId: "1", toColumnId: "b", toIndex: 0 });
    expect(board).toEqual(snapshot);
  });
});

describe("cards", () => {
  it("adds with trimmed title and defaults, rejects blank titles", () => {
    const b = boardReducer(tiny(), { type: "card/add", columnId: "b", id: "5", createdAt: T, draft: { title: "  New  " } });
    expect(b.cards["5"]).toMatchObject({ title: "New", priority: "medium", due: null, labelIds: [] });
    expect(ids(b).b).toEqual(["4", "5"]);
    const blank = tiny();
    expect(boardReducer(blank, { type: "card/add", columnId: "b", id: "6", createdAt: T, draft: { title: "  " } })).toBe(blank);
  });

  it("updates fields but ignores no-op edits and empty titles", () => {
    const board = tiny();
    const b = boardReducer(board, { type: "card/update", id: "2", patch: { priority: "urgent", due: "2026-11-01" } });
    expect(b.cards["2"]).toMatchObject({ priority: "urgent", due: "2026-11-01" });
    expect(boardReducer(board, { type: "card/update", id: "2", patch: { title: "Card 2" } })).toBe(board);
    expect(boardReducer(board, { type: "card/update", id: "2", patch: { title: " " } })).toBe(board);
  });

  it("deletes a card from both the lookup and its column", () => {
    const b = boardReducer(tiny(), { type: "card/delete", id: "2" });
    expect(b.cards["2"]).toBeUndefined();
    expect(ids(b).a).toEqual(["1", "3"]);
  });
});

describe("columns and labels", () => {
  it("adds, renames, reorders and deletes columns (with their cards)", () => {
    let b = boardReducer(tiny(), { type: "column/add", id: "c", title: "Review" });
    b = boardReducer(b, { type: "column/rename", id: "c", title: "QA" });
    b = boardReducer(b, { type: "column/move", id: "c", toIndex: 0 });
    expect(b.columns.map((c) => c.title)).toEqual(["QA", "A", "B"]);
    b = boardReducer(b, { type: "column/delete", id: "a" });
    expect(b.columns.map((c) => c.id)).toEqual(["c", "b"]);
    expect(Object.keys(b.cards)).toEqual(["4"]);
  });

  it("refuses to delete the last column", () => {
    let b = boardReducer(tiny(), { type: "column/delete", id: "a" });
    const last = b;
    b = boardReducer(b, { type: "column/delete", id: "b" });
    expect(b).toBe(last);
  });

  it("deleting a label strips it from every card", () => {
    const b = boardReducer(tiny(), { type: "label/delete", id: "bug" });
    expect(b.labels).toEqual([]);
    expect(b.cards["1"].labelIds).toEqual([]);
    expect(checkInvariants(b)).toEqual([]);
  });

  it("rejects duplicate label names regardless of case", () => {
    const board = tiny();
    expect(boardReducer(board, { type: "label/add", label: { id: "x", name: "bug", color: "blue" } })).toBe(board);
  });

  it("normalizes WIP limits", () => {
    const b = boardReducer(tiny(), { type: "column/wip", id: "a", limit: 2.7 });
    expect(b.columns[0].wipLimit).toBe(2);
    expect(boardReducer(b, { type: "column/wip", id: "a", limit: 0 }).columns[0].wipLimit).toBeNull();
  });
});

describe("helpers", () => {
  it("arrayMove returns a new array", () => {
    const src = ["a", "b", "c"];
    expect(arrayMove(src, 0, 2)).toEqual(["b", "c", "a"]);
    expect(src).toEqual(["a", "b", "c"]);
  });

  it("maps a drop slot in a filtered column to the right full index", () => {
    // Full column (moving card already removed): x1 h1 x2 h2 x3 ; visible: x1 x2 x3
    const full = ["x1", "h1", "x2", "h2", "x3"];
    const visible = ["x1", "x2", "x3"];
    expect(visibleToFullIndex(full, visible, 0)).toBe(0);
    expect(visibleToFullIndex(full, visible, 1)).toBe(2); // just before x2
    expect(visibleToFullIndex(full, visible, 3)).toBe(5); // after x3
    expect(visibleToFullIndex(full, [], 0)).toBe(5);
  });
});

/** Tiny seeded PRNG so the random test is reproducible. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

describe("invariants", () => {
  // Property-style: after any sequence of random actions, every card is in
  // exactly one column and no column references a missing card.
  it("hold after 2,000 random actions", () => {
    const rand = rng(1234);
    const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
    let board = seedBoard(new Date(2026, 9, 12));
    let n = 0;

    for (let i = 0; i < 2000; i++) {
      const cardIds = Object.keys(board.cards);
      const colIds = board.columns.map((c) => c.id);
      const r = rand();
      let action: BoardAction;
      if (r < 0.45 && cardIds.length) {
        action = { type: "card/move", cardId: pick(cardIds), toColumnId: pick(colIds), toIndex: Math.floor(rand() * 12) - 2 };
      } else if (r < 0.65) {
        action = { type: "card/add", columnId: pick(colIds), id: `r${++n}`, createdAt: T, draft: { title: `R${n}` } };
      } else if (r < 0.75 && cardIds.length) {
        action = { type: "card/delete", id: pick(cardIds) };
      } else if (r < 0.82) {
        action = { type: "column/add", id: `col-r${++n}`, title: `Col ${n}` };
      } else if (r < 0.86) {
        action = { type: "column/delete", id: pick(colIds) };
      } else if (r < 0.93) {
        action = { type: "column/move", id: pick(colIds), toIndex: Math.floor(rand() * 8) };
      } else {
        action = { type: "label/delete", id: pick(board.labels.map((l) => l.id).concat("missing")) };
      }
      board = boardReducer(board, action);
      expect(checkInvariants(board)).toEqual([]);
    }
  });
});
