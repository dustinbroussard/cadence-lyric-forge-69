export const STATE_VERSION = 1;

type Stored<T> = { v: number; data: T };

export function loadState<T>(key = 'cadence_state'): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored<T>;
    if (parsed.v !== STATE_VERSION) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function saveState<T>(state: T, key = 'cadence_state') {
  const stored: Stored<T> = { v: STATE_VERSION, data: state };
  localStorage.setItem(key, JSON.stringify(stored));
}

let timeout: number | undefined;
export function saveStateThrottled<T>(state: T, key = 'cadence_state', wait = 400) {
  if (timeout) window.clearTimeout(timeout);
  timeout = window.setTimeout(() => {
    const run = () => saveState(state, key);
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(run);
    } else {
      run();
    }
  }, wait);
}

export function migrate<T>(_old: unknown): T | null {
  return null;
}
