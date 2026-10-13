/**
 * Generic undo/redo for any pure reducer, using the "past / present / future"
 * pattern. Because the inner reducer never mutates, keeping old states is
 * just keeping references: unchanged columns and cards are shared between
 * snapshots, so history is cheap.
 */

export interface History<S> {
  past: S[];
  present: S;
  future: S[];
}

export type HistoryAction<A> = A | { type: "history/undo" } | { type: "history/redo" } | { type: "history/clear" };

export const HISTORY_LIMIT = 100;

export function initHistory<S>(present: S): History<S> {
  return { past: [], present, future: [] };
}

export function withHistory<S, A extends { type: string }>(reducer: (state: S, action: A) => S, limit = HISTORY_LIMIT) {
  return function historyReducer(state: History<S>, action: HistoryAction<A>): History<S> {
    switch (action.type) {
      case "history/undo": {
        if (state.past.length === 0) return state;
        const previous = state.past[state.past.length - 1];
        return { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] };
      }
      case "history/redo": {
        if (state.future.length === 0) return state;
        const [next, ...rest] = state.future;
        return { past: [...state.past, state.present], present: next, future: rest };
      }
      case "history/clear":
        return initHistory(state.present);
      default: {
        const present = reducer(state.present, action as A);
        // The inner reducer returns the same object for no-ops; don't record those.
        if (present === state.present) return state;
        // A new edit after undoing discards the redo branch, like every editor.
        return { past: [...state.past, state.present].slice(-limit), present, future: [] };
      }
    }
  };
}

export const canUndo = (h: History<unknown>) => h.past.length > 0;
export const canRedo = (h: History<unknown>) => h.future.length > 0;
