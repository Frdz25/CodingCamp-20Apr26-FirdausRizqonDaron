// @vitest-environment jsdom
// Feature: todo-life-dashboard, Property 6: Adding a valid task persists it and grows the list
// Feature: todo-life-dashboard, Property 7: Invalid task titles are always rejected
// Feature: todo-life-dashboard, Property 8: Toggling task completion is an involution
// Feature: todo-life-dashboard, Property 9: Deleting a task removes it from state and storage
// Feature: todo-life-dashboard, Property 10: Sort by name produces a non-decreasing alphabetical order
// Feature: todo-life-dashboard, Property 11: Sort by status places all incomplete tasks before all completed tasks
// Feature: todo-life-dashboard, Property 12: Task persistence round-trip

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  addTask,
  deleteTask,
  toggleTask,
  editTask,
  sortTasks,
  initTasks,
  renderTasks,
  tasks,
  _resetTasks,
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

/** Arbitrary for a valid task object (already in the tasks array shape). */
const taskArbitrary = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1 }).map((s) => s.trim()).filter((s) => s.length > 0),
  completed: fc.boolean(),
  createdAt: fc.integer({ min: 0 }),
});

/**
 * Build a list of tasks with unique titles (case-insensitive) so they can be
 * loaded into the module state without violating the duplicate constraint.
 */
