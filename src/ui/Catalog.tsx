import { useMemo, useState } from "react";
import type { Equipment, Exercise, Muscle } from "../contracts";
import { exercises } from "../catalog";
import { equipment, muscles } from "../catalog/taxonomy";
import { isAvailable, queryExercises } from "../core/catalog";
import type { Planner } from "./usePlanner";
import { Field, Icon, label, MuscleMap } from "./primitives";

export function Catalog({
  planner,
  onDetail,
  onCreate,
  onPlan,
}: {
  readonly planner: Planner;
  readonly onDetail: (exercise: Exercise) => void;
  readonly onCreate: () => void;
  readonly onPlan: () => void;
}) {
  const [text, setText] = useState("");
  const [focus, setFocus] = useState<Muscle[]>([]);
  const [gear, setGear] = useState<Equipment[]>([]);
  const [availableOnly, setAvailableOnly] = useState(false);
  const results = useMemo(
    () => queryExercises({ text, muscles: focus, equipment: gear, availableOnly }, planner.state.gym),
    [text, focus, gear, availableOnly, planner.state.gym],
  );
  const active = planner.state.plans.find((plan) => plan.id === planner.state.activePlanId);
  const filtered = text || focus.length > 0 || gear.length > 0 || availableOnly;
  function reset() {
    setText("");
    setFocus([]);
    setGear([]);
    setAvailableOnly(false);
  }
  return (
    <>
      <section className="catalog-hero">
        <div className="hero-copy">
          <p className="eyebrow">YOUR TRAINING, ON YOUR TERMS</p>
          <h1>
            Strong starts
            <br />
            with a plan<span className="lime-dot">.</span>
          </h1>
          <p className="hero-description">
            Find your movement. Build your routine.
            <br />A little more intention, every session.
          </p>
          <div className="metrics">
            <div>
              <strong>{exercises.length}</strong>
              <span>exercises to explore</span>
            </div>
            <div>
              <strong>{String(planner.state.plans.length).padStart(2, "0")}</strong>
              <span>plans made yours</span>
            </div>
            <span className="metric-note">
              No account.
              <br />
              No distractions.
            </span>
          </div>
        </div>
        <article className="training-card">
          <div className="training-card-top">
            <span className="eyebrow">THE NEXT CHAPTER</span>
            <span className="card-symbol">↗</span>
          </div>
          <div className="training-art" aria-hidden="true">
            <MuscleMap primary={["chest", "shoulders", "quads", "core"]} large />
            <span className="art-rule" />
            <span className="art-label">BUILT AROUND YOU</span>
          </div>
          <div className="training-card-bottom">
            <p className="eyebrow">
              {active
                ? `${active.days.length} DAYS · ${active.source.toUpperCase()} PLAN`
                : "YOUR PACE. YOUR PROGRESS."}
            </p>
            <h2>{active ? active.name : "Make room\nfor stronger."}</h2>
            <button className="button primary" onClick={active ? onPlan : onCreate}>
              {active ? "Open your plan" : "Build a plan"}
              <Icon name="arrow" />
            </button>
          </div>
        </article>
      </section>
      <section className="library" aria-labelledby="library-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE MOVEMENT LIBRARY</p>
            <h2 id="library-title">Find your focus.</h2>
          </div>
          <span className="section-note">Good form. Better choices.</span>
        </div>
        <div className="focus-chips" aria-label="Muscle focus">
          <button className="chip" aria-pressed={!focus.length} onClick={() => setFocus([])}>
            All muscles
          </button>
          {muscles.map((muscle) => (
            <button
              className="chip"
              key={muscle}
              aria-pressed={focus.includes(muscle)}
              onClick={() =>
                setFocus((current) =>
                  current.includes(muscle) ? current.filter((m) => m !== muscle) : [...current, muscle],
                )
              }
            >
              {label(muscle)}
            </button>
          ))}
        </div>
        <div className="filter-bar">
          <label className="search-field">
            <Icon name="search" />
            <input
              type="search"
              aria-label="Search exercises"
              placeholder="Search a movement..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <Field title="Equipment">
            <select
              aria-label="Filter equipment"
              value={gear[0] ?? ""}
              onChange={(e) => setGear(equipment.filter((item) => item === e.target.value))}
            >
              <option value="">All equipment</option>
              {equipment.map((item) => (
                <option key={item} value={item}>
                  {label(item)}
                </option>
              ))}
            </select>
          </Field>
          <label className="checkbox">
            <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} />
            My gym only
          </label>
        </div>
        <div className="results-line">
          <span>
            <strong>{results.length}</strong> movements{filtered ? " found" : " in your library"}
          </span>
          {filtered ? (
            <button className="text-button" onClick={reset}>
              Clear filters <Icon name="close" size={14} />
            </button>
          ) : (
            <span>EXPLORE. UNDERSTAND. ADD.</span>
          )}
        </div>
        {results.length ? (
          <div className="exercise-grid">
            {results.map((exercise, index) => (
              <article className="exercise-card" key={exercise.id} data-testid="exercise-card">
                <button
                  className="exercise-main"
                  onClick={() => onDetail(exercise)}
                  aria-label={`View ${exercise.name}`}
                >
                  <div className="tile-visual">
                    <MuscleMap primary={exercise.primary} />
                    <span className="tile-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="tile-view">
                      Explore <Icon name="arrow" size={16} />
                    </span>
                  </div>
                  <div className="tile-copy">
                    <p className="eyebrow">{exercise.primary.map(label).join(" / ")}</p>
                    <h3>{exercise.name}</h3>
                    <p className="equipment-copy">
                      {exercise.equipmentOptions
                        .map((option) => (option.length ? option.map(label).join(" + ") : "Bodyweight"))
                        .join(" or ")}
                    </p>
                  </div>
                </button>
                <footer>
                  <span className={`difficulty ${exercise.difficulty}`}>
                    <i />
                    {label(exercise.difficulty)}
                  </span>
                  {!isAvailable(exercise, planner.state.gym) && <span className="unavailable-label">Not in gym</span>}
                  <button
                    className="icon-button add-button"
                    onClick={() => planner.addExercise(exercise)}
                    aria-label={`Add ${exercise.name} to plan`}
                  >
                    <Icon name="plus" />
                  </button>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Icon name="search" size={36} />
            <h3>No movements match yet.</h3>
            <p>Try a broader search, a different muscle, or more equipment.</p>
            <button className="button" onClick={reset}>
              Reset filters
            </button>
          </div>
        )}
      </section>
    </>
  );
}
