import { checkInvariants } from "./board";
import type { Board } from "./types";

/**
 * localStorage persistence. Wrapped in try/catch because storage throws in
 * some browsers (private mode, quota exceeded, blocked cookies). Loaded data
 * is validated: a corrupt snapshot falls back to the default board rather
 * than crashing the app or rendering a half-broken board.
 */

export const STORAGE_KEY = "task-board:v1";

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

export function parseBoard(raw: string | null): Board | null {
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!isObject(data) || data.version !== 1 || !isObject(data.board)) return null;
    const board = data.board as unknown as Board;
    if (!Array.isArray(board.columns) || !isObject(board.cards) || !Array.isArray(board.labels)) return null;
    if (board.columns.some((c) => !isObject(c) || typeof c.id !== "string" || !Array.isArray(c.cardIds))) return null;
    if (Object.values(board.cards).some((c) => !isObject(c) || typeof c.title !== "string" || !Array.isArray(c.labelIds))) {
      return null;
    }
    // Structural check: every card in exactly one column, no dangling ids.
    if (checkInvariants(board).length > 0) return null;
    return board;
  } catch {
    return null;
  }
}

export function loadBoard(storage: Pick<Storage, "getItem"> | undefined = globalThis.localStorage): Board | null {
  try {
    return parseBoard(storage?.getItem(STORAGE_KEY) ?? null);
  } catch {
    return null;
  }
}

export function saveBoard(board: Board, storage: Pick<Storage, "setItem"> | undefined = globalThis.localStorage): boolean {
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, board }));
    return true;
  } catch {
    return false;
  }
}
