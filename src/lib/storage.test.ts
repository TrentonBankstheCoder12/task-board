import { describe, expect, it } from "vitest";
import { seedBoard } from "./seed";
import { loadBoard, parseBoard, saveBoard, STORAGE_KEY } from "./storage";

const board = seedBoard(new Date(2026, 9, 12));

describe("storage", () => {
  it("round-trips a board", () => {
    expect(saveBoard(board)).toBe(true);
    expect(loadBoard()).toEqual(board);
  });

  it("rejects corrupt JSON and structurally broken boards", () => {
    expect(parseBoard("{")).toBeNull();
    const dangling = structuredClone(board);
    dangling.columns[0].cardIds.push("ghost");
    expect(parseBoard(JSON.stringify({ version: 1, board: dangling }))).toBeNull();
  });

  it("survives storage that throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(loadBoard(broken)).toBeNull();
    expect(saveBoard(board, broken)).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
