import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import App from "../App";
import { exercises } from "../catalog";
import { defaultState } from "../core/storage";

vi.mock("../pwa/PwaStatus", () => ({ PwaStatus: () => <div /> }));
vi.mock("../graphics/ExerciseViewer", () => ({ ExerciseViewer: () => <div data-testid="viewer" /> }));
beforeEach(() => {
  localStorage.clear();
  // jsdom has no scroll surface; scrolling is exercised in the real-browser harness.
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

describe("GPlan screen workflows", () => {
  it.each(["load", "import"] as const)("adds to the displayed plan with a null active selection after %s", (source) => {
    const backup = {
      ...structuredClone(defaultState),
      plans: [{
        id: "imported-plan", name: "Imported routine", source: "manual",
        createdAt: "2026-09-12T12:00:00.000Z", updatedAt: "2026-09-12T12:00:00.000Z",
        days: [{ id: "imported-day", name: "Imported session", items: [] }],
      }],
      activePlanId: null,
    };
    if (source === "load") localStorage.setItem("gplan.state.v1", JSON.stringify(backup));
    render(<App />);
    if (source === "import") {
      click("Settings");
      fireEvent.change(screen.getByLabelText("Backup JSON"), { target: { value: JSON.stringify(backup) } });
      click("Import backup");
    }
    click("Plan");
    expect(screen.getByLabelText("Your saved plans")).toHaveValue("imported-plan");
    click("Add a movement");
    fireEvent.click(screen.getAllByRole("button", { name: /^Add .* to plan$/ })[0]);
    const saved = JSON.parse(localStorage.getItem("gplan.state.v1") ?? "{}");
    expect(saved.plans).toHaveLength(1);
    expect(saved.activePlanId).toBe("imported-plan");
    expect(saved.plans[0].days[0].items[0].exerciseId).toBe(exercises[0].id);
  });
  it.each([
    ["http://provider.example/v1", false],
    ["http://localhost:1234/v1", true],
    ["https://provider.example/v1", true],
  ] as const)("uses adapter URL rules before saving %s", (baseUrl, accepted) => {
    render(<App />);
    click("Settings");
    fireEvent.change(screen.getByLabelText("Provider"), { target: { value: "openai-compatible" } });
    fireEvent.change(screen.getByLabelText("Provider root URL"), { target: { value: baseUrl } });
    fireEvent.change(screen.getByLabelText("Manual model ID"), { target: { value: "example-model" } });
    click("Save AI preferences");
    expect(localStorage.getItem("gplan.state.v1") !== null).toBe(accepted);
    expect(screen.queryByRole("alert") !== null).toBe(!accepted);
  });
  it("filters the actual catalog by text", () => {
    // Given the complete library
    render(<App />);
    // When searching a unique exercise
    fireEvent.change(screen.getByLabelText("Search exercises"), { target: { value: exercises[0].name } });
    // Then only matching catalog tiles remain
    expect(screen.getAllByTestId("exercise-card").length).toBe(
      exercises.filter((e) => e.name.toLowerCase().includes(exercises[0].name.toLowerCase())).length,
    );
  });
  it("creates a usable manual plan when adding the first exercise", () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole("button", { name: /^Add .* to plan$/ })[0]);
    const saved = JSON.parse(localStorage.getItem("gplan.state.v1") ?? "{}");
    expect(saved.plans[0].days[0].items[0].exerciseId).toBe(exercises[0].id);
    expect(saved.activePlanId).toBe(saved.plans[0].id);
  });
  it("keeps corrupt storage intact after a screen edit", () => {
    localStorage.setItem("gplan.state.v1", "{broken");
    render(<App />);
    fireEvent.click(screen.getAllByRole("button", { name: /^Add .* to plan$/ })[0]);
    expect(localStorage.getItem("gplan.state.v1")).toBe("{broken");
    expect(screen.getByRole("alert")).toBeVisible();
  });
  it("persists an empty gym selection without deleting plans", () => {
    render(<App />);
    click("Settings");
    click("Select none");
    expect(JSON.parse(localStorage.getItem("gplan.state.v1") ?? "{}").gym.availableEquipment).toEqual([]);
  });
  it("validates imports before replacing existing data", () => {
    localStorage.setItem("gplan.state.v1", JSON.stringify(defaultState));
    render(<App />);
    click("Settings");
    fireEvent.change(screen.getByLabelText("Backup JSON"), { target: { value: "{bad" } });
    click("Import backup");
    expect(screen.getByRole("alert")).toBeVisible();
    expect(JSON.parse(localStorage.getItem("gplan.state.v1") ?? "{}")).toEqual(defaultState);
  });
  it("creates an editable local plan through the request form", () => {
    render(<App />);
    click("Build a plan");
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Plan name"), { target: { value: "Monday strength" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create local plan" }));
    const saved = JSON.parse(localStorage.getItem("gplan.state.v1") ?? "{}");
    expect(saved.plans[0].name).toBe("Monday strength");
    expect(saved.plans[0].days).toHaveLength(3);
    expect(saved.plans[0].days[0].items).toHaveLength(5);
  });
  it("rejects invalid Gemini model identifiers before saving preferences", () => {
    // Given unsaved provider preferences
    render(<App />);
    click("Settings");
    fireEvent.change(screen.getByLabelText("Manual model ID"), { target: { value: "../../wrong model" } });
    // When the user tries to save an invalid model identifier
    click("Save AI preferences");
    // Then invalid preferences never reach storage
    expect(localStorage.getItem("gplan.state.v1")).toBeNull();
    expect(screen.getByRole("alert")).toBeVisible();
  });
  it("never persists a provider key and clears it on provider switch", () => {
    render(<App />);
    click("Settings");
    fireEvent.change(screen.getByLabelText("API key"), { target: { value: "secret-ui-sentinel" } });
    fireEvent.change(screen.getByLabelText("Manual model ID"), { target: { value: "model-fixture" } });
    click("Save AI preferences");
    expect(localStorage.getItem("gplan.state.v1")).not.toContain("secret-ui-sentinel");
    fireEvent.change(screen.getByLabelText("Provider"), { target: { value: "openai-compatible" } });
    expect(screen.getByLabelText("API key")).toHaveValue("");
  });
});
