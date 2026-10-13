import { useEffect, useReducer, useState } from "react";
import { boardReducer } from "../lib/board";
import { canRedo, canUndo, initHistory, withHistory } from "../lib/history";
import { seedBoard } from "../lib/seed";
import { loadBoard, saveBoard } from "../lib/storage";
import type { Board } from "../lib/types";

// Built once at module level: the reducer is pure, so there is nothing per-instance about it.
const historyReducer = withHistory(boardReducer);

/**
 * Board state = useReducer over the pure reducer wrapped in undo/redo history.
 * Only the present board is persisted; history is per-session, like most editors.
 */
export function useBoard(initial?: Board) {
  const [history, dispatch] = useReducer(historyReducer, initial, (init) =>
    initHistory(init ?? loadBoard() ?? seedBoard(new Date())),
  );
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    setSaveFailed(!saveBoard(history.present));
  }, [history.present]);

  return {
    board: history.present,
    dispatch,
    canUndo: canUndo(history),
    canRedo: canRedo(history),
    saveFailed,
  };
}

export type BoardDispatch = ReturnType<typeof useBoard>["dispatch"];
