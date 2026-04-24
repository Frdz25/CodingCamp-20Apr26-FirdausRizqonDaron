# Implementation Plan: To-Do List Life Dashboard

## Overview

Implement a single-page, client-side productivity dashboard using plain HTML, CSS, and Vanilla JavaScript. The app ships as `index.html` + `css/styles.css` + `js/app.js`, with all data persisted via `localStorage`. Implementation proceeds component by component, wiring everything together at the end.

## Tasks

- [x] 1. Set up project structure and persistence layer
  - Create `index.html` with semantic HTML skeleton: sections for clock, timer, task list, quick links, and theme toggle
  - Create `css/styles.css` with base styles, CSS custom properties for light/dark themes, and `[data-theme="dark"]` overrides
  - Create `js/app.js` with the `StorageKey` enum (`tld:tasks`, `tld:links`, `tld:timer`, `tld:theme`) and the `save`/`load` persistence functions wrapping `localStorage` in `try/catch`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.3_

  - [x] 1.1 Write property test for malformed localStorage fallback (P18)
    - **Property 18: Malformed localStorage data falls back to defaults without throwing**
    - **Validates: Requirements 6.5**

- [x] 2. Implement Clock & Greeting component
  - Implement `getGreeting(hour)` pure function mapping hour ranges to greeting strings
  - Implement `renderClock(now)` to format and write time (HH:MM:SS), date, and greeting to `#clock-time`, `#clock-date`, `#clock-greeting`
  - Implement `initClock()` using `setInterval` at 1000ms
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 2.1 Write property test for time formatting (P1)
    - **Property 1: Time formatting produces valid HH:MM:SS strings**
    - **Validates: Requirements 1.1**

  - [x] 2.2 Write property test for greeting correctness (P2)
    - **Property 2: Greeting is correct for every hour of the day**
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6**

- [x] 3. Implement Focus Timer component
  - Implement `TimerState` object (`configuredMinutes`, `remainingSeconds`, `isRunning`)
  - Implement `setDuration(minutes)` clamping to [1, 60] and persisting via `save`
  - Implement `startTimer()`, `stopTimer()`, `resetTimer()`, and `tickTimer()` (decrement + completion check)
  - Implement `onTimerComplete()` playing an audio alert and showing a visual notification
  - Implement `renderTimer(state)` updating `#timer-display` in MM:SS and toggling `disabled` on `#timer-increase` / `#timer-decrease` while running
  - Implement `initTimer()` loading persisted duration from `localStorage`
  - Wire start/stop/reset/increase/decrease button event listeners
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 6.3_

  - [x] 3.1 Write property test for timer display formatting (P3)
    - **Property 3: Timer display always produces valid MM:SS strings**
    - **Validates: Requirements 2.9**

  - [x] 3.2 Write property test for timer reset (P4)
    - **Property 4: Timer reset restores configured duration**
    - **Validates: Requirements 2.4**

  - [x] 3.3 Write property test for duration adjustment bounds (P5)
    - **Property 5: Duration adjustment respects bounds**
    - **Validates: Requirements 2.6, 2.7**

  - [x] 3.4 Write unit tests for timer behavior
    - Timer defaults to 25 minutes on first load (Req 2.1)
    - Timer counts down by 1 second per tick (Req 2.2)
    - Timer retains remaining time after stop (Req 2.3)
    - `onTimerComplete` is called when `remainingSeconds` reaches 0 (Req 2.5)
    - Duration controls are disabled while timer is running (Req 2.8)
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.8_

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement To-Do List component
  - Define `Task` data model (`id`, `title`, `completed`, `createdAt`)
  - Implement `addTask(title)` with empty and case-insensitive duplicate validation, returning a `Result`; persist to `tld:tasks`
  - Implement `deleteTask(id)`, `toggleTask(id)`, and `editTask(id, newTitle)` (re-runs same validation); persist after each mutation
  - Implement `sortTasks(mode)` returning a sorted view without mutating stored order (`'name'` → alphabetical A–Z, `'status'` → incomplete before complete)
  - Implement `renderTasks(tasks)` rebuilding `#task-list` DOM with complete, edit, and delete controls; show inline error in `#task-error`
  - Implement `initTasks()` loading from `tld:tasks` and rendering
  - Wire add button, sort controls, and delegated list events
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 6.1_

  - [x] 5.1 Write property test for valid task add (P6)
    - **Property 6: Adding a valid task persists it and grows the list**
    - **Validates: Requirements 3.1, 6.1**

  - [x] 5.2 Write property test for invalid task rejection (P7)
    - **Property 7: Invalid task titles are always rejected**
    - **Validates: Requirements 3.2, 3.3**

  - [x] 5.3 Write property test for toggle completion involution (P8)
    - **Property 8: Toggling task completion is an involution**
    - **Validates: Requirements 3.4**

  - [x] 5.4 Write property test for task deletion (P9)
    - **Property 9: Deleting a task removes it from state and storage**
    - **Validates: Requirements 3.7**

  - [x] 5.5 Write property test for sort by name (P10)
    - **Property 10: Sort by name produces a non-decreasing alphabetical order**
    - **Validates: Requirements 3.8**

  - [x] 5.6 Write property test for sort by status (P11)
    - **Property 11: Sort by status places all incomplete tasks before all completed tasks**
    - **Validates: Requirements 3.9**

  - [x] 5.7 Write property test for task persistence round-trip (P12)
    - **Property 12: Task persistence round-trip**
    - **Validates: Requirements 3.10**

  - [x] 5.8 Write unit tests for task UI behaviors
    - Edit control pre-fills input with current task title (Req 3.5)
    - _Requirements: 3.5_

