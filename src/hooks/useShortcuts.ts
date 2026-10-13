import { useEffect } from "react";

/** True when the user is typing, so global shortcuts must not hijack keys. */
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl+Y redo, "/" focuses search.
 * Inside text fields the browser's own text undo is left alone.
 */
export function useShortcuts(handlers: { undo: () => void; redo: () => void; focusSearch: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) handlers.redo();
        else handlers.undo();
      } else if (mod && key === "y") {
        e.preventDefault();
        handlers.redo();
      } else if (!mod && e.key === "/") {
        e.preventDefault();
        handlers.focusSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlers]);
}
