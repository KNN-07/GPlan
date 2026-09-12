import { useEffect, useRef, useState } from "react";
import type { AiPlanDraft, AiPreferences, GymProfile, PlanRequest, WorkoutPlan } from "../contracts";
import { exercises, exerciseById } from "../catalog";
import { createLocalPlan, materializeAiPlan } from "../core/planner";
import { AiError, generatePlan } from "../ai";
import { context } from "./usePlanner";
import { Dialog, Notice } from "./primitives";

import { RequestFields } from "./RequestFields";

const initialRequest = (gym: GymProfile): PlanRequest => ({
  name: "My strength routine",
  daysPerWeek: 3,
  exercisesPerDay: 5,
  experience: "beginner",
  focus: [],
  gym,
});
export function CreatePlanDialog({
  gym,
  onClose,
  onAccept,
}: {
  readonly gym: GymProfile;
  readonly onClose: () => void;
  readonly onAccept: (plan: WorkoutPlan) => void;
}) {
  const [request, setRequest] = useState(() => initialRequest(gym));
  const [error, setError] = useState("");
  return (
    <Dialog title="Your next chapter." onClose={onClose}>
      <p className="muted">A balanced routine, built locally around your equipment. Adjust every detail afterward.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const result = createLocalPlan(request, context());
          if (result.ok) onAccept(result.value);
          else setError(result.error.message);
        }}
      >
        <RequestFields request={request} onChange={setRequest} />
        {error && <Notice error>{error}</Notice>}
        <div className="dialog-actions">
          <button
            type="button"
            className="button"
            onClick={() => {
              if (!request.name.trim()) {
                setError("Give your plan a name.");
                return;
              }
              const ctx = context();
              onAccept({
                id: ctx.newId(),
                name: request.name.trim(),
                source: "manual",
                createdAt: ctx.now,
                updatedAt: ctx.now,
                days: Array.from({ length: request.daysPerWeek }, (_, i) => ({
                  id: ctx.newId(),
                  name: `Day ${i + 1}`,
                  items: [],
                })),
              });
            }}
          >
            Start manual plan
          </button>
          <button className="button primary" type="submit">
            Create local plan
          </button>
        </div>
      </form>
    </Dialog>
  );
}
export function AiPlanDialog({
  gym,
  preferences,
  apiKey,
  online,
  onClose,
  onAccept,
  onSettings,
}: {
  readonly gym: GymProfile;
  readonly preferences: AiPreferences | null;
  readonly apiKey: string;
  readonly online: boolean;
  readonly onClose: () => void;
  readonly onAccept: (plan: WorkoutPlan) => void;
  readonly onSettings: () => void;
}) {
  const [request, setRequest] = useState(() => initialRequest(gym));
  const [draft, setDraft] = useState<AiPlanDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!online) {
      controller.current?.abort();
      setBusy(false);
    }
  }, [online]);
  function changeRequest(next: PlanRequest) {
    controller.current?.abort();
    setBusy(false);
    setDraft(null);
    setRequest(next);
  }
  async function generate() {
    if (!preferences || !online) return;
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setBusy(true);
    setError("");
    setDraft(null);
    try {
      const result = await generatePlan({
        config: preferences.config,
        apiKey,
        modelId: preferences.modelId,
        request,
        catalog: exercises,
        signal: active.signal,
      });
      if (!active.signal.aborted && controller.current === active) setDraft(result);
    } catch (failure) {
      if (!active.signal.aborted && controller.current === active) {
        if (failure instanceof AiError) setError(`${failure.code}: ${failure.message}`);
        else if (failure instanceof Error) setError("Unable to complete the AI request. Try again.");
        else throw failure;
      }
    } finally {
      if (controller.current === active && !active.signal.aborted) setBusy(false);
    }
  }
  return (
    <Dialog title="A little intelligence. Your direction." onClose={onClose}>
      <p className="muted">
        Your request and eligible exercise catalog are sent to your selected provider. Review the routine before saving
        it.
      </p>
      {!online && <Notice>You're offline. AI needs a connection; local planning still works.</Notice>}
      {!preferences ? (
        <div className="empty-state">
          <p>Choose a provider and a model in Settings first.</p>
          <button className="button primary" onClick={onSettings}>
            Open AI settings
          </button>
        </div>
      ) : (
        <>
          <p className="model-caption">
            {preferences.config.provider} / {preferences.modelId}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void generate();
            }}
          >
            <RequestFields request={request} onChange={changeRequest} />
            {error && <Notice error>{error}</Notice>}
            <div className="dialog-actions">
              {busy && (
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    controller.current?.abort();
                    setBusy(false);
                    setError("Request cancelled.");
                  }}
                >
                  Cancel request
                </button>
              )}
              <button type="submit" className="button primary" disabled={!online || busy}>
                {busy ? "Building your preview..." : "Generate preview"}
              </button>
            </div>
          </form>
          {draft && (
            <section className="ai-preview">
              <p className="eyebrow">PREVIEW · NOT SAVED YET</p>
              <h3>{draft.name}</h3>
              {draft.days.map((day, i) => (
                <div key={i}>
                  <h4>{day.name}</h4>
                  <ul>
                    {day.items.map((item) => (
                      <li key={item.exerciseId}>
                        <span>{exerciseById.get(item.exerciseId)?.name}</span>
                        <strong>
                          {item.sets} ×{" "}
                          {item.prescription.kind === "time"
                            ? `${item.prescription.seconds}s`
                            : `${item.prescription.min}-${item.prescription.max}`}
                        </strong>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <button className="button primary" onClick={() => onAccept(materializeAiPlan(draft, context()))}>
                Accept plan
              </button>
            </section>
          )}
        </>
      )}
    </Dialog>
  );
}