- [x] 6. Implement Quick Links component
  - Define `QuickLink` data model (`id`, `label`, `url`)
  - Implement `addLink(label, url)` with empty-field and URL-scheme validation, returning a `Result`; persist to `tld:links`
  - Implement `deleteLink(id)` removing from state and `localStorage`
  - Implement `renderLinks(links)` rebuilding `#links-panel` with clickable buttons (`target="_blank"`) and delete controls; show inline error in `#link-error`
  - Implement `initLinks()` loading from `tld:links` and rendering
  - Wire add button and delegated panel events
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 6.2_

  - [x] 6.1 Write property test for valid link add (P13)
    - **Property 13: Adding a valid Quick Link persists it**
    - **Validates: Requirements 4.1, 6.2**

  - [x] 6.2 Write property test for invalid link rejection (P14)
    - **Property 14: Invalid Quick Link submissions are always rejected**
    - **Validates: Requirements 4.2, 4.3**

  - [x] 6.3 Write property test for link deletion (P15)
    - **Property 15: Deleting a Quick Link removes it from state and storage**
    - **Validates: Requirements 4.5**

  - [x] 6.4 Write property test for links persistence round-trip (P16)
    - **Property 16: Quick Links persistence round-trip**
    - **Validates: Requirements 4.6**

  - [x] 6.5 Write unit tests for Quick Links UI behaviors
    - Quick Link opens in new tab (`target="_blank"`) (Req 4.4)
    - _Requirements: 4.4_

- [x] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement Theme Toggle component
  - Implement `applyTheme(theme)` adding/removing `data-theme="dark"` on `<html>`
  - Implement `toggleTheme()` flipping the current theme and persisting to `tld:theme`
  - Implement `initTheme()` reading `tld:theme` from `localStorage` and calling `applyTheme` before first paint (place call in `<head>` or at top of script)
  - Wire `#theme-toggle` click event
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.4_

  - [x] 8.1 Write property test for theme toggle involution (P17)
    - **Property 17: Theme toggle is an involution**
    - **Validates: Requirements 5.3, 5.4**

  - [x] 8.2 Write unit tests for theme behaviors
    - Theme toggle control exists in DOM (Req 5.1)
    - Dark mode toggle applies `data-theme="dark"` to `<html>` (Req 5.2)
    - `initTheme` applies persisted theme on load (Req 5.5)
    - _Requirements: 5.1, 5.2, 5.5_

- [x] 9. Set up test infrastructure and wire all components
  - Create `package.json` with `vitest` and `fast-check` as dev dependencies
  - Create test files: `tests/clock.test.js`, `tests/timer.test.js`, `tests/tasks.test.js`, `tests/links.test.js`, `tests/theme.test.js`, `tests/storage.test.js`
  - Call `initTheme()`, `initClock()`, `initTimer()`, `initTasks()`, and `initLinks()` from a single `DOMContentLoaded` handler in `app.js`
  - Verify storage keys are correctly namespaced (`tld:tasks`, `tld:links`, `tld:timer`, `tld:theme`)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.3, 7.4_

  - [x] 9.1 Write unit tests for storage key namespacing
    - Storage keys are correctly namespaced (Req 6.1–6.4)
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use **fast-check** with a minimum of 100 iterations per property
- Run tests with `npx vitest --run` (single pass, no watch mode)
- The persistence layer (`save`/`load`) must be implemented before any component that uses it
