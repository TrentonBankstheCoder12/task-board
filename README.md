# Task Board

[![CI](https://github.com/TrentonBankstheCoder12/task-board/actions/workflows/ci.yml/badge.svg)](https://github.com/TrentonBankstheCoder12/task-board/actions/workflows/ci.yml)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![dnd kit](https://img.shields.io/badge/dnd--kit-drag_and_drop-4C51BF)
![Vitest](https://img.shields.io/badge/tested_with-Vitest-6E9F18?logo=vitest&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

**Live demo:** https://trentonbanksthecoder12.github.io/task-board/ (goes live once GitHub Pages is enabled for the repo)

A **Kanban board** with drag and drop, labels, due dates, priorities, filters and full undo/redo. The interesting part is underneath: every change goes through one **pure reducer** over a normalized board, wrapped in a generic history layer. That is the same architecture behind the order-entry and back-office tools fintech teams build, where every state change must be predictable, replayable and auditable, and an accidental drag must be one keystroke away from being reversed. The board is fully usable from the keyboard and announces moves to screen readers.

## Features

- **Drag and drop** within and between columns (@dnd-kit), with pointer, touch and **keyboard** support (`Space` to pick up, arrows to move, `Space` to drop, `Escape` to cancel) and screen-reader announcements
- **Cards** with title, description, labels, due date (overdue / due today / soon states) and priority
- **Customizable columns:** add, rename, reorder, delete, and optional **WIP limits** that flag an overloaded column
- **Search and filters:** multi-word search across title, description and label names; label filter (must have all), priority filter (any of)
- **Undo / redo** for every change, via buttons or `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`, `Ctrl+Y`. A whole drag is one undo step
- **Filter-aware drops:** dropping into a filtered column lands next to the card you saw, not at a hidden index
- **Local persistence** in `localStorage`, validated on load and wrapped in `try/catch`
- **Light and dark mode**, responsive (columns become a swipeable strip on phones)

## Architecture

```
 UI events (click, drag, keyboard)
            │  dispatch(action)
            ▼
 ┌──────────────────────────┐
 │ lib/history.ts           │  withHistory(): past / present / future,
 │   withHistory(reducer)   │  ignores no-ops, caps length, undo / redo
 └────────────┬─────────────┘
              ▼
 ┌──────────────────────────┐
 │ lib/board.ts             │  boardReducer(board, action) -> board
 │   pure, never mutates    │  card/add|update|delete|move, column/*, label/*
 └────────────┬─────────────┘
              ▼
   Board { columns: [{ id, cardIds[] }], cards: { id -> Card }, labels }
              │
     ┌────────┴─────────┐
     ▼                  ▼
 lib/filters.ts     lib/storage.ts
 visible ids per    validated localStorage
 column (derived)   snapshot of `present`
     │
     ▼
 components/  BoardView (dnd-kit), ColumnHeader, CardFace, CardEditor, FilterBar
```

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/ (relative paths, works on GitHub Pages)
```

## Usage example

The reducer can be used on its own, which is how the tests drive it:

```ts
import { boardReducer } from "./src/lib/board";
import { initHistory, withHistory } from "./src/lib/history";
import { seedBoard } from "./src/lib/seed";

const reducer = withHistory(boardReducer);
let h = initHistory(seedBoard(new Date()));

h = reducer(h, { type: "card/move", cardId: "c1", toColumnId: "col-done", toIndex: 0 });
h.present.columns.at(-1)!.cardIds;   // ["c1", "c10"]

h = reducer(h, { type: "history/undo" });
h.present.columns.at(-1)!.cardIds;   // ["c10"]
```

In the app: focus a card with `Tab`, press `Space`, use the arrow keys to move it, press `Space` again to drop. `Enter` opens the card for editing, `/` jumps to search.

## Testing

```bash
npm test           # vitest + jsdom
npm run lint       # tsc --noEmit (strict)
```

Reducer tests cover moves within and across columns, index clamping, no-op detection, immutability, column and label lifecycle, and a **property-style test** that runs 2,000 random actions and checks after each one that every card sits in exactly one column with no dangling ids. History tests cover undo, redo, redo-branch clearing and the history cap. Filter tests cover search, label AND / priority OR semantics, and due-date classification across month boundaries. Component tests (React Testing Library) add and validate cards, filter, undo with keyboard shortcuts, and move a card with the keyboard through dnd-kit.

## What I'd add next

- Sync to a backend with optimistic updates, using the action log as the change feed
- Fractional indexing (`"a0" < "a0V" < "a1"`) so concurrent reorders from two users don't conflict
- Swimlanes by assignee and a cumulative-flow chart from card move history
- Persist undo history in `sessionStorage` so a refresh doesn't lose it

See [WALKTHROUGH.md](WALKTHROUGH.md) for the design decisions behind this project.

## License

MIT
