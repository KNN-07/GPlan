import { useEffect, useRef, useState } from "react";
import type { ModelOption, ProviderConfig } from "../contracts";
import { AiError, discoverModels } from "../ai";
import { openAiRoot } from "../ai/openai";
import { importState } from "../core/storage";
import { Field, Notice } from "./primitives";
import type { Planner } from "./usePlanner";

export function AiSettings({
  planner,
  apiKey: enteredKey,
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
  const preferences = planner.state.aiPreferences;
  const [config, setConfig] = useState<ProviderConfig>(preferences?.config ?? { provider: "gemini" });
  const [modelId, setModelId] = useState(preferences?.modelId ?? "");
  const apiKey = keyScope === JSON.stringify(config) ? enteredKey : "";
  const [models, setModels] = useState<readonly ModelOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [discovered, setDiscovered] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!online) {
      controller.current?.abort();
      setBusy(false);
    }
  }, [online]);
  function invalidate() {
    controller.current?.abort();
    setBusy(false);
    setError("");
    setSaved(false);
  }
  async function discover() {
    invalidate();
    const active = new AbortController();
    controller.current = active;
    setBusy(true);
    setModels([]);
    setDiscovered(false);
    try {
      const result = await discoverModels({ config, apiKey, signal: active.signal });
      if (!active.signal.aborted && controller.current === active) {
        setModels(result);
        setDiscovered(true);
      }
    } catch (failure) {
      if (!active.signal.aborted && controller.current === active) {
        if (failure instanceof AiError) setError(`${failure.code}: ${failure.message}`);
        else if (failure instanceof Error) setError("Model discovery failed. Try a manual model ID.");
        else throw failure;
      }
    } finally {
      if (!active.signal.aborted && controller.current === active) setBusy(false);
    }
  }
  return (
    <section className="settings-section">
      <div className="settings-section-title">
        <span className="section-number">02</span>
        <div>
          <h2>An optional thinking partner.</h2>
          <p>Connect your own AI provider. Local planning is always free of API calls.</p>
        </div>
      </div>
      <div className="settings-body">
        <div className="form-row">
          <Field title="Provider">
            <select
              value={config.provider}
              onChange={(e) => {
                invalidate();
                setApiKey("");
                setModels([]);
                setModelId("");
                setDiscovered(false);
                setConfig(
                  e.target.value === "gemini"
                    ? { provider: "gemini" }
                    : { provider: "openai-compatible", baseUrl: "https://api.openai.com/v1" },
                );
              }}
            >
              <option value="gemini">Google Gemini</option>
              <option value="openai-compatible">OpenAI-compatible</option>
            </select>
          </Field>
          <Field title="API key">
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              onChange={(e) => {
                invalidate();
                setApiKey(e.target.value, config);
              }}
              placeholder="Kept in memory, never saved"
            />
          </Field>
        </div>
        {config.provider === "openai-compatible" && (
          <Field title="Provider root URL">
            <input
              type="url"
              value={config.baseUrl}
              placeholder="https://api.openai.com/v1"
              onChange={(e) => {
                invalidate();
                setApiKey("");
                setModels([]);
                setDiscovered(false);
                setConfig({ provider: "openai-compatible", baseUrl: e.target.value });
              }}
            />
          </Field>
        )}
        <p className="privacy-note">
          Your key stays in this tab's memory. Reloading or switching providers clears it. Backups never contain keys.
        </p>
        <div className="discovery-row">
          <button className="button" disabled={!online || busy} onClick={() => void discover()}>
            {busy ? "Discovering models..." : "Discover models"}
          </button>
          {busy && (
            <button
              className="text-button"
              onClick={() => {
                invalidate();
                setError("Discovery cancelled.");
              }}
            >
              Cancel discovery
            </button>
          )}
          <span className="muted">Models are loaded only when you ask.</span>
        </div>
        {!online && (
          <Notice>You're offline. Reconnect to discover models or generate with AI. Local plans still work.</Notice>
        )}
        {models.length > 0 && (
          <Field title="Discovered models">
            <select
              value={models.some((model) => model.id === modelId) ? modelId : ""}
              onChange={(e) => {
                setModelId(e.target.value);
                setSaved(false);
              }}
            >
              <option value="">Select a model</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </Field>
        )}
        {discovered && !models.length && (
          <Notice>
            No models were listed. Your provider may not support discovery. Enter its exact model ID below.
          </Notice>
        )}
        <Field title="Manual model ID">
          <input
            value={modelId}
            onChange={(e) => {
              setModelId(e.target.value);
              setSaved(false);
            }}
            placeholder="Or enter the exact model ID"
            autoComplete="off"
          />
        </Field>
        {error && <Notice error>{error}</Notice>}
        <button
          className="button primary"
          disabled={!modelId.trim()}
          onClick={() => {
            try {
              if (config.provider === "openai-compatible") openAiRoot(config.baseUrl);
            } catch (failure) {
              if (failure instanceof AiError) {
                setError(failure.message);
                return;
              }
              throw failure;
            }
            if (config.provider === "gemini" && !/^(?:models\/)?[A-Za-z0-9][A-Za-z0-9._-]*$/.test(modelId.trim())) {
              setError("Enter a valid Gemini model ID, such as gemini-2.5-flash, or choose a discovered model.");
              return;
            }
            const next = { ...planner.state, aiPreferences: { config, modelId: modelId.trim() } };
            const parsed = importState(JSON.stringify(next));
            if (!parsed.ok) {
              setError("Use a valid provider root URL and a nonempty model ID.");
              return;
            }
            setError("");
            setSaved(planner.update(() => parsed.value));
          }}
        >
          Save AI preferences
        </button>
        {saved && <Notice>Provider and model saved. Your API key was not stored.</Notice>}
      </div>
    </section>
  );
}
