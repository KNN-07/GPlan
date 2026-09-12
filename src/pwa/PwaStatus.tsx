import { useSyncExternalStore } from 'react';
import { applyPwaUpdate, getPwaState, installPwa, subscribePwa } from './register';

const styles =
  '.gplan-pwa{--pwa-paper:#f4f3e9;--pwa-ink:#202823;--pwa-lime:#c6f36b;--pwa-line:#b4bdb3;box-sizing:border-box;color:var(--pwa-ink);background:var(--pwa-paper);border:1px solid var(--pwa-line);border-radius:12px;padding:12px 16px;font:400 14px/1.5 "Helvetica Neue",Arial,sans-serif;max-width:100%;}' +
  '.gplan-pwa *{box-sizing:border-box}.gplan-pwa__row{display:flex;align-items:center;flex-wrap:wrap;gap:8px 16px}.gplan-pwa__status{display:flex;align-items:center;gap:8px;margin:0;margin-right:auto}.gplan-pwa__dot{width:8px;height:8px;border-radius:50%;background:var(--pwa-ink);flex:none}.gplan-pwa[data-offline="false"] .gplan-pwa__dot{background:var(--pwa-lime);outline:1px solid var(--pwa-ink)}' +
  '.gplan-pwa button,.gplan-pwa summary{font:inherit;font-weight:650;cursor:pointer;min-height:44px;border-radius:8px;color:var(--pwa-ink)}.gplan-pwa button{border:1px solid var(--pwa-ink);padding:8px 16px;background:var(--pwa-lime)}.gplan-pwa button:hover{background:var(--pwa-paper)}.gplan-pwa button:active{transform:scale(.98)}.gplan-pwa button:disabled{cursor:wait;opacity:.65}.gplan-pwa button:focus-visible,.gplan-pwa summary:focus-visible{outline:2px solid var(--pwa-ink);outline-offset:3px}' +
  '.gplan-pwa details{margin-top:8px}.gplan-pwa summary{padding:12px 0;width:fit-content}.gplan-pwa details p,.gplan-pwa__note{margin:8px 0 0;max-width:65ch;overflow-wrap:anywhere}.gplan-pwa__error{font-weight:650}.gplan-pwa strong{font-weight:650}';

/** Drop into the host layout; registration is owned by main, not React effects. */
export function PwaStatus(): React.JSX.Element | null {
  const state = useSyncExternalStore(subscribePwa, getPwaState, getPwaState);
  const status = state.online
    ? (state.offlineReady ? 'Ready offline' : 'Online')
    : (state.offlineReady ? 'Offline mode' : 'Offline - shell not cached yet');

  return (
    <section className="gplan-pwa" aria-label="App availability" data-offline={!state.online}>
      <style>{styles}</style>
      <div className="gplan-pwa__row">
        <p className="gplan-pwa__status" role="status">
          <span className="gplan-pwa__dot" aria-hidden="true" />
          {status}
        </p>
        {state.installed && <span>Installed</span>}
        {state.canInstall && !state.installed && (
          <button type="button" disabled={state.busy} onClick={() => void installPwa()}>Install GPlan</button>
        )}
        {state.needRefresh && (
          <button type="button" disabled={state.busy} onClick={() => void applyPwaUpdate()}>
            {state.busy ? 'Updating...' : 'Update and reload'}
          </button>
        )}
      </div>
      {!state.online && <p className="gplan-pwa__note">Local planning stays available. AI generation needs an internet connection.</p>}
      {state.needRefresh && <p className="gplan-pwa__note">A new version is ready. Save your edits before updating. Nothing reloads until you choose.</p>}
      {state.error && <p className="gplan-pwa__note gplan-pwa__error" role="alert">{state.error}</p>}
      {!state.installed && !state.canInstall && (
        <details>
          <summary>Install GPlan</summary>
          <p><strong>iPhone or iPad:</strong> open in Safari, tap Share, then Add to Home Screen.</p>
          <p><strong>Android or desktop:</strong> use your browser menu and choose Install app or Add to Home screen. If unavailable, open GPlan in a supported browser such as Chrome or Edge.</p>
          <p>Load GPlan online once before using it offline. Installation requires HTTPS or localhost.</p>
        </details>
      )}
    </section>
  );
}
