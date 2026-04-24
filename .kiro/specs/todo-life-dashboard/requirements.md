# Requirements Document

## Introduction

The To-Do List Life Dashboard is a client-side web application that serves as a personal productivity homepage. It provides users with a real-time clock and greeting, a focus timer, a task management list, quick-access website links, and a dark mode toggle — all persisted via the browser's Local Storage API. The application is built with plain HTML, CSS, and Vanilla JavaScript, requiring no backend or build toolchain.

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Task**: A user-defined to-do item with a title and a completion state.
- **Focus_Timer**: A countdown timer used to track focused work sessions.
- **Quick_Link**: A user-defined shortcut consisting of a label and a URL that opens in a new browser tab.
- **Local_Storage**: The browser's `localStorage` API used to persist all user data client-side.
- **Dark_Mode**: An alternative visual theme using a dark background and light foreground colors.
- **Greeting**: A time-sensitive salutation displayed alongside the current time and date.

---

## Requirements

### Requirement 1: Real-Time Clock and Greeting

**User Story:** As a user, I want to see the current time, date, and a contextual greeting, so that I can quickly orient myself when opening the dashboard.

#### Acceptance Criteria

1. THE Dashboard SHALL display the current time in HH:MM:SS format, updated every second.
2. THE Dashboard SHALL display the current date in a human-readable format (e.g., "Monday, July 14, 2025").
3. WHEN the local time is between 05:00 and 11:59, THE Dashboard SHALL display the greeting "Good Morning".
4. WHEN the local time is between 12:00 and 17:59, THE Dashboard SHALL display the greeting "Good Afternoon".
5. WHEN the local time is between 18:00 and 20:59, THE Dashboard SHALL display the greeting "Good Evening".
6. WHEN the local time is between 21:00 and 04:59, THE Dashboard SHALL display the greeting "Good Night".

---

### Requirement 2: Focus Timer

**User Story:** As a user, I want a configurable countdown timer, so that I can time focused work sessions using the Pomodoro technique or a custom duration.

#### Acceptance Criteria

1. THE Focus_Timer SHALL default to a duration of 25 minutes on first load.
2. WHEN the user activates the Start control, THE Focus_Timer SHALL begin counting down in one-second intervals.
3. WHEN the user activates the Stop control, THE Focus_Timer SHALL pause the countdown and retain the remaining time.
4. WHEN the user activates the Reset control, THE Focus_Timer SHALL restore the countdown to the currently configured duration.
5. WHEN the Focus_Timer reaches 00:00, THE Dashboard SHALL play an audible alert and display a visual notification to the user.
6. WHEN the user activates the increase-duration control, THE Focus_Timer SHALL increase the configured duration by 1 minute, up to a maximum of 60 minutes.
7. WHEN the user activates the decrease-duration control, THE Focus_Timer SHALL decrease the configured duration by 1 minute, down to a minimum of 1 minute.
8. WHILE the Focus_Timer is counting down, THE Dashboard SHALL disable the increase-duration and decrease-duration controls.
9. THE Focus_Timer SHALL display the remaining time in MM:SS format at all times.

---

### Requirement 3: To-Do List

**User Story:** As a user, I want to manage a list of tasks, so that I can track what I need to accomplish during the day.

#### Acceptance Criteria

1. WHEN the user submits a non-empty task title, THE Dashboard SHALL add the task to the Task list and persist it to Local_Storage.
2. IF the user submits a task title that is identical (case-insensitive) to an existing task title, THEN THE Dashboard SHALL reject the submission and display an inline error message indicating the duplicate.
3. IF the user submits an empty task title, THEN THE Dashboard SHALL reject the submission and display an inline error message.
4. WHEN the user activates the complete control on a Task, THE Dashboard SHALL toggle the Task's completion state and persist the updated state to Local_Storage.
5. WHEN the user activates the edit control on a Task, THE Dashboard SHALL display an editable input pre-filled with the Task's current title.
6. WHEN the user confirms an edit, THE Dashboard SHALL update the Task's title, validate it against the duplicate and empty rules (Criteria 2–3), and persist the change to Local_Storage.
7. WHEN the user activates the delete control on a Task, THE Dashboard SHALL remove the Task from the list and from Local_Storage.
8. WHEN the user selects the "Sort by Name" option, THE Dashboard SHALL display tasks sorted alphabetically by title (A–Z).
9. WHEN the user selects the "Sort by Status" option, THE Dashboard SHALL display incomplete tasks before completed tasks.
10. WHEN the Dashboard loads, THE Dashboard SHALL restore all Tasks from Local_Storage and display them in their persisted order and state.