const uniqueTitleTasksArbitrary = fc
  .array(taskArbitrary, { minLength: 0, maxLength: 20 })
  .map((arr) => {
    const seen = new Set();
    return arr.filter((t) => {
      const key = t.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

/** Seed the module-level tasks array directly for testing. */
function seedTasks(arr) {
  _resetTasks();
  // Push directly into the exported array reference via addTask bypass:
  // We need to mutate the module's tasks array. Since tasks is exported as `let`,
  // we use the save/load round-trip via initTasks.
  save(StorageKey.TASKS, arr);
  initTasks();
}

// ─── Setup ────────────────────────────────────────────────────────────────────

let mockStorage;

beforeEach(() => {
  mockStorage = makeLocalStorageMock();
  vi.stubGlobal('localStorage', mockStorage);
  _resetTasks();
  // Minimal DOM for task list
  document.body.innerHTML = `
    <input id="task-input" type="text" />
    <button id="task-add-btn">Add</button>
    <p id="task-error"></p>
    <button id="task-sort-name">Sort by Name</button>
    <button id="task-sort-status">Sort by Status</button>
    <ul id="task-list"></ul>
  `;
});

// ─── Property 6 ──────────────────────────────────────────────────────────────
// Validates: Requirements 3.1, 6.1

describe('P6 – Adding a valid task persists it and grows the list', () => {
  it('addTask with a non-empty, non-duplicate title grows the list by 1 and persists to localStorage', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).map((s) => s.trim()).filter((s) => s.length > 0),
        (title) => {
          _resetTasks();
          mockStorage.clear();

          const before = tasks.length; // 0
          const result = addTask(title);

          expect(result.ok).toBe(true);
          expect(tasks.length).toBe(before + 1);

          // Verify persisted to localStorage
          const stored = JSON.parse(mockStorage.getItem(StorageKey.TASKS));
          expect(Array.isArray(stored)).toBe(true);
          expect(stored.some((t) => t.title === title.trim())).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 7 ──────────────────────────────────────────────────────────────
// Validates: Requirements 3.2, 3.3

describe('P7 – Invalid task titles are always rejected', () => {
  it('whitespace-only titles are rejected and leave the list unchanged', () => {
    // Arbitrary: strings composed entirely of whitespace (at least 1 char)
    const whitespaceOnly = fc
      .string({ minLength: 1 })
      .filter((s) => s.trim() === '');

    fc.assert(
      fc.property(whitespaceOnly, (title) => {
        _resetTasks();
        mockStorage.clear();

        const before = tasks.length;
        const result = addTask(title);

        expect(result.ok).toBe(false);
        expect(result.error).toBe('Task title cannot be empty.');
        expect(tasks.length).toBe(before);

        // localStorage should not have been written with this invalid task
        const stored = mockStorage.getItem(StorageKey.TASKS);
        if (stored !== null) {
          const parsed = JSON.parse(stored);
          expect(parsed.some((t) => t.title === title)).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('case-insensitive duplicate titles are rejected and leave the list unchanged', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).map((s) => s.trim()).filter((s) => s.length > 0),
        fc.constantFrom('', 'A', 'a', ' '), // case variation suffix (we'll use the title itself)
        (title) => {
          _resetTasks();
          mockStorage.clear();

          // Add the task once successfully
          const first = addTask(title);
          expect(first.ok).toBe(true);

          const before = tasks.length;

          // Try adding the same title in different cases
          const variants = [
            title,
            title.toUpperCase(),
            title.toLowerCase(),
          ];

          for (const variant of variants) {
            const result = addTask(variant);
            expect(result.ok).toBe(false);
            expect(result.error).toBe('A task with this title already exists.');
            expect(tasks.length).toBe(before);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 8 ──────────────────────────────────────────────────────────────
// Validates: Requirements 3.4

describe('P8 – Toggling task completion is an involution', () => {
  it('toggleTask twice returns the task to its original completion state, each state persisted', () => {
    fc.assert(
      fc.property(fc.boolean(), (initialCompleted) => {
        _resetTasks();
        mockStorage.clear();

        // Seed a task with the given initial state
        const seedArr = [{
          id: 'test-id-1',
          title: 'Test Task',
          completed: initialCompleted,
          createdAt: 0,
        }];
        save(StorageKey.TASKS, seedArr);
        initTasks();

        const task = tasks.find((t) => t.id === 'test-id-1');
        expect(task).toBeDefined();
        expect(task.completed).toBe(initialCompleted);

        // First toggle
        toggleTask('test-id-1');
        const afterFirst = tasks.find((t) => t.id === 'test-id-1');
        expect(afterFirst.completed).toBe(!initialCompleted);

        // Verify persisted after first toggle
        const stored1 = JSON.parse(mockStorage.getItem(StorageKey.TASKS));
        const persisted1 = stored1.find((t) => t.id === 'test-id-1');
        expect(persisted1.completed).toBe(!initialCompleted);

        // Second toggle — should return to original
        toggleTask('test-id-1');
        const afterSecond = tasks.find((t) => t.id === 'test-id-1');
        expect(afterSecond.completed).toBe(initialCompleted);

        // Verify persisted after second toggle
        const stored2 = JSON.parse(mockStorage.getItem(StorageKey.TASKS));
        const persisted2 = stored2.find((t) => t.id === 'test-id-1');
        expect(persisted2.completed).toBe(initialCompleted);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 9 ──────────────────────────────────────────────────────────────
// Validates: Requirements 3.7

describe('P9 – Deleting a task removes it from state and storage', () => {
  it('deleteTask removes the task from in-memory list and localStorage', () => {
    fc.assert(
      fc.property(uniqueTitleTasksArbitrary.filter((arr) => arr.length >= 1), (taskArr) => {
        _resetTasks();
        mockStorage.clear();

        save(StorageKey.TASKS, taskArr);
        initTasks();

        // Pick the first task to delete
        const target = tasks[0];
        const targetId = target.id;

        deleteTask(targetId);

        // Not in in-memory list
        expect(tasks.find((t) => t.id === targetId)).toBeUndefined();

        // Not in localStorage
        const stored = JSON.parse(mockStorage.getItem(StorageKey.TASKS));
        expect(stored.find((t) => t.id === targetId)).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 10 ─────────────────────────────────────────────────────────────
// Validates: Requirements 3.8

describe('P10 – Sort by name produces a non-decreasing alphabetical order', () => {
  it('sortTasks("name") returns tasks in case-insensitive lexicographic order', () => {
    fc.assert(
      fc.property(uniqueTitleTasksArbitrary, (taskArr) => {
        _resetTasks();
        mockStorage.clear();
        save(StorageKey.TASKS, taskArr);
        initTasks();

        const sorted = sortTasks('name');

        for (let i = 0; i < sorted.length - 1; i++) {
          const a = sorted[i].title.toLowerCase();
          const b = sorted[i + 1].title.toLowerCase();
          expect(a.localeCompare(b)).toBeLessThanOrEqual(0);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 11 ─────────────────────────────────────────────────────────────
// Validates: Requirements 3.9

describe('P11 – Sort by status places all incomplete tasks before all completed tasks', () => {
  it('sortTasks("status") returns no completed task before any incomplete task', () => {
    fc.assert(
      fc.property(uniqueTitleTasksArbitrary, (taskArr) => {
        _resetTasks();
        mockStorage.clear();
        save(StorageKey.TASKS, taskArr);
        initTasks();

        const sorted = sortTasks('status');

        let seenCompleted = false;
        for (const task of sorted) {
          if (task.completed) {
            seenCompleted = true;
          } else {
            // An incomplete task after a completed one violates the property
            expect(seenCompleted).toBe(false);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 12 ─────────────────────────────────────────────────────────────
// Validates: Requirements 3.10

describe('P12 – Task persistence round-trip', () => {
  it('initTasks restores a deeply equal array from localStorage', () => {
    fc.assert(
      fc.property(uniqueTitleTasksArbitrary, (taskArr) => {
        _resetTasks();
        mockStorage.clear();

        // Save directly to localStorage
        save(StorageKey.TASKS, taskArr);

        // Load via initTasks
        initTasks();

        expect(tasks.length).toBe(taskArr.length);
        for (let i = 0; i < taskArr.length; i++) {
          expect(tasks[i].id).toBe(taskArr[i].id);
          expect(tasks[i].title).toBe(taskArr[i].title);
          expect(tasks[i].completed).toBe(taskArr[i].completed);
          expect(tasks[i].createdAt).toBe(taskArr[i].createdAt);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('Task UI unit tests', () => {
  // Req 3.5 – Edit control pre-fills input with current task title
  it('edit control pre-fills the inline input with the current task title', () => {
    _resetTasks();
    mockStorage.clear();

    // Seed a task and init (which wires delegated events)
    const seedArr = [{
      id: 'edit-test-id',
      title: 'My Task Title',
      completed: false,
      createdAt: 0,
    }];
    save(StorageKey.TASKS, seedArr);
    initTasks();

    // Find the edit button for this task and click it
    const editBtn = document.querySelector(`[data-action="edit"][data-id="edit-test-id"]`);
    expect(editBtn).not.toBeNull();
    editBtn.click();

    // After clicking edit, an input should appear pre-filled with the task title
    const editInput = document.querySelector('.task-edit-input');
    expect(editInput).not.toBeNull();
    expect(editInput.value).toBe('My Task Title');
  });
});
