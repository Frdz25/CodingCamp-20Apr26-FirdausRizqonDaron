// @vitest-environment jsdom
// Feature: todo-life-dashboard, Property 17: Theme toggle is an involution

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  applyTheme,
  toggleTheme,
  initTheme,
  StorageKey,
  save,
  load,
} from '../js/app.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeLocalStorageMock() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
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
  // Reset html element to no theme attribute
  document.documentElement.removeAttribute('data-theme');
  // Reset DOM
  document.body.innerHTML = `<button id="theme-toggle" aria-label="Toggle dark mode">🌙</button>`;
});

// ─── Property 17 ─────────────────────────────────────────────────────────────
// Validates: Requirements 5.3, 5.4

describe('P17 – Theme toggle is an involution', () => {
  it('calling toggleTheme twice returns html to its original data-theme and each intermediate state is persisted', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark'),
        (initialTheme) => {
          // Set up initial state
          applyTheme(initialTheme);
          save(StorageKey.THEME, initialTheme);

          // Record original attribute value
          const originalAttr = document.documentElement.getAttribute('data-theme');

          // First toggle
          toggleTheme();
          const afterFirst = document.documentElement.getAttribute('data-theme');
          const persistedAfterFirst = load(StorageKey.THEME, null);

          // The intermediate theme should be the opposite
          const expectedIntermediate = initialTheme === 'dark' ? null : 'dark';
          expect(afterFirst).toBe(expectedIntermediate);

          // Intermediate state must be persisted
          const expectedPersistedIntermediate = initialTheme === 'dark' ? 'light' : 'dark';
          expect(persistedAfterFirst).toBe(expectedPersistedIntermediate);

          // Second toggle — should return to original
          toggleTheme();
          const afterSecond = document.documentElement.getAttribute('data-theme');
          const persistedAfterSecond = load(StorageKey.THEME, null);

          expect(afterSecond).toBe(originalAttr);

          // Final persisted value should match original theme
          expect(persistedAfterSecond).toBe(initialTheme);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('Theme unit tests', () => {
  // Req 5.1 – Theme toggle control exists in DOM
  it('theme toggle button exists in the DOM', () => {
    const btn = document.getElementById('theme-toggle');
    expect(btn).not.toBeNull();
  });

  // Req 5.2 – Dark mode toggle applies data-theme="dark" to <html>
  it('applyTheme("dark") sets data-theme="dark" on <html>', () => {
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('applyTheme("light") removes data-theme attribute from <html>', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    applyTheme('light');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  // Req 5.5 – initTheme applies persisted theme on load
  it('initTheme applies persisted "dark" theme from localStorage', () => {
    mockStorage.setItem(StorageKey.THEME, JSON.stringify('dark'));
    document.documentElement.removeAttribute('data-theme');

    initTheme();

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('initTheme applies "light" theme (no attribute) when localStorage has "light"', () => {
    mockStorage.setItem(StorageKey.THEME, JSON.stringify('light'));
    document.documentElement.setAttribute('data-theme', 'dark');

    initTheme();

    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('initTheme defaults to light theme when nothing is persisted', () => {
    mockStorage.clear();
    document.documentElement.setAttribute('data-theme', 'dark');

    initTheme();

    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});
