// @vitest-environment jsdom
// Feature: todo-life-dashboard, Property 13: Adding a valid Quick Link persists it
// Feature: todo-life-dashboard, Property 14: Invalid Quick Link submissions are always rejected
// Feature: todo-life-dashboard, Property 15: Deleting a Quick Link removes it from state and storage
// Feature: todo-life-dashboard, Property 16: Quick Links persistence round-trip

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  addLink,
  deleteLink,
  renderLinks,
  initLinks,
  links,
  _resetLinks,
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

/** Arbitrary for a valid URL starting with http:// or https:// */
const validUrlArbitrary = fc.oneof(
  fc.webUrl({ validSchemes: ['http', 'https'] }),
  fc.string({ minLength: 1 }).map((s) => `https://${s.replace(/\s/g, '-')}`)
).filter((u) => u.startsWith('http://') || u.startsWith('https://'));

/** Arbitrary for a valid quick link object */
const linkArbitrary = fc.record({
  id: fc.uuid(),
  label: fc.string({ minLength: 1 }).map((s) => s.trim()).filter((s) => s.length > 0),
  url: validUrlArbitrary,
});

// ─── Setup ────────────────────────────────────────────────────────────────────

let mockStorage;

beforeEach(() => {
  mockStorage = makeLocalStorageMock();
  vi.stubGlobal('localStorage', mockStorage);
  _resetLinks();
  document.body.innerHTML = `
    <input id="link-label-input" type="text" />
    <input id="link-url-input" type="url" />
    <button id="link-add-btn">Add</button>
    <p id="link-error"></p>
    <div id="links-panel"></div>
  `;
});

// ─── Property 13 ─────────────────────────────────────────────────────────────
// Validates: Requirements 4.1, 6.2

describe('P13 – Adding a valid Quick Link persists it', () => {
  it('addLink with valid label and http/https URL grows the list by 1 and persists to localStorage', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).map((s) => s.trim()).filter((s) => s.length > 0),
        validUrlArbitrary,
        (label, url) => {
          _resetLinks();
          mockStorage.clear();

          const before = links.length;
          const result = addLink(label, url);

          expect(result.ok).toBe(true);
          expect(links.length).toBe(before + 1);

          // Verify persisted to localStorage
          const stored = JSON.parse(mockStorage.getItem(StorageKey.LINKS));
          expect(Array.isArray(stored)).toBe(true);
          expect(stored.some((l) => l.label === label.trim() && l.url === url.trim())).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 14 ─────────────────────────────────────────────────────────────
// Validates: Requirements 4.2, 4.3

describe('P14 – Invalid Quick Link submissions are always rejected', () => {
  it('empty/whitespace label is rejected and leaves the list unchanged', () => {
    const whitespaceOnly = fc.string({ minLength: 0 }).filter((s) => s.trim() === '');

    fc.assert(
      fc.property(whitespaceOnly, validUrlArbitrary, (label, url) => {
        _resetLinks();
        mockStorage.clear();

        const before = links.length;
        const result = addLink(label, url);

        expect(result.ok).toBe(false);
        expect(result.error).toBe('Link label cannot be empty.');
        expect(links.length).toBe(before);
      }),
      { numRuns: 100 }
    );
  });

  it('empty/whitespace URL is rejected and leaves the list unchanged', () => {
    const whitespaceOnly = fc.string({ minLength: 0 }).filter((s) => s.trim() === '');

    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).map((s) => s.trim()).filter((s) => s.length > 0),
        whitespaceOnly,
        (label, url) => {
          _resetLinks();
          mockStorage.clear();

          const before = links.length;
          const result = addLink(label, url);

          expect(result.ok).toBe(false);
          expect(result.error).toBe('Link URL cannot be empty.');
          expect(links.length).toBe(before);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('URL not starting with http:// or https:// is rejected and leaves the list unchanged', () => {
    // URLs that don't start with http:// or https://
    const invalidUrlArbitrary = fc
      .string({ minLength: 1 })
      .filter((s) => s.trim().length > 0 && !s.trim().startsWith('http://') && !s.trim().startsWith('https://'));

    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).map((s) => s.trim()).filter((s) => s.length > 0),
        invalidUrlArbitrary,
        (label, url) => {
          _resetLinks();
          mockStorage.clear();

          const before = links.length;
          const result = addLink(label, url);

          expect(result.ok).toBe(false);
          expect(result.error).toBe('URL must start with http:// or https://.');
          expect(links.length).toBe(before);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 15 ─────────────────────────────────────────────────────────────
// Validates: Requirements 4.5

describe('P15 – Deleting a Quick Link removes it from state and storage', () => {
  it('deleteLink removes the link from in-memory list and localStorage', () => {
    fc.assert(
      fc.property(fc.array(linkArbitrary, { minLength: 1, maxLength: 20 }), (linkArr) => {
        _resetLinks();
        mockStorage.clear();

        save(StorageKey.LINKS, linkArr);
        initLinks();

        // Pick the first link to delete
        const target = links[0];
        const targetId = target.id;

        deleteLink(targetId);

        // Not in in-memory list
        expect(links.find((l) => l.id === targetId)).toBeUndefined();

        // Not in localStorage
        const stored = JSON.parse(mockStorage.getItem(StorageKey.LINKS));
        expect(stored.find((l) => l.id === targetId)).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 16 ─────────────────────────────────────────────────────────────
// Validates: Requirements 4.6

describe('P16 – Quick Links persistence round-trip', () => {
  it('initLinks restores a deeply equal array from localStorage', () => {
    fc.assert(
      fc.property(fc.array(linkArbitrary, { minLength: 0, maxLength: 20 }), (linkArr) => {
        _resetLinks();
        mockStorage.clear();

        // Save directly to localStorage
        save(StorageKey.LINKS, linkArr);

        // Load via initLinks
        initLinks();

        expect(links.length).toBe(linkArr.length);
        for (let i = 0; i < linkArr.length; i++) {
          expect(links[i].id).toBe(linkArr[i].id);
          expect(links[i].label).toBe(linkArr[i].label);
          expect(links[i].url).toBe(linkArr[i].url);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('Quick Links UI unit tests', () => {
  // Req 4.4 – Quick Link opens in new tab (target="_blank")
  it('rendered link button has target="_blank" and rel="noopener noreferrer"', () => {
    _resetLinks();
    mockStorage.clear();

    const seedArr = [{
      id: 'link-test-id',
      label: 'Example',
      url: 'https://example.com',
    }];
    save(StorageKey.LINKS, seedArr);
    initLinks();

    const linkEl = document.querySelector('a.link-btn');
    expect(linkEl).not.toBeNull();
    expect(linkEl.getAttribute('target')).toBe('_blank');
    expect(linkEl.getAttribute('rel')).toBe('noopener noreferrer');
    expect(linkEl.getAttribute('href')).toBe('https://example.com');
    expect(linkEl.textContent).toBe('Example');
  });
});
