// ─── Persistence Layer ────────────────────────────────────────────────────────

/** Namespaced storage keys for all persisted data. */
export const StorageKey = Object.freeze({
  TASKS: 'tld:tasks',
  LINKS: 'tld:links',
  TIMER_DURATION: 'tld:timer',
  THEME: 'tld:theme',
});

/**
 * Serialize `value` to JSON and write it to localStorage under `key`.
 * Silently swallows errors (quota exceeded, storage unavailable, etc.).
 * @param {string} key
 * @param {unknown} value
 */
export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {
    // Silently ignore storage errors to prevent crashing the app.
  }
}

/**
 * Read and deserialize the value stored under `key`.
 * Returns `fallback` on any error (missing key, malformed JSON, wrong type).
 * @template T
 * @param {string} key
 * @param {T} fallback
 * @returns {T}
 */
export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

// ─── App Initialisation ───────────────────────────────────────────────────────

if (typeof document !== 'undefined') {
  // Apply theme before first paint to prevent flash of wrong theme.
  initTheme();

  document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initTimer();
    initTasks();
    initLinks();
  });
}

// ─── Clock & Greeting Component ───────────────────────────────────────────────

/**
 * Zero-pad a number to at least 2 digits.
 * @param {number} n
 * @returns {string}
 */
function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Format a Date object as HH:MM:SS (zero-padded, 24-hour).
 * @param {Date} now
 * @returns {string}
 */
