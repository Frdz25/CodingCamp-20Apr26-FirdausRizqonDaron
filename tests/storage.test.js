// Feature: todo-life-dashboard, Property 18: Malformed localStorage data falls back to defaults without throwing

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { load, save, StorageKey } from '../js/app.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** A simple in-memory localStorage mock. */
function makeLocalStorageMock() {
  const store = new Map();
  return {
    getItem: (key) => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    _store: store,
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

let mockStorage;

beforeEach(() => {
  mockStorage = makeLocalStorageMock();
  vi.stubGlobal('localStorage', mockStorage);
});

// ─── Property 18 ─────────────────────────────────────────────────────────────
// Validates: Requirements 6.5

describe('P18 – Malformed localStorage data falls back to defaults without throwing', () => {
  it('returns fallback for any non-JSON string stored in localStorage', () => {
    // Arbitrary: strings that are NOT valid JSON
    const nonJsonString = fc.string().filter((s) => {
      try { JSON.parse(s); return false; } catch { return true; }
    });

    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(StorageKey)),
        nonJsonString,
        fc.anything(),
        (key, malformed, fallback) => {
          // Manually inject malformed data bypassing save()
          mockStorage.setItem(key, malformed);

          let result;
          expect(() => {
            result = load(key, fallback);
          }).not.toThrow();

          expect(result).toBe(fallback);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns fallback when localStorage.getItem throws', () => {
    const throwingStorage = {
      getItem: () => { throw new Error('Storage unavailable'); },
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    };
    vi.stubGlobal('localStorage', throwingStorage);

    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(StorageKey)),
        fc.anything(),
        (key, fallback) => {
          let result;
          expect(() => {
            result = load(key, fallback);
          }).not.toThrow();

          expect(result).toBe(fallback);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('save() does not throw when localStorage.setItem throws', () => {
    const throwingStorage = {
      getItem: () => null,
      setItem: () => { throw new Error('Quota exceeded'); },
      removeItem: () => {},
      clear: () => {},
    };
    vi.stubGlobal('localStorage', throwingStorage);

    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(StorageKey)),
        fc.anything(),
        (key, value) => {
          expect(() => save(key, value)).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Storage key namespacing (unit) ──────────────────────────────────────────

describe('StorageKey values are correctly namespaced', () => {
  it('has the expected tld: prefix for all keys', () => {
    expect(StorageKey.TASKS).toBe('tld:tasks');
    expect(StorageKey.LINKS).toBe('tld:links');
    expect(StorageKey.TIMER_DURATION).toBe('tld:timer');
    expect(StorageKey.THEME).toBe('tld:theme');
  });
});
