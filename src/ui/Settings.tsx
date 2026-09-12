import { useState } from "react";
import type { ProviderConfig } from "../contracts";
import { equipment } from "../catalog/taxonomy";
import { exportState, importState } from "../core/storage";
import { PwaStatus } from "../pwa/PwaStatus";
import type { Planner } from "./usePlanner";
import { AiSettings } from "./AiSettings";
import { Field, Icon, label, Notice } from "./primitives";

export function Settings({
  planner,
  apiKey,
  keyScope,
  setApiKey,
  online,
}: {
  readonly planner: Planner;
  readonly apiKey: string;
  readonly keyScope: string;
  readonly setApiKey: (key: string, config?: ProviderConfig) => void;
  readonly online: boolean;
}) {
  const [search, setSearch] = useState("");
  const [backup, setBackup] = useState("");
  const [error, setError] = useState("");
  const [imported, setImported] = useState(false);
  const [importRevision, setImportRevision] = useState(0);
  function exportBackup() {
    const serialized = exportState(planner.state);
    setBackup(serialized);
    const url = URL.createObjectURL(new Blob([serialized], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "gplan-backup.json";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="settings-page">
      <div className="page-heading">
        <p className="eyebrow">SET UP FOR YOUR KIND OF TRAINING</p>
        <h1>
          Your gym.
          <br />
          Your ground rules.
        </h1>
        <p>A few preferences. A more personal plan.</p>
      </div>
      <section className="settings-section">
        <div className="settings-section-title">
          <span className="section-number">01</span>
          <div>
            <h2>What's in your gym?</h2>
            <p>Choose the equipment you can use. Bodyweight is always available.</p>
          </div>
        </div>
        <div className="settings-body">
          <div className="equipment-toolbar">
            <label className="search-field">
              <Icon name="search" />
              <input
                aria-label="Search equipment"
                type="search"
                placeholder="Find equipment..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <div>
              <button
                className="text-button"
                onClick={() => planner.update((state) => ({ ...state, gym: { availableEquipment: [...equipment] } }))}
              >
                Select all
              </button>
              <button
                className="text-button"
                onClick={() => planner.update((state) => ({ ...state, gym: { availableEquipment: [] } }))}
              >
                Select none
              </button>
            </div>
          </div>
          <p className="eyebrow">
            {planner.state.gym.availableEquipment.length} OF {equipment.length} SELECTED · SAVED AUTOMATICALLY
          </p>
          <div className="equipment-grid">
            {equipment
              .filter((item) => label(item).toLowerCase().includes(search.toLowerCase()))
              .map((item) => (
                <label className="equipment-option" key={item}>
                  <input
                    type="checkbox"
                    checked={planner.state.gym.availableEquipment.includes(item)}
                    onChange={(e) =>
                      planner.update((state) => ({
                        ...state,
                        gym: {
                          availableEquipment: e.target.checked
                            ? [...state.gym.availableEquipment, item]
                            : state.gym.availableEquipment.filter((gear) => gear !== item),
                        },
                      }))
                    }
                  />
                  <span>{label(item)}</span>
                </label>
              ))}
          </div>
          <p className="privacy-note">
            Changing equipment won't delete your exercises. Unavailable movements are marked in your plans, with
            suitable swaps a tap away.
          </p>
        </div>
      </section>
      <AiSettings
        key={importRevision}
        planner={planner}
        apiKey={apiKey}
        keyScope={keyScope}
        setApiKey={setApiKey}
        online={online}
      />
      <section className="settings-section">
        <div className="settings-section-title">
          <span className="section-number">03</span>
          <div>
            <h2>Your data stays yours.</h2>
            <p>Keep a backup, move devices, or restore your training journal.</p>
          </div>
        </div>
        <div className="settings-body">
          <div className="backup-actions">
            <button className="button" onClick={exportBackup}>
              Export JSON backup <Icon name="arrow" />
            </button>
            <Field title="Load a backup file">
              <input
                type="file"
                accept=".json,application/json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    setBackup(await file.text());
                    setError("");
                    setImported(false);
                  } catch (failure) {
                    if (failure instanceof Error) setError("The file could not be read. Try another backup.");
                    else throw failure;
                  }
                }}
              />
            </Field>
          </div>
          <Field title="Backup JSON">
            <textarea
              value={backup}
              rows={5}
              onChange={(e) => {
                setBackup(e.target.value);
                setError("");
                setImported(false);
              }}
              placeholder="Paste your GPlan backup here, or load a JSON file."
              spellCheck={false}
            />
          </Field>
          <p className="privacy-note">
            Import replaces this device's plans and preferences after validation. Export first to keep your current
            journal.
          </p>
          <button
            className="button"
            disabled={!backup.trim()}
            onClick={() => {
              const result = importState(backup);
              if (!result.ok) {
                setError(result.error.message);
                return;
              }
              setError("");
              setApiKey("");
              setImported(planner.update(() => result.value));
              setImportRevision((value) => value + 1);
            }}
          >
            Import backup
          </button>
          {error && <Notice error>{error}</Notice>}
          {imported && <Notice>Backup imported. Your plans are ready.</Notice>}
        </div>
      </section>
      <section className="settings-section">
        <div className="settings-section-title">
          <span className="section-number">04</span>
          <div>
            <h2>Always in your corner.</h2>
            <p>Install GPlan for a focused, offline-ready training companion.</p>
          </div>
        </div>
        <div className="settings-body">
          <PwaStatus />
        </div>
      </section>
    </section>
  );
}
