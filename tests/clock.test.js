// Feature: todo-life-dashboard, Property 1: Time formatting produces valid HH:MM:SS strings
// Feature: todo-life-dashboard, Property 2: Greeting is correct for every hour of the day

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatTime, getGreeting } from '../js/app.js';

// ─── Property 1 ──────────────────────────────────────────────────────────────
// Validates: Requirements 1.1

describe('P1 – Time formatting produces valid HH:MM:SS strings', () => {
  it('formatTime returns a string matching HH:MM:SS for any Date', () => {
    fc.assert(
      fc.property(fc.date(), (date) => {
        const result = formatTime(date);

        // Must match HH:MM:SS pattern
        expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);

        const [hh, mm, ss] = result.split(':').map(Number);
        expect(hh).toBeGreaterThanOrEqual(0);
        expect(hh).toBeLessThanOrEqual(23);
        expect(mm).toBeGreaterThanOrEqual(0);
        expect(mm).toBeLessThanOrEqual(59);
        expect(ss).toBeGreaterThanOrEqual(0);
        expect(ss).toBeLessThanOrEqual(59);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 2 ──────────────────────────────────────────────────────────────
// Validates: Requirements 1.3, 1.4, 1.5, 1.6

describe('P2 – Greeting is correct for every hour of the day', () => {
  const VALID_GREETINGS = ['Good Morning', 'Good Afternoon', 'Good Evening', 'Good Night'];

  it('getGreeting returns one of the four valid greetings for any hour in [0, 23]', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 23 }), (hour) => {
        const greeting = getGreeting(hour);
        expect(VALID_GREETINGS).toContain(greeting);
      }),
      { numRuns: 100 }
    );
  });

  it('getGreeting maps each hour to the correct greeting range', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 23 }), (hour) => {
        const greeting = getGreeting(hour);

        if (hour >= 5 && hour <= 11) {
          expect(greeting).toBe('Good Morning');
        } else if (hour >= 12 && hour <= 17) {
          expect(greeting).toBe('Good Afternoon');
        } else if (hour >= 18 && hour <= 20) {
          expect(greeting).toBe('Good Evening');
        } else {
          // hours 0–4 and 21–23
          expect(greeting).toBe('Good Night');
        }
      }),
      { numRuns: 100 }
    );
  });
});
