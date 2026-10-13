import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Card, Label } from "../lib/types";
import { CardEditor } from "./CardEditor";

const labels: Label[] = [
  { id: "a", name: "API", color: "blue" },
  { id: "b", name: "Bug", color: "rose" },
];
const card: Card = {
  id: "c1",
  title: "Fix webhook retries",
  description: "",
  labelIds: ["a"],
  due: null,
  priority: "medium",
  createdAt: "2026-10-12T00:00:00.000Z",
};

describe("CardEditor", () => {
  it("prefills an existing card and saves edited fields", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<CardEditor card={card} columnTitle="To do" labels={labels} onSave={onSave} onClose={() => {}} />);

    expect(screen.getByLabelText("Title")).toHaveValue("Fix webhook retries");
    expect(screen.getByLabelText("Title")).toHaveFocus();
    await user.click(screen.getByRole("checkbox", { name: "API" }));
    await user.click(screen.getByRole("checkbox", { name: "Bug" }));
    await user.selectOptions(screen.getByLabelText("Priority"), "urgent");
    await user.type(screen.getByLabelText("Due date"), "2026-10-20");
    await user.click(screen.getByRole("button", { name: "Save card" }));

    expect(onSave).toHaveBeenCalledWith({
      title: "Fix webhook retries",
      description: "",
      labelIds: ["b"],
      due: "2026-10-20",
      priority: "urgent",
    });
  });

  it("closes on Escape without saving", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(<CardEditor card={null} columnTitle="Backlog" labels={labels} onSave={onSave} onClose={onClose} />);
    expect(screen.getByRole("dialog", { name: "New card in Backlog" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});
