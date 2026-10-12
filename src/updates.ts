interface Callbacks {
  available(version: string, deferred: boolean): void;
  cleared(): void;
  prepare(): boolean;
  applying(active: boolean): void;
  error(message: string): void;
  reload(): void;
}
const deferKey = 'quiet-sudoku-deferred-update';
function versionOf(worker: ServiceWorker): Promise<string> {
  return new Promise(resolve => {
    const channel = new MessageChannel();
    const finish = (version: string) => { clearTimeout(timer); channel.port1.close(); resolve(version); };
    const timer = window.setTimeout(() => finish('unversioned'), 1500);
    channel.port1.onmessage = event => finish(typeof event.data?.version === 'string' ? event.data.version : 'unversioned');
    try { worker.postMessage('GET_VERSION', [channel.port2]); }
    catch { finish('unversioned'); }
  });
}
export function watchUpdates(registration: ServiceWorkerRegistration, callbacks: Callbacks) {
  let offered: ServiceWorker | null = null;
  let pendingVersion: string | null = null;
  let deferredVersion: string | null = null;
  let checking: ServiceWorker | null = null;
  let requested = false;
  let activationTimer = 0;
  try { deferredVersion = localStorage.getItem(deferKey); } catch { /* In-memory deferral still works. */ }
  const checkWaiting = async () => {
    const worker = registration.waiting;
    if (!worker) {
      if (offered && !requested) { offered = null; pendingVersion = null; callbacks.cleared(); }
      return;
    }
    // An initial installation is not an update of an existing app.
    if (!navigator.serviceWorker.controller || worker === offered || worker === checking || requested) return;
    checking = worker;
    const version = await versionOf(worker);
    if (checking === worker) checking = null;
    if (registration.waiting !== worker) return;
    offered = worker; pendingVersion = version;
    callbacks.available(version, version === deferredVersion);
  };
  const observe = () => {
    const worker = registration.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' || worker.state === 'redundant') window.setTimeout(() => void checkWaiting(), 0);
    });
  };
  const refresh = () => {
    if (navigator.onLine && !document.hidden && !requested) void registration.update().catch(() => {});
    void checkWaiting();
  };
  const controllerChanged = () => {
    if (requested) {
      clearTimeout(activationTimer);
      try { localStorage.removeItem(deferKey); } catch { /* Optional preference. */ }
      callbacks.reload();
    } else void checkWaiting();
  };
  registration.addEventListener('updatefound', observe);
  navigator.serviceWorker.addEventListener('controllerchange', controllerChanged);
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('online', refresh);
  const interval = window.setInterval(refresh, 5 * 60 * 1000);
  observe(); void checkWaiting();
  return {
    defer() {
      if (!pendingVersion) return;
      deferredVersion = pendingVersion;
      try { localStorage.setItem(deferKey, pendingVersion); } catch { /* Retain the choice for this session. */ }
    },
    apply() {
      const worker = registration.waiting;
      if (requested) return;
      if (!worker) { callbacks.cleared(); return; }
      if (!callbacks.prepare()) {
        callbacks.error('Dein Spielstand konnte nicht gespeichert werden. Bitte aktualisiere später.');
        return;
      }
      requested = true; callbacks.applying(true);
      activationTimer = window.setTimeout(() => {
        requested = false; callbacks.applying(false);
        callbacks.error('Das Update konnte nicht aktiviert werden. Bitte versuche es erneut.');
      }, 15000);
      try { worker.postMessage('ACTIVATE'); }
      catch {
        clearTimeout(activationTimer); requested = false; callbacks.applying(false);
        callbacks.error('Das Update konnte nicht aktiviert werden. Bitte versuche es erneut.');
      }
    },
    dispose() {
      clearInterval(interval); clearTimeout(activationTimer);
      registration.removeEventListener('updatefound', observe);
      navigator.serviceWorker.removeEventListener('controllerchange', controllerChanged);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('online', refresh);
    },
  };
}
