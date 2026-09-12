import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Dialog } from "./primitives";
afterEach(cleanup);
it("wraps keyboard focus inside the open dialog", () => {
  // Given an open dialog with two actions
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  render(
    <Dialog title="Focus" onClose={() => undefined}>
      <button>Last action</button>
    </Dialog>,
  );
  const first = screen.getByRole("button", { name: "Close dialog" });
  first.focus();
  // When Shift+Tab is pressed on the first action
  fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
  // Then focus wraps to the last action rather than escaping
  expect(screen.getByRole("button", { name: "Last action" })).toHaveFocus();
});
