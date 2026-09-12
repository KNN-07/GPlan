import { registerSW } from 'virtual:pwa-register';

interface InstallPromptEvent extends Event {
  readonly prompt: () => Promise<void>;
  readonly userChoice: Promise<{ readonly outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: InstallPromptEvent;
    appinstalled: Event;
  }
}

type PwaState = {
  readonly online: boolean;
  readonly offlineReady: boolean;
  readonly needRefresh: boolean;
  readonly installed: boolean;
  readonly canInstall: boolean;
  readonly busy: boolean;
  readonly error: string | null;
};

let state: PwaState = {
  online: true, offlineReady: false, needRefresh: false,
  installed: false, canInstall: false, busy: false, error: null,
};
const listeners = new Set<() => void>();
let started = false;
let installPrompt: InstallPromptEvent | null = null;
let updateWorker: (() => Promise<void>) | undefined;
let updateAccepted = false;
let activatedElsewhere = false;

function publish(change: Partial<PwaState>): void {
  state = { ...state, ...change };
  listeners.forEach((listener) => listener());
}

export function subscribePwa(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getPwaState(): PwaState { return state; }

/** Owns page-lifetime listeners; safe if a host accidentally calls it twice. */
export function registerPwa(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  const standalone = window.matchMedia('(display-mode: standalone)');
  publish({
    online: navigator.onLine,
    installed: standalone.matches || ('standalone' in navigator && navigator.standalone === true),
    offlineReady: 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null,
  });
  window.addEventListener('online', () => publish({ online: true }));
  window.addEventListener('offline', () => publish({ online: false }));
  standalone.addEventListener('change', (event) => publish({ installed: event.matches }));
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
    publish({ canInstall: true });
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    publish({ installed: true, canInstall: false, busy: false });
  });
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  let controller = navigator.serviceWorker.controller;
  const handleControllerChange = (): void => {
    const next = navigator.serviceWorker.controller;
    if (next === controller) return;
    const replacing = controller !== null;
    controller = next;
    publish({ offlineReady: next !== null });
    if (updateAccepted) window.location.reload();
    else if (replacing) {
      activatedElsewhere = true;
      publish({ needRefresh: true });
    }
  };
  navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
  updateWorker = registerSW({
    immediate: true,
    onOfflineReady: () => publish({ offlineReady: true, error: null }),
    onNeedRefresh: () => publish({ needRefresh: true }),
    // Native controller changes also cover first-session updates that Workbox
    // does not classify as isUpdate. Other tabs never grant this tab consent.
    onNeedReload: handleControllerChange,
    onRegisterError: (error: unknown) => publish({
      error: error instanceof Error ? error.message : 'Offline setup failed. Reconnect and reload to retry.',
    }),
  });
}

export async function installPwa(): Promise<void> {
  if (!installPrompt || state.busy) return;
  const prompt = installPrompt;
  installPrompt = null;
  publish({ canInstall: false, busy: true, error: null });
  try {
    await prompt.prompt();
    await prompt.userChoice;
  } catch (error) {
    publish({ error: error instanceof Error ? error.message : 'Installation failed. Use your browser install menu.' });
  } finally {
    publish({ busy: false });
  }
}

export async function applyPwaUpdate(): Promise<void> {
  if (!updateWorker || !state.needRefresh || state.busy) return;
  if (activatedElsewhere) {
    window.location.reload();
    return;
  }
  updateAccepted = true;
  publish({ busy: true, error: null });
  try {
    await updateWorker();
  } catch (error) {
    updateAccepted = false;
    publish({ busy: false, error: error instanceof Error ? error.message : 'Update failed. Reconnect and try again.' });
  }
}
