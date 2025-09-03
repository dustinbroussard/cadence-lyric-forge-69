import { describe, it, expect, beforeEach } from 'vitest';
import { loadState, STATE_VERSION } from '../src/lib/state/persistence';

// Polyfill a simple localStorage for the Node test environment
const storage: Record<string, string> = {};
const localStorageMock = {
  getItem(key: string) {
    return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
  },
  setItem(key: string, value: string) {
    storage[key] = value;
  },
  removeItem(key: string) {
    delete storage[key];
  },
  clear() {
    for (const key of Object.keys(storage)) delete storage[key];
  }
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, configurable: true });

describe('loadState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns data when version matches', () => {
    const payload = { v: STATE_VERSION, data: { foo: 'bar' } };
    localStorage.setItem('cadence_state', JSON.stringify(payload));
    expect(loadState<{ foo: string }>()).toEqual({ foo: 'bar' });
  });

  it('loads legacy unversioned data', () => {
    const legacy = { foo: 'bar' };
    localStorage.setItem('cadence_state', JSON.stringify(legacy));
    expect(loadState<{ foo: string }>()).toEqual({ foo: 'bar' });
  });

  it('returns null for mismatched version', () => {
    const payload = { v: STATE_VERSION + 1, data: { foo: 'bar' } };
    localStorage.setItem('cadence_state', JSON.stringify(payload));
    expect(loadState<{ foo: string }>()).toBeNull();
  });
});
