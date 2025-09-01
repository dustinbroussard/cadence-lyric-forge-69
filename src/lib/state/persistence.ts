export const STATE_VERSION = 1;

type Stored<T> = { v: number; data: T };

export function loadState<T>(key = 'cadence_state'): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const unknownParsed = JSON.parse(raw) as unknown;
    if (
      typeof unknownParsed === 'object' &&
      unknownParsed !== null &&
      'v' in (unknownParsed as Record<string, unknown>) &&
      'data' in (unknownParsed as Record<string, unknown>)
    ) {
      const parsed = unknownParsed as Stored<T>;
      if (parsed.v !== STATE_VERSION) {
        // Allow migration hook to attempt conversion
        const migrated = migrate<T>(parsed.data);
        return migrated;
      }
      return parsed.data;
    }
    // Legacy unversioned payload; treat as data directly
    return unknownParsed as T;
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
      const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
      w.requestIdleCallback?.(run);
    } else {
      run();
    }
  }, wait);
}

export function migrate<T>(_old: unknown): T | null {
  return null;
}
