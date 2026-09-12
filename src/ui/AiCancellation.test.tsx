import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AiPlanDialog } from "./PlanDialogs";
import { exercises } from "../catalog";
import { defaultState } from "../core/storage";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function pendingGeneration() {
  const signals: AbortSignal[] = [];
  let release: (response: Response) => void = () => {
    throw new Error("Request has not started");
  };
  const wireResponse = new Promise<Response>((resolve) => {
    release = resolve;
  });
  vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => {
    if (init?.signal) signals.push(init.signal);
    return wireResponse;
  });
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  render(
    <AiPlanDialog
      gym={defaultState.gym}
      preferences={{
        config: { provider: "openai-compatible", baseUrl: "https://fixture.invalid/v1" },
        modelId: "fixture",
      }}
      apiKey="transient"
      online
      onClose={() => undefined}
      onAccept={() => undefined}
      onSettings={() => undefined}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Generate preview" }));
  const draft = {
    name: "Stale response",
    days: Array.from({ length: 3 }, (_, i) => ({
      name: `Day ${i + 1}`,
      items: exercises
        .slice(0, 5)
        .map((exercise) => ({
          exerciseId: exercise.id,
          sets: 3,
          restSeconds: 60,
          prescription: { kind: "reps", min: 8, max: 12 },
        })),
    })),
  };
  return {
    signals,
    complete: () =>
      release(
        new Response(
          JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(draft) } }] }),
          { headers: { "Content-Type": "application/json" } },
        ),
      ),
  };
}

it("aborts generation and rejects a late response when cancelled", async () => {
  // Given an in-flight request through the real provider adapter
  const pending = pendingGeneration();
  // When the user cancels, even if the wire later resolves
  fireEvent.click(screen.getByRole("button", { name: "Cancel request" }));
  await act(async () => {
    pending.complete();
  });
  // Then transport is aborted and stale output cannot be accepted
  expect(pending.signals[0].aborted).toBe(true);
  expect(screen.queryByRole("button", { name: "Accept plan" })).toBeNull();
  expect(screen.getByRole("button", { name: "Generate preview" })).toBeEnabled();
});

it("aborts the replaced request when training preferences change", async () => {
  // Given an in-flight request for the original training preferences
  const pending = pendingGeneration();
  // When a different request replaces those preferences
  fireEvent.change(screen.getByLabelText("Days per week"), { target: { value: "1" } });
  await act(async () => {
    pending.complete();
  });
  // Then the stale plan never appears under the new request
  expect(pending.signals[0].aborted).toBe(true);
  expect(screen.queryByRole("button", { name: "Accept plan" })).toBeNull();
});
