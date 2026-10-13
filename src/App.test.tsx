import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { seedBoard } from "./lib/seed";
import { STORAGE_KEY } from "./lib/storage";

const today = new Date(2026, 9, 12);
const setup = () => {
  const user = userEvent.setup();
  render(<App initialBoard={seedBoard(today)} today={today} />);
  return user;
};
const column = (name: string) => screen.getByRole("list", { name: `${name} cards` });
const titlesIn = (name: string) => within(column(name)).queryAllByRole("button", { name: /.+/ }).map((el) => el.getAttribute("aria-label"));

describe("App", () => {
  it("adds a card through the dialog and persists it", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Add card to To do" }));
    const dialog = screen.getByRole("dialog", { name: "New card in To do" });
    await user.type(within(dialog).getByLabelText("Title"), "Ship statements export");
    await user.selectOptions(within(dialog).getByLabelText("Priority"), "high");
    await user.click(within(dialog).getByRole("checkbox", { name: "Frontend" }));
    await user.click(within(dialog).getByRole("button", { name: "Add card" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(titlesIn("To do")).toContain("Ship statements export");
    expect(localStorage.getItem(STORAGE_KEY)).toContain("Ship statements export");
  });

  it("shows a validation message for an empty title", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Add card to Backlog" }));
    await user.click(screen.getByRole("button", { name: "Add card" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Give the card a title.");
  });

  it("undo and redo work from buttons and keyboard shortcuts", async () => {
    const user = setup();
    const undo = screen.getByRole("button", { name: "Undo" });
    expect(undo).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Set up CI for the ledger service" }));
    await user.click(screen.getByRole("button", { name: "Delete card" }));
    expect(titlesIn("Done")).toEqual([]);

    await user.click(undo);
    expect(titlesIn("Done")).toEqual(["Set up CI for the ledger service"]);

    await user.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");
    expect(titlesIn("Done")).toEqual([]);
    await user.keyboard("{Control>}z{/Control}");
    expect(titlesIn("Done")).toEqual(["Set up CI for the ledger service"]);
  });

  it("filters by label and search, and can clear filters", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Risk", pressed: false }));
    expect(screen.getByText(/Showing 3 of 10/)).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox", { name: "Search cards" }), "login");
    expect(titlesIn("In progress")).toEqual(["Rate-limit the login endpoint"]);
    expect(within(column("To do")).getByText("No cards match the filters")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(titlesIn("In progress")).toHaveLength(3);
  });

  it("flags a column that is over its WIP limit", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Add card to In progress" }));
    await user.type(screen.getByLabelText("Title"), "One too many");
    await user.click(screen.getByRole("button", { name: "Add card" }));
    expect(screen.getByText(/cards, over the limit of 3/)).toBeInTheDocument();
  });

  it("moves a card with the keyboard (Space, arrow, Space) as one undoable step", async () => {
    setup();
    const card = within(column("To do")).getByRole("button", { name: "Card freeze toggle in settings" });
    card.focus();
    // dnd-kit measures layout to find the next slot; jsdom has none, so lay the
    // columns out side by side (300px apart) and stack each column's cards.
    const rect = (x: number, y: number, h: number) => () =>
      ({ x, y, top: y, left: x, right: x + 280, bottom: y + h, width: 280, height: h, toJSON: () => ({}) }) as DOMRect;
    screen.getAllByRole("list", { name: / cards$/ }).forEach((list, col) => {
      list.getBoundingClientRect = rect(col * 300, 0, 600);
      within(list)
        .queryAllByRole("button", { name: /.+/ })
        .forEach((el, row) => (el.getBoundingClientRect = rect(col * 300, row * 100, 80)));
    });
    // The floating drag overlay is created mid-drag; it starts where the picked-up card was.
    const original = HTMLElement.prototype.getBoundingClientRect;
    const spy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      return this.closest(".card--overlay") ? rect(300, 0, 80)() : original.call(this);
    });

    fireEvent.keyDown(card, { code: "Space", key: " " });
    await act(() => new Promise((r) => setTimeout(r, 20)));
    fireEvent.keyDown(card, { code: "ArrowDown", key: "ArrowDown" });
    await act(() => new Promise((r) => setTimeout(r, 20)));
    fireEvent.keyDown(card, { code: "Space", key: " " });
    await act(() => new Promise((r) => setTimeout(r, 20)));

    spy.mockRestore();
    expect(titlesIn("To do")).toEqual(["Alert when webhook retries exceed 5", "Card freeze toggle in settings"]);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(titlesIn("To do")).toEqual(["Card freeze toggle in settings", "Alert when webhook retries exceed 5"]);
  });
});
