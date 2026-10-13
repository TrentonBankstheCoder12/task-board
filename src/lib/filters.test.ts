import { describe, expect, it } from "vitest";
import { dueStatus, EMPTY_FILTER, isFilterActive, visibleCardIds } from "./filters";
import { seedBoard } from "./seed";

const board = seedBoard(new Date(2026, 9, 12));

describe("visibleCardIds", () => {
  it("returns every card in board order with no filter", () => {
    const v = visibleCardIds(board, EMPTY_FILTER);
    expect(v["col-doing"]).toEqual(["c1", "c2", "c5"]);
    expect(isFilterActive(EMPTY_FILTER)).toBe(false);
  });

  it("matches all search words across title, description and label names", () => {
    const v = visibleCardIds(board, { ...EMPTY_FILTER, query: "stripe ledger" });
    expect(Object.values(v).flat()).toEqual(["c2"]);
    // "risk" is a label name, not in any title.
    const risky = Object.values(visibleCardIds(board, { ...EMPTY_FILTER, query: "RISK" })).flat();
    expect(risky.sort()).toEqual(["c1", "c4", "c5"]);
  });

  it("requires every selected label (AND) and any selected priority (OR)", () => {
    const both = visibleCardIds(board, { ...EMPTY_FILTER, labelIds: ["l-api", "l-risk"] });
    expect(Object.values(both).flat().sort()).toEqual(["c1", "c5"]);
    const pri = visibleCardIds(board, { ...EMPTY_FILTER, priorities: ["urgent", "low"] });
    expect(Object.values(pri).flat().sort()).toEqual(["c1", "c6", "c8"]);
  });

  it("never changes the underlying board", () => {
    const before = structuredClone(board);
    visibleCardIds(board, { query: "x", labelIds: ["l-ui"], priorities: ["low"] });
    expect(board).toEqual(before);
  });
});

describe("dueStatus", () => {
  it("classifies due dates relative to today, across month boundaries", () => {
    expect(dueStatus(null, "2026-10-12")).toBe("none");
    expect(dueStatus("2026-10-11", "2026-10-12")).toBe("overdue");
    expect(dueStatus("2026-10-12", "2026-10-12")).toBe("today");
    expect(dueStatus("2026-11-02", "2026-10-31")).toBe("soon");
    expect(dueStatus("2026-11-04", "2026-10-31")).toBe("later");
  });
});
