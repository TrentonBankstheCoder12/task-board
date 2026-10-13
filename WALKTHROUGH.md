# Walkthrough: Task Board

A guide to how this project works and why it was built this way. Read it top to bottom, then try to explain each section out loud without looking.

## 1. A normalized board

The board is stored like a small database, not as nested objects:

```ts
{ columns: [{ id, title, cardIds: ["c1", "c2"], wipLimit }],
  cards:   { c1: {...}, c2: {...} },
  labels:  [{ id, name, color }] }
```

Columns hold only **ordered ids**; card data lives once in a lookup table. Moving a card is just moving an id between two arrays, and a card can never exist in two places with different data. Deleting a label means stripping one id from cards, not hunting through nested trees.

Code: `src/lib/types.ts`.

## 2. One pure reducer

Every change is an action like `{ type: "card/move", cardId, toColumnId, toIndex }` handled by `boardReducer(board, action) -> board`. The reducer:

- **Never mutates.** It returns new arrays and objects for what changed and reuses everything else. A test clones the board, runs a move, and checks the original is untouched.
- **Never creates ids or reads the clock.** Callers pass `id` and `createdAt` in. Same inputs always give the same output, so actions can be replayed and tested without mocks.
- **Returns the same object for invalid or no-op actions** (unknown card, dropping a card where it already is, renaming to the same title). That identity check is what lets history skip recording non-changes.
- **Clamps indexes** instead of trusting the UI, so a bad `toIndex` can't create holes or lose a card.

Code: `src/lib/board.ts`.

## 3. Undo/redo as a wrapper

`withHistory(reducer)` turns any pure reducer into one with `{ past, present, future }`:

- A normal action computes the new `present`, pushes the old one onto `past`, and **clears `future`** (a new edit after undo discards the redo branch, like every editor).
- Undo pops from `past` into `present` and pushes the old `present` onto `future`. Redo does the reverse.
- If the inner reducer returned the same object, nothing is recorded.
- `past` is capped at 100 entries.

Because the reducer never mutates, storing old states is cheap: unchanged cards and columns are shared by reference between snapshots. Undo returns the *exact* previous object, which a test asserts with `toBe`.

Code: `src/lib/history.ts`, `src/hooks/useBoard.ts`.

## 4. Drag and drop without polluting history

@dnd-kit fires many events during a drag. Dispatching on every `onDragOver` would leave twenty undo steps for one gesture. Instead `BoardView` keeps a **local preview** of the columns while dragging (so the target column opens a gap), then dispatches a single `card/move` on drop. Cancelling with `Escape` simply discards the preview.

There is one subtle case: when filters hide cards, the user drops at a *visible* position. `visibleToFullIndex` translates "visible slot 2" into "just before the card you saw in slot 2" in the full column, so hidden cards keep their order.

Code: `src/components/BoardView.tsx`, `visibleToFullIndex` in `src/lib/board.ts`.

## 5. Accessibility

- The keyboard sensor uses `Space` to pick up and drop, arrows to move and `Escape` to cancel. `Enter` is reserved for opening the card.
- Custom announcements describe moves in task terms ("Card freeze toggle in settings is now at position 2 of 3 in Done").
- Dialogs trap focus, close on `Escape` and return focus to the card that opened them.
- Priority is a bar glyph *and* a word; due states have an icon *and* text; label chips always show their name. Nothing relies on color alone.
- Global shortcuts are ignored while typing in a field, so `Ctrl+Z` in the title box undoes text, not the board.

## 6. Filters are derived, never stored

`visibleCardIds(board, filter)` returns the visible ids per column without touching the board. Search requires every word to appear in the title, description or label names; label filters are AND (narrowing), priority filters are OR. Because filtering is a pure function of `(board, filter)`, it can't get out of sync with the data.

Code: `src/lib/filters.ts`.

## 7. Persistence

Only `present` is saved, as a versioned JSON snapshot. On load the data is shape-checked and run through `checkInvariants` (every card in exactly one column, no dangling ids); anything broken falls back to the starter board. Every `localStorage` call is in `try/catch`, and if saving fails the header says so.

Code: `src/lib/storage.ts`.

## 8. Known limitation (be ready to discuss this)

Card order is stored as array position. That is perfect for one user in one tab, but if two people reorder the same column at once and both send "move to index 2", the second write wins and the first person's change is silently lost. Two tabs open on the same board have the same problem through `localStorage`. The production fix is **fractional indexing** (each card has a sortable string key; inserting between `a` and `b` creates a key between them) plus a server that applies actions in order, or a CRDT. Also, undo history is per-tab and lost on refresh.

## Likely interview questions

1. **Why `useReducer` with a pure reducer instead of `useState` in each component?** All state transitions live in one testable function; undo/redo, persistence and logging become wrappers around it rather than code scattered through components.
2. **How does undo work, and why is it cheap?** Past/present/future snapshots (section 3). Immutability means snapshots share unchanged objects, so each step costs only what changed.
3. **How do you keep a drag from creating many undo steps?** Local preview during the drag, one dispatch on drop (section 4).
4. **How do you know the board never gets corrupted?** `checkInvariants` plus a randomized test that applies 2,000 random actions and checks invariants after each.
5. **How is drag and drop made accessible?** Keyboard sensor, announcements, focus management (section 5).
6. **What breaks with multiple users?** Index-based ordering under concurrent edits (section 8); mention fractional indexing or a server-ordered action log.
7. **How does this relate to fintech?** Immutable state, explicit actions and a history of changes is the same idea as an event-sourced ledger: you can always explain how you reached the current state.

## Try extending it

- Add an `assignee` field and swimlanes grouped by person
- Record a timestamped log of `card/move` actions and draw a cumulative-flow chart
- Replace array order with fractional index keys and write a test for two interleaved reorders
- Add bulk actions (select several cards and move them in one undoable step)
