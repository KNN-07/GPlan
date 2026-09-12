import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../App";
import { defaultState, loadState } from "../core/storage";
import type { WorkoutPlan } from "../contracts";

vi.mock("../pwa/PwaStatus", () => ({ PwaStatus: () => <div /> }));
const plan: WorkoutPlan = {
  id: "plan",
  name: "Routine",
  source: "manual",
  createdAt: "2026-09-12T00:00:00Z",
  updatedAt: "2026-09-12T00:00:00Z",
  days: [
    {
      id: "day",
      name: "Session",
      items: [
        {
          id: "press",
          exerciseId: "dumbbell-bench-press",
          sets: 3,
          prescription: { kind: "reps", min: 8, max: 12 },
          restSeconds: 90,
        },
        { id: "hold", exerciseId: "plank", sets: 2, prescription: { kind: "time", seconds: 30 }, restSeconds: 60 },
      ],
    },
  ],
};
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("gplan.state.v1", JSON.stringify({ ...defaultState, plans: [plan], activePlanId: plan.id }));
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Plan" }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function storedPlan() {
  const loaded = loadState();
  if (!loaded.ok) throw new Error(loaded.error.code);
  return loaded.value.plans[0];
}
it("persists reordered exercises without changing their prescriptions", () => {
  // Given a press followed by a timed hold
  // When the hold is moved above the press
  fireEvent.click(screen.getByRole("button", { name: "Move Plank up" }));
  // Then item identity and prescription move together
  expect(storedPlan().days[0].items.map((item) => item.id)).toEqual(["hold", "press"]);
  expect(storedPlan().days[0].items[0].prescription).toEqual({ kind: "time", seconds: 30 });
});
it("persists timed prescriptions", () => {
  // Given the timed hold
  // When its duration changes
  fireEvent.change(screen.getByLabelText("Time (sec)"), { target: { value: "45" } });
  // Then the edited duration is saved
  expect(storedPlan().days[0].items[1].prescription).toEqual({ kind: "time", seconds: 45 });
});
it("removes only the requested exercise", () => {
  // Given two movements
  // When the press is removed
  fireEvent.click(screen.getByRole("button", { name: "Remove Dumbbell bench press" }));
  // Then the timed hold remains
  expect(storedPlan().days[0].items.map((item) => item.id)).toEqual(["hold"]);
});
it("requires confirmation before deleting a plan", () => {
  // Given a saved routine
  // When the user opens, but cancels, deletion
  fireEvent.click(screen.getByRole("button", { name: "Delete plan" }));
  fireEvent.click(screen.getByRole("button", { name: "Keep plan" }));
  // Then storage is unchanged
  expect(storedPlan()).toEqual(plan);
});
