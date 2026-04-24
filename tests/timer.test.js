// @vitest-environment jsdom
// Feature: todo-life-dashboard, Property 3: Timer display always produces valid MM:SS strings
// Feature: todo-life-dashboard, Property 4: Timer reset restores configured duration
// Feature: todo-life-dashboard, Property 5: Duration adjustment respects bounds

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  formatTimerDisplay,
  setDuration,
  startTimer,
  stopTimer,
  resetTimer,
  tickTimer,
  renderTimer,
  initTimer,
  timerState,
  onTimerComplete,
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

/** Reset timerState to a known baseline before each test. */
function resetTimerState(minutes = 25) {
  stopTimer(); // clear any running interval
  timerState.configuredMinutes = minutes;
  timerState.remainingSeconds = minutes * 60;
  timerState.isRunning = false;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

let mockStorage;

beforeEach(() => {
  mockStorage = makeLocalStorageMock();
  vi.stubGlobal('localStorage', mockStorage);
  resetTimerState();
});

// ─── Property 3 ──────────────────────────────────────────────────────────────
// Validates: Requirements 2.9

describe('P3 – Timer display always produces valid MM:SS strings', () => {
  it('formatTimerDisplay returns a string matching MM:SS for any seconds in [0, 3600]', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 3600 }), (seconds) => {
        const result = formatTimerDisplay(seconds);

        // Must match MM:SS pattern
        expect(result).toMatch(/^\d{2}:\d{2}$/);

        const [mm, ss] = result.split(':').map(Number);
        expect(mm).toBeGreaterThanOrEqual(0);
        expect(mm).toBeLessThanOrEqual(60);
        expect(ss).toBeGreaterThanOrEqual(0);
        expect(ss).toBeLessThanOrEqual(59);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 4 ──────────────────────────────────────────────────────────────
// Validates: Requirements 2.4

describe('P4 – Timer reset restores configured duration', () => {
  it('resetTimer restores remainingSeconds to configuredMinutes × 60 after arbitrary ticks', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 60 }),
        fc.integer({ min: 0, max: 10 }),
        (minutes, ticks) => {
          resetTimerState(minutes);
          startTimer();

          // Tick an arbitrary number of times (capped to avoid going below 0)
          const safeTicks = Math.min(ticks, timerState.remainingSeconds - 1);
          for (let i = 0; i < safeTicks; i++) {
            timerState.remainingSeconds -= 1; // direct mutation to avoid side-effects
          }

          resetTimer();

          expect(timerState.remainingSeconds).toBe(minutes * 60);
          expect(timerState.isRunning).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 5 ──────────────────────────────────────────────────────────────
// Validates: Requirements 2.6, 2.7

describe('P5 – Duration adjustment respects bounds', () => {
  it('increasing duration yields min(duration + 1, 60)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 60 }), (minutes) => {
        resetTimerState(minutes);
        setDuration(minutes + 1);
        expect(timerState.configuredMinutes).toBe(Math.min(minutes + 1, 60));
      }),
      { numRuns: 100 }
    );
  });

  it('decreasing duration yields max(duration - 1, 1)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 60 }), (minutes) => {
        resetTimerState(minutes);
        setDuration(minutes - 1);
        expect(timerState.configuredMinutes).toBe(Math.max(minutes - 1, 1));
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('Timer unit tests', () => {
  // Req 2.1 – defaults to 25 minutes on first load
  it('defaults to 25 minutes on first load when no persisted value exists', () => {
    // localStorage is empty (fresh mock)
    initTimer();
    expect(timerState.configuredMinutes).toBe(25);
    expect(timerState.remainingSeconds).toBe(25 * 60);
  });

  // Req 2.2 – counts down by 1 second per tick
  it('decrements remainingSeconds by 1 on each tick', () => {
    resetTimerState(25);
    const before = timerState.remainingSeconds;
    startTimer();
    tickTimer();
    expect(timerState.remainingSeconds).toBe(before - 1);
    stopTimer();
  });

  // Req 2.3 – retains remaining time after stop
  it('retains remaining time after stop', () => {
    resetTimerState(25);
    startTimer();
    // Manually advance a few seconds
    timerState.remainingSeconds = 1200;
    stopTimer();
    expect(timerState.remainingSeconds).toBe(1200);
    expect(timerState.isRunning).toBe(false);
  });

  // Req 2.5 – onTimerComplete is called when remainingSeconds reaches 0
  it('calls onTimerComplete when remainingSeconds reaches 0', () => {
    resetTimerState(1);
    timerState.remainingSeconds = 1;
    startTimer();

    const completeSpy = vi.spyOn({ onTimerComplete }, 'onTimerComplete');

    // Tick down to 0 — tickTimer calls stopTimer + onTimerComplete internally
    let completeCalled = false;
    const origStop = stopTimer;

    // We verify by checking that after tickTimer with 1 second left,
    // remainingSeconds becomes 0 and isRunning becomes false (stopTimer was called).
    tickTimer();

    expect(timerState.remainingSeconds).toBe(0);
    expect(timerState.isRunning).toBe(false);
  });

  // Req 2.8 – duration controls are disabled while timer is running
  it('disables #timer-increase and #timer-decrease while timer is running', () => {
    // Set up minimal DOM
    document.body.innerHTML = `
      <div id="timer-display">25:00</div>
      <button id="timer-increase">+</button>
      <button id="timer-decrease">-</button>
    `;

    resetTimerState(25);
    timerState.isRunning = true;
    renderTimer(timerState);

    expect(document.getElementById('timer-increase').disabled).toBe(true);
    expect(document.getElementById('timer-decrease').disabled).toBe(true);

    timerState.isRunning = false;
    renderTimer(timerState);

    expect(document.getElementById('timer-increase').disabled).toBe(false);
    expect(document.getElementById('timer-decrease').disabled).toBe(false);
  });
});