export function formatTime(now) {
  return `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
}

/**
 * Return the appropriate greeting string for the given hour (0–23).
 * - 05–11 → "Good Morning"
 * - 12–17 → "Good Afternoon"
 * - 18–20 → "Good Evening"
 * - 21–04 → "Good Night"
 * @param {number} hour  Integer in [0, 23]
 * @returns {string}
 */
export function getGreeting(hour) {
  if (hour >= 5 && hour <= 11) return 'Good Morning';
  if (hour >= 12 && hour <= 17) return 'Good Afternoon';
  if (hour >= 18 && hour <= 20) return 'Good Evening';
  return 'Good Night';
}

/**
 * Update the clock DOM elements with the current time, date, and greeting.
 * Guards against non-browser environments.
 * @param {Date} now
 */
export function renderClock(now) {
  if (typeof document === 'undefined') return;

  const timeEl = document.getElementById('clock-time');
  const dateEl = document.getElementById('clock-date');
  const greetingEl = document.getElementById('clock-greeting');

  if (timeEl) timeEl.textContent = formatTime(now);
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  if (greetingEl) greetingEl.textContent = getGreeting(now.getHours());
}

/**
 * Start the clock, updating every second.
 */
export function initClock() {
  renderClock(new Date());
  setInterval(() => renderClock(new Date()), 1000);
}

// ─── Focus Timer Component ────────────────────────────────────────────────────

const DEFAULT_TIMER_MINUTES = 25;

/**
 * Single source of truth for the timer's runtime state.
 * `configuredMinutes` is persisted; the rest is runtime-only.
 */
export const timerState = {
  configuredMinutes: DEFAULT_TIMER_MINUTES,
  remainingSeconds: DEFAULT_TIMER_MINUTES * 60,
  isRunning: false,
};

/** Handle returned by setInterval; null when the timer is not running. */
let _timerInterval = null;

/**
 * Format a number of seconds as a MM:SS string.
 * @param {number} totalSeconds  Integer in [0, 3600]
 * @returns {string}  e.g. "25:00", "01:05"
 */
export function formatTimerDisplay(totalSeconds) {
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/**
 * Validate and set the configured duration, clamping to [1, 60].
 * Persists the new value and re-renders.
 * @param {number} minutes
 */
export function setDuration(minutes) {
  const clamped = Math.max(1, Math.min(60, minutes));
  timerState.configuredMinutes = clamped;
  timerState.remainingSeconds = clamped * 60;
  save(StorageKey.TIMER_DURATION, clamped);
  renderTimer(timerState);
}

/**
 * Update the #timer-display element and toggle disabled state on
 * #timer-increase / #timer-decrease based on whether the timer is running.
 * @param {{ configuredMinutes: number, remainingSeconds: number, isRunning: boolean }} state
 */
export function renderTimer(state) {
  if (typeof document === 'undefined') return;

  const display = document.getElementById('timer-display');
  const increase = document.getElementById('timer-increase');
  const decrease = document.getElementById('timer-decrease');

  if (display) display.textContent = formatTimerDisplay(state.remainingSeconds);
  if (increase) increase.disabled = state.isRunning;
  if (decrease) decrease.disabled = state.isRunning;
}

/**
 * Called when the timer reaches 00:00.
 * Plays an audio alert (best-effort) and shows a visual notification.
 */
export function onTimerComplete() {
  // Best-effort audio alert — silently ignored if autoplay is blocked.
  try {
    // Short 440 Hz beep via Web Audio API
    if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
      const AudioCtx = typeof AudioContext !== 'undefined' ? AudioContext : webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1);
    }
  } catch (_) {
    // Silently ignore audio errors.
  }

  // Visual notification — use a DOM banner if available, otherwise alert().
  if (typeof document !== 'undefined') {
    const display = document.getElementById('timer-display');
    if (display) {
      display.setAttribute('data-complete', 'true');
      setTimeout(() => display.removeAttribute('data-complete'), 3000);
    } else {
      // Fallback for environments without the expected DOM.
      alert('Focus session complete!');
    }
  }
}

/**
 * Decrement remainingSeconds by 1 and check for completion.
 * Should be called by the interval handler.
 */
export function tickTimer() {
  if (timerState.remainingSeconds > 0) {
    timerState.remainingSeconds -= 1;
    renderTimer(timerState);
  }
  if (timerState.remainingSeconds === 0) {
    stopTimer();
    onTimerComplete();
  }
}

/** Begin the countdown interval. */
export function startTimer() {
  if (timerState.isRunning) return;
  timerState.isRunning = true;
  renderTimer(timerState);
  _timerInterval = setInterval(tickTimer, 1000);
}

/** Pause the countdown, retaining remaining time. */
export function stopTimer() {
  if (_timerInterval !== null) {
    clearInterval(_timerInterval);
    _timerInterval = null;
  }
  timerState.isRunning = false;
  renderTimer(timerState);
}

/** Restore remaining time to the configured duration. */
export function resetTimer() {
  stopTimer();
  timerState.remainingSeconds = timerState.configuredMinutes * 60;
  renderTimer(timerState);
}

/**
 * Load persisted duration from localStorage, set up initial state,
 * render the timer, and wire button event listeners.
 */
export function initTimer() {
  const persisted = load(StorageKey.TIMER_DURATION, DEFAULT_TIMER_MINUTES);
  const minutes = Math.max(1, Math.min(60, typeof persisted === 'number' ? persisted : DEFAULT_TIMER_MINUTES));
  timerState.configuredMinutes = minutes;
  timerState.remainingSeconds = minutes * 60;
  timerState.isRunning = false;

  renderTimer(timerState);

  if (typeof document === 'undefined') return;

  const startBtn = document.getElementById('timer-start');
  const stopBtn = document.getElementById('timer-stop');
  const resetBtn = document.getElementById('timer-reset');
  const increaseBtn = document.getElementById('timer-increase');
  const decreaseBtn = document.getElementById('timer-decrease');

  if (startBtn) startBtn.addEventListener('click', startTimer);
  if (stopBtn) stopBtn.addEventListener('click', stopTimer);
  if (resetBtn) resetBtn.addEventListener('click', resetTimer);
  if (increaseBtn) increaseBtn.addEventListener('click', () => setDuration(timerState.configuredMinutes + 1));
  if (decreaseBtn) decreaseBtn.addEventListener('click', () => setDuration(timerState.configuredMinutes - 1));
}

// ─── To-Do List Component ─────────────────────────────────────────────────────

/**
 * Module-level single source of truth for all tasks.
 * @type {Array<{id: string, title: string, completed: boolean, createdAt: number}>}
 */
export let tasks = [];

/**
 * Reset the tasks array (used by tests to isolate state between runs).
 */
export function _resetTasks() {
  tasks = [];
}

/**
 * Generate a simple unique ID based on timestamp + random suffix.
 * @returns {string}
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Add a new task with the given title.
 * Validates: non-empty (after trim) and case-insensitive uniqueness.
 * Persists to localStorage on success.
 * @param {string} title
 * @returns {{ ok: true, value: object } | { ok: false, error: string }}
 */
export function addTask(title) {
  const trimmed = typeof title === 'string' ? title.trim() : '';

  if (trimmed === '') {
    return { ok: false, error: 'Task title cannot be empty.' };
  }

  const lower = trimmed.toLowerCase();
  const duplicate = tasks.some((t) => t.title.toLowerCase() === lower);
  if (duplicate) {
    return { ok: false, error: 'A task with this title already exists.' };
  }

  const task = {
    id: generateId(),
    title: trimmed,
    completed: false,
    createdAt: Date.now(),
  };

  tasks.push(task);
  save(StorageKey.TASKS, tasks);

  if (typeof document !== 'undefined') {
    renderTasks(tasks);
    const errorEl = document.getElementById('task-error');
    if (errorEl) errorEl.textContent = '';
  }

  return { ok: true, value: task };
}

/**
 * Delete a task by ID. Persists and re-renders.
 * @param {string} id
 */
export function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  save(StorageKey.TASKS, tasks);
  if (typeof document !== 'undefined') renderTasks(tasks);
}

/**
 * Toggle the completion state of a task by ID. Persists and re-renders.
 * @param {string} id
 */
export function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  save(StorageKey.TASKS, tasks);
  if (typeof document !== 'undefined') renderTasks(tasks);
}

/**
 * Edit a task's title. Re-runs the same validation as addTask (excluding self).
 * Persists and re-renders on success.
 * @param {string} id
 * @param {string} newTitle
 * @returns {{ ok: true, value: object } | { ok: false, error: string }}
 */
export function editTask(id, newTitle) {
  const trimmed = typeof newTitle === 'string' ? newTitle.trim() : '';

  if (trimmed === '') {
    return { ok: false, error: 'Task title cannot be empty.' };
  }

  const lower = trimmed.toLowerCase();
  const duplicate = tasks.some((t) => t.id !== id && t.title.toLowerCase() === lower);
  if (duplicate) {
    return { ok: false, error: 'A task with this title already exists.' };
  }

  const task = tasks.find((t) => t.id === id);
  if (!task) return { ok: false, error: 'Task not found.' };

  task.title = trimmed;
  save(StorageKey.TASKS, tasks);
  if (typeof document !== 'undefined') renderTasks(tasks);

  return { ok: true, value: task };
}

/**
 * Return a sorted view of the tasks array without mutating the stored order.
 * @param {'name' | 'status'} mode
 * @returns {Array<object>}
 */
export function sortTasks(mode) {
  const copy = [...tasks];
  if (mode === 'name') {
    copy.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
  } else if (mode === 'status') {
    // incomplete (false) before complete (true)
    copy.sort((a, b) => Number(a.completed) - Number(b.completed));
  }
  return copy;
}

/**
 * Rebuild the #task-list DOM from the provided tasks array.
 * @param {Array<object>} taskList
 */
export function renderTasks(taskList) {
  if (typeof document === 'undefined') return;

  const listEl = document.getElementById('task-list');
  if (!listEl) return;

  listEl.innerHTML = '';

  taskList.forEach((task) => {
    const li = document.createElement('li');
    li.dataset.id = task.id;
    li.className = task.completed ? 'task-item completed' : 'task-item';

    // Complete toggle button (checkbox style)
    const completeBtn = document.createElement('button');
    completeBtn.className = 'task-complete-btn';
    completeBtn.setAttribute('aria-label', task.completed ? 'Mark incomplete' : 'Mark complete');
    completeBtn.textContent = task.completed ? '✓' : '';
    completeBtn.dataset.action = 'toggle';
    completeBtn.dataset.id = task.id;

    // Title span
    const titleSpan = document.createElement('span');
    titleSpan.className = 'task-title';
    titleSpan.textContent = task.title;

    // Edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'task-edit-btn';
    editBtn.setAttribute('aria-label', 'Edit task');
    editBtn.textContent = '✏️';
    editBtn.dataset.action = 'edit';
    editBtn.dataset.id = task.id;

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'task-delete-btn';
    deleteBtn.setAttribute('aria-label', 'Delete task');
    deleteBtn.textContent = '🗑️';
    deleteBtn.dataset.action = 'delete';
    deleteBtn.dataset.id = task.id;

    li.appendChild(completeBtn);
    li.appendChild(titleSpan);
    li.appendChild(editBtn);
    li.appendChild(deleteBtn);
    listEl.appendChild(li);
  });
}

/**
 * Load tasks from localStorage and render them.
 */
export function initTasks() {
  const stored = load(StorageKey.TASKS, []);
  tasks = Array.isArray(stored) ? stored : [];
  if (typeof document !== 'undefined') renderTasks(tasks);
  _wireTasks();
}

/**
 * Wire add button, sort controls, and delegated list events.
 * Internal — called by initTasks.
 */
function _wireTasks() {
  if (typeof document === 'undefined') return;

  const addBtn = document.getElementById('task-add-btn');
  const input = document.getElementById('task-input');
  const errorEl = document.getElementById('task-error');
  const sortNameBtn = document.getElementById('task-sort-name');
  const sortStatusBtn = document.getElementById('task-sort-status');
  const listEl = document.getElementById('task-list');

  function handleAdd() {
    if (!input) return;
    const result = addTask(input.value);
    if (result.ok) {
      input.value = '';
      if (errorEl) errorEl.textContent = '';
    } else {
      if (errorEl) errorEl.textContent = result.error;
    }
  }

  if (addBtn) addBtn.addEventListener('click', handleAdd);
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAdd();
      if (errorEl) errorEl.textContent = '';
    });
  }

  if (sortNameBtn) sortNameBtn.addEventListener('click', () => renderTasks(sortTasks('name')));
  if (sortStatusBtn) sortStatusBtn.addEventListener('click', () => renderTasks(sortTasks('status')));

  // Delegated events on the task list
  if (listEl) {
    listEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action, id } = btn.dataset;

      if (action === 'toggle') {
        toggleTask(id);
      } else if (action === 'delete') {
        deleteTask(id);
      } else if (action === 'edit') {
        _startInlineEdit(id);
      }
    });
  }
}

/**
 * Replace a task's title span with an inline edit input.
 * @param {string} id
 */
function _startInlineEdit(id) {
  if (typeof document === 'undefined') return;

  const li = document.querySelector(`[data-id="${id}"]`);
  if (!li) return;

  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  const titleSpan = li.querySelector('.task-title');
  const editBtn = li.querySelector('.task-edit-btn');
  const errorEl = document.getElementById('task-error');

  // Replace title span with input
  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.className = 'task-edit-input';
  editInput.value = task.title;
  editInput.setAttribute('aria-label', 'Edit task title');

  if (titleSpan) titleSpan.replaceWith(editInput);
  if (editBtn) editBtn.style.display = 'none';
  editInput.focus();

  function commitEdit() {
    const result = editTask(id, editInput.value);
    if (!result.ok) {
      if (errorEl) errorEl.textContent = result.error;
      // Restore original title span on failure
      const newSpan = document.createElement('span');
      newSpan.className = 'task-title';
      newSpan.textContent = task.title;
      editInput.replaceWith(newSpan);
      if (editBtn) editBtn.style.display = '';
    } else {
      if (errorEl) errorEl.textContent = '';
    }
  }

  editInput.addEventListener('blur', commitEdit);
  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { editInput.blur(); }
    if (e.key === 'Escape') {
      // Cancel edit — restore original
      const newSpan = document.createElement('span');
      newSpan.className = 'task-title';
      newSpan.textContent = task.title;
      editInput.replaceWith(newSpan);
      if (editBtn) editBtn.style.display = '';
    }
  });
}

// ─── Quick Links Component ────────────────────────────────────────────────────

/**
 * Module-level single source of truth for all quick links.
 * @type {Array<{id: string, label: string, url: string}>}
 */
export let links = [];

/**
 * Reset the links array (used by tests to isolate state between runs).
 */
export function _resetLinks() {
  links = [];
}

/**
 * Add a new quick link with the given label and URL.
 * Validates: non-empty label, non-empty URL, URL must start with http:// or https://.
 * Persists to localStorage on success.
 * @param {string} label
 * @param {string} url
 * @returns {{ ok: true, value: object } | { ok: false, error: string }}
 */
export function addLink(label, url) {
  const trimmedLabel = typeof label === 'string' ? label.trim() : '';
  const trimmedUrl = typeof url === 'string' ? url.trim() : '';

  if (trimmedLabel === '') {
    return { ok: false, error: 'Link label cannot be empty.' };
  }

  if (trimmedUrl === '') {
    return { ok: false, error: 'Link URL cannot be empty.' };
  }

  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    return { ok: false, error: 'URL must start with http:// or https://.' };
  }

  const link = {
    id: generateId(),
    label: trimmedLabel,
    url: trimmedUrl,
  };

  links.push(link);
  save(StorageKey.LINKS, links);

  if (typeof document !== 'undefined') {
    renderLinks(links);
    const errorEl = document.getElementById('link-error');
    if (errorEl) errorEl.textContent = '';
  }

  return { ok: true, value: link };
}

/**
 * Delete a quick link by ID. Persists and re-renders.
 * @param {string} id
 */
export function deleteLink(id) {
  links = links.filter((l) => l.id !== id);
  save(StorageKey.LINKS, links);
  if (typeof document !== 'undefined') renderLinks(links);
}

/**
 * Rebuild the #links-panel DOM from the provided links array.
 * @param {Array<{id: string, label: string, url: string}>} linkList
 */
export function renderLinks(linkList) {
  if (typeof document === 'undefined') return;

  const panel = document.getElementById('links-panel');
  if (!panel) return;

  panel.innerHTML = '';

  linkList.forEach((link) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'link-item';
    wrapper.dataset.id = link.id;

    // Clickable link button opening in new tab
    const linkBtn = document.createElement('a');
    linkBtn.href = link.url;
    linkBtn.target = '_blank';
    linkBtn.rel = 'noopener noreferrer';
    linkBtn.className = 'link-btn';
    linkBtn.textContent = link.label;
    linkBtn.dataset.id = link.id;

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'link-delete-btn';
    deleteBtn.setAttribute('aria-label', 'Delete link');
    deleteBtn.textContent = '🗑️';
    deleteBtn.dataset.action = 'delete';
    deleteBtn.dataset.id = link.id;

    wrapper.appendChild(linkBtn);
    wrapper.appendChild(deleteBtn);
    panel.appendChild(wrapper);
  });
}

/**
 * Load links from localStorage and render them.
 */
export function initLinks() {
  const stored = load(StorageKey.LINKS, []);
  links = Array.isArray(stored) ? stored : [];
  if (typeof document !== 'undefined') renderLinks(links);
  _wireLinks();
}

/**
 * Wire add button and delegated panel events.
 * Internal — called by initLinks.
 */
function _wireLinks() {
  if (typeof document === 'undefined') return;

  const addBtn = document.getElementById('link-add-btn');
  const labelInput = document.getElementById('link-label-input');
  const urlInput = document.getElementById('link-url-input');
  const errorEl = document.getElementById('link-error');
  const panel = document.getElementById('links-panel');

  function handleAdd() {
    const result = addLink(
      labelInput ? labelInput.value : '',
      urlInput ? urlInput.value : ''
    );
    if (result.ok) {
      if (labelInput) labelInput.value = '';
      if (urlInput) urlInput.value = '';
      if (errorEl) errorEl.textContent = '';
    } else {
      if (errorEl) errorEl.textContent = result.error;
    }
  }

  if (addBtn) addBtn.addEventListener('click', handleAdd);

  // Delegated delete events on the panel
  if (panel) {
    panel.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="delete"]');
      if (!btn) return;
      deleteLink(btn.dataset.id);
    });
  }
}

// ─── Theme Toggle Component ───────────────────────────────────────────────────

/**
 * Apply the given theme to the <html> element.
 * 'dark'  → sets data-theme="dark"
 * 'light' → removes the data-theme attribute
 * @param {'light' | 'dark'} theme
 */
export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

/**
 * Flip the current theme, persist it to localStorage, and apply it to the DOM.
 */
export function toggleTheme() {
  const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  save(StorageKey.THEME, next);
  applyTheme(next);
}

/**
 * Read the persisted theme preference from localStorage, apply it to the DOM,
 * and wire the #theme-toggle click event.
 * Call this as early as possible (before DOMContentLoaded) to prevent FOUC.
 */
export function initTheme() {
  const persisted = load(StorageKey.THEME, 'light');
  const theme = persisted === 'dark' ? 'dark' : 'light';
  applyTheme(theme);

  if (typeof document === 'undefined') return;

  // Wire the toggle button — may not exist yet if called before DOMContentLoaded,
  // so we also attach via DOMContentLoaded as a fallback.
  function wireToggle() {
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.addEventListener('click', toggleTheme);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireToggle);
  } else {
    wireToggle();
  }
}
