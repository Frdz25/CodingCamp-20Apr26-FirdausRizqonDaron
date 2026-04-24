# To-Do List Life Dashboard

A single-page personal productivity dashboard built with plain HTML, CSS, and Vanilla JavaScript. No frameworks, no backend — everything runs in the browser and persists via `localStorage`.

## Features

- **Real-time Clock** — displays current time (HH:MM:SS), date, and a time-sensitive greeting (Good Morning / Afternoon / Evening / Night)
- **Adjustable Pomodoro Timer** — configurable countdown (1–60 min, default 25 min) with start, stop, and reset controls; plays an audio alert on completion
- **To-do List with Sorting** — add, edit, delete, and complete tasks; can be sort by name or status; prevent duplicate and empty-title tasks
- **Quick links** — save labeled URL shortcuts that open in a new tab; validates `http://` / `https://` scheme
- **Dark mode** — toggle between light and dark themes; preference persisted across sessions

## Project Structure

```
/
├── index.html          # App entry point
├── css/
│   └── styles.css      # All styles (light + dark theme via CSS custom properties)
├── js/
│   └── app.js          # All application logic (persistence, clock, timer, tasks, links, theme)
├── tests/
│   ├── clock.test.js
│   ├── timer.test.js
│   ├── tasks.test.js
│   ├── links.test.js
│   ├── theme.test.js
│   └── storage.test.js
├── package.json
└── requirements.txt
```

## Getting Started

No build step required. Just open `index.html` in any modern browser.

```bash
# Clone the repo
git clone <repo-url>
cd todo-life-dashboard

# Open directly (no server needed)
start index.html        # Windows
open index.html         # macOS
xdg-open index.html     # Linux
```

## Running Tests

Tests use [Vitest](https://vitest.dev/) and [fast-check](https://github.com/dubzzz/fast-check) for property-based testing.

```bash
# Install dev dependencies
npm install

# Run all tests (single pass)
npm test
```

The test suite covers 18 property-based tests and 21 unit tests across all components.

## Browser Support

Works in the latest stable versions of Chrome, Firefox, Edge, and Safari.

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Markup     | HTML5 (semantic)                  |
| Styling    | CSS3 (custom properties, grid)    |
| Logic      | Vanilla JavaScript (ES modules)   |
| Storage    | `localStorage` API                |
| Testing    | Vitest + fast-check               |