---

### Requirement 4: Quick Links

**User Story:** As a user, I want to save and access favorite website shortcuts, so that I can navigate to frequently visited sites with a single click.

#### Acceptance Criteria

1. WHEN the user submits a Quick_Link with a valid label and a valid URL, THE Dashboard SHALL add the Quick_Link to the links panel and persist it to Local_Storage.
2. IF the user submits a Quick_Link with an empty label or an empty URL, THEN THE Dashboard SHALL reject the submission and display an inline error message.
3. IF the user submits a URL that does not begin with "http://" or "https://", THEN THE Dashboard SHALL reject the submission and display an inline error message indicating the invalid URL format.
4. WHEN the user activates a Quick_Link button, THE Dashboard SHALL open the associated URL in a new browser tab.
5. WHEN the user activates the delete control on a Quick_Link, THE Dashboard SHALL remove the Quick_Link from the panel and from Local_Storage.
6. WHEN the Dashboard loads, THE Dashboard SHALL restore all Quick_Links from Local_Storage and render them as clickable buttons.

---

### Requirement 5: Dark Mode

**User Story:** As a user, I want to toggle between light and dark visual themes, so that I can reduce eye strain in low-light environments.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a toggle control to switch between Light Mode and Dark Mode.
2. WHEN the user activates the Dark Mode toggle, THE Dashboard SHALL apply the dark theme to all visible UI elements immediately without a page reload.
3. WHEN the user activates the Dark Mode toggle while Dark Mode is active, THE Dashboard SHALL restore the light theme to all visible UI elements immediately without a page reload.
4. THE Dashboard SHALL persist the user's theme preference to Local_Storage.
5. WHEN the Dashboard loads, THE Dashboard SHALL read the persisted theme preference from Local_Storage and apply it before rendering visible content, preventing a flash of the wrong theme.

---

### Requirement 6: Data Persistence and Storage

**User Story:** As a user, I want my tasks, links, timer duration, and theme preference to survive page refreshes, so that I do not lose my data between sessions.

#### Acceptance Criteria

1. THE Dashboard SHALL store all Task data (title, completion state, order) in Local_Storage under a consistent, namespaced key.
2. THE Dashboard SHALL store all Quick_Link data (label, URL) in Local_Storage under a consistent, namespaced key.
3. THE Dashboard SHALL store the configured Focus_Timer duration in Local_Storage under a consistent, namespaced key.
4. THE Dashboard SHALL store the active theme preference in Local_Storage under a consistent, namespaced key.
5. WHEN Local_Storage is unavailable or returns malformed data, THE Dashboard SHALL fall back to default values and continue operating without throwing an unhandled error.

---

### Requirement 7: Browser Compatibility and Performance

**User Story:** As a user, I want the dashboard to load quickly and work reliably across modern browsers, so that I can use it as my daily homepage without friction.

#### Acceptance Criteria

1. THE Dashboard SHALL render and function correctly in the latest stable versions of Chrome, Firefox, Edge, and Safari.
2. THE Dashboard SHALL complete its initial render in under 2 seconds on a standard broadband connection.
3. THE Dashboard SHALL use only a single CSS file located in the `css/` directory and a single JavaScript file located in the `js/` directory.
4. THE Dashboard SHALL operate entirely client-side, requiring no backend server or network requests after the initial page load.
