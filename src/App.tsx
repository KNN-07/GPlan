import { useEffect, useState } from "react";
import type { Exercise, ProviderConfig, WorkoutPlan } from "./contracts";
import { Catalog } from "./ui/Catalog";
import { ExerciseDetail } from "./ui/ExerciseDetail";
import { PlanEditor } from "./ui/PlanEditor";
import { Settings } from "./ui/Settings";
import { AiPlanDialog, CreatePlanDialog } from "./ui/PlanDialogs";
import { Icon, Notice } from "./ui/primitives";
import { usePlanner } from "./ui/usePlanner";
import "./styles.css";

type Page = "Exercises" | "Plan" | "Settings";
export default function App() {
  const planner = usePlanner();
  const [page, setPage] = useState<Page>("Exercises");
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [creating, setCreating] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [credentials, setCredentials] = useState({ apiKey: "", scope: "" });
  function setApiKey(apiKey: string, config?: ProviderConfig) {
    setCredentials({ apiKey, scope: config ? JSON.stringify(config) : "" });
  }
  const apiKey = credentials.scope === JSON.stringify(planner.state.aiPreferences?.config) ? credentials.apiKey : "";
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  function navigate(next: Page) {
    setPage(next);
    window.scrollTo({ top: 0 });
  }
  function accept(plan: WorkoutPlan) {
    planner.putPlan(plan);
    planner.setDayId(plan.days[0]?.id ?? "");
    setCreating(false);
    setAiOpen(false);
    navigate("Plan");
    planner.setNotice(`${plan.name} is ready. Make it yours.`);
  }
  const active = planner.state.plans.find((p) => p.id === planner.state.activePlanId);
  const day = active?.days.find((d) => d.id === planner.dayId) ?? active?.days[0];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          aria-label="GPlan home"
          onClick={(e) => {
            e.preventDefault();
            navigate("Exercises");
          }}
        >
          <span className="monogram">
            g<span>↗</span>
          </span>
          <span>
            GPlan<span className="brand-period">.</span>
          </span>
        </a>
        <p className="sidebar-caption">
          A LITTLE INTENTION.
          <br />A STRONGER YOU.
        </p>
        <nav className="main-nav" aria-label="Main navigation">
          {(["Exercises", "Plan", "Settings"] as const).map((item, i) => (
            <button key={item} aria-current={page === item ? "page" : undefined} onClick={() => navigate(item)}>
              <Icon name={item === "Exercises" ? "grid" : item === "Plan" ? "plan" : "settings"} />
              <span>{item}</span>
              <span className="nav-number" aria-hidden="true">
                0{i + 1}
              </span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="offline-mark">
            <Icon name="check" size={16} />
            <span>Made to go offline.</span>
          </div>
          <p>
            Your plans, on your device.
            <br />
            Just you and the next rep.
          </p>
          <span className="edition">THE PERSONAL TRAINING EDITION</span>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <span className="breadcrumb">
            YOUR SPACE <span>/</span> {page.toUpperCase()}
          </span>
          <span className={`online-pill ${online ? "" : "offline"}`}>
            <i />
            {online ? "Local-first. Always yours." : "Offline · local planning ready"}
          </span>
        </header>
        <main id="main" tabIndex={-1}>
          {planner.error && <Notice error>{planner.error}</Notice>}
          {page === "Exercises" && (
            <Catalog
              planner={planner}
              onDetail={setDetail}
              onCreate={() => setCreating(true)}
              onPlan={() => navigate("Plan")}
            />
          )}
          {page === "Plan" && (
            <PlanEditor
              planner={planner}
              onCreate={() => setCreating(true)}
              onAi={() => setAiOpen(true)}
              onBrowse={() => navigate("Exercises")}
              onDetail={setDetail}
            />
          )}
          {page === "Settings" && (
            <Settings
              planner={planner}
              apiKey={credentials.apiKey}
              keyScope={credentials.scope}
              setApiKey={setApiKey}
              online={online}
            />
          )}
          <footer className="page-footer">
            <strong>GPlan.</strong>
            <span>Move with intention.</span>
            <span>PRIVATE BY DESIGN</span>
          </footer>
        </main>
      </div>
      {planner.notice && (
        <div className="toast" role="status">
          <Icon name="check" />
          <span>{planner.notice}</span>
          <button
            onClick={() => {
              planner.setNotice("");
              navigate("Plan");
            }}
          >
            View plan
          </button>
          <button className="icon-button" aria-label="Dismiss notification" onClick={() => planner.setNotice("")}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      {detail && (
        <ExerciseDetail
          exercise={detail}
          destination={active ? `${active.name} / ${day?.name ?? "Day 1"}` : "a new manual plan / Day 1"}
          onClose={() => setDetail(null)}
          onAdd={() => {
            planner.addExercise(detail);
            setDetail(null);
          }}
        />
      )}
      {creating && <CreatePlanDialog gym={planner.state.gym} onClose={() => setCreating(false)} onAccept={accept} />}
      {aiOpen && (
        <AiPlanDialog
          gym={planner.state.gym}
          preferences={planner.state.aiPreferences}
          apiKey={apiKey}
          online={online}
          onClose={() => setAiOpen(false)}
          onAccept={accept}
          onSettings={() => {
            setAiOpen(false);
            navigate("Settings");
          }}
        />
      )}
    </div>
  );
}
