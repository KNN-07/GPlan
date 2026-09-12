import { lazy, Suspense } from "react";
import type { Exercise } from "../contracts";
import { Dialog, Icon, label } from "./primitives";
const ExerciseViewer = lazy(() =>
  import("../graphics/ExerciseViewer").then((module) => ({ default: module.ExerciseViewer })),
);
export function ExerciseDetail({
  exercise,
  onClose,
  onAdd,
  destination,
}: {
  readonly exercise: Exercise;
  readonly onClose: () => void;
  readonly onAdd: () => void;
  readonly destination: string;
}) {
  return (
    <Dialog title={exercise.name} onClose={onClose} wide>
      <div className="detail-grid">
        <div>
          <Suspense
            fallback={
              <div className="viewer-loading" role="status">
                Preparing movement view...
              </div>
            }
          >
            <ExerciseViewer exercise={exercise} />
          </Suspense>
        </div>
        <div className="detail-info">
          <p className="eyebrow">
            {label(exercise.difficulty)} · {label(exercise.movement)}
          </p>
          <h3>Know the movement.</h3>
          <div className="detail-muscles">
            <span>Primary focus</span>
            <strong>{exercise.primary.map(label).join(", ")}</strong>
            <span>Also working</span>
            <strong>{exercise.secondary.map(label).join(", ") || "No secondary muscles listed"}</strong>
            <span>Equipment</span>
            <strong>
              {exercise.equipmentOptions
                .map((option) => (option.length ? option.map(label).join(" + ") : "Bodyweight"))
                .join(" or ")}
            </strong>
          </div>
          <h3>Make every rep count.</h3>
          <ol className="instructions">
            {exercise.instructions.map((instruction, i) => (
              <li key={instruction}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <p>{instruction}</p>
              </li>
            ))}
          </ol>
          <div className="detail-add">
            <p>
              Adding to <strong>{destination}</strong>
            </p>
            <button className="button primary" onClick={onAdd}>
              <Icon name="plus" />
              Add to plan
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
