**🧠 Objective**

Ship a *cross-platform* desktop launcher for **Claude Code**, packaged with **Tauri**.

* **React** (front-end) for UI
* **Rust** (backend) for all process control & persistence
* Primary target Windows, but supports macOS and Linux via Tauri.
* Card-based dashboard with modern and sleek UI.

---

### ✅ Core Features

1. **📁 Project Management**

| Action                       | React / Tauri implementation                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Add Project**              | `tauri.dialog.open` with `directory: true` → returns folder path                                              |
| **Drag-and-Drop**            | HTML5 DnD (`onDrop`) + `preventDefault` to accept folders                                                     |
| **Auto-init**                | JS extracts folder name → default project name; sends `add_project` command to Rust backend (stores tags, notes empty) |
| **Display**                  | React grid (e.g. **Material-UI** `<Masonry>` or plain CSS grid) rendering **ProjectCard** component           |
| **Edit name / tags / notes** | Inline editable **MUI TextField**s; debounce → `update_project` command                                           |
| **Pin / Unpin**              | Star icon toggle; boolean persisted                                                                           |
| **Recent (last 5)**          | Computed in Rust backend by `last_used`; React shows a "Recent" section pinned to top                                |

2. **🚀 Launching Claude Code**

| Step              | Implementation                                                                        |
| ----------------- | ------------------------------------------------------------------------------------- |
| **Launch**        | React "Launch" button → `invoke('launch_project', { id, continueFlag })`              |
| **Rust backend**  | Uses Tauri shell plugin to spawn `claude-code --dangerously-skip-permissions` process |
| **Continue flag** | Checkbox on card adds `--continue` flag                                                 |

3. **🎨 UI / UX**

* **React + MUI** (light & dark theme via `ThemeProvider` and system preference).
* **Keyboard friendly**: arrow-key card navigation (`tabIndex`, `onKeyDown`).
* Responsive grid—two columns ≥ 1280 px, single column otherwise.
* Card-based dashboard with clean and modern UI.
* Cards show name, tag chips, notes preview (ellipsis), pin, launch. Tooltip on hover for full notes.

4. **🗃️ Persistence**

* **SQLite** (bundled DB file under `%APPDATA%\ClaudeLauncher\projects.db` on Windows, `~/.local/share/claude-launcher/projects.db` on Unix).
* Rust backend uses `rusqlite` crate for database operations.
* Schema: `projects(id, path, name, tags, notes, pinned, last_used)` + `settings(key, value, updated_at)`.

---

### 🧼 Scope Exclusions (v1)

* No embedded terminal / CLI output.
* No per-project custom flags beyond `--continue`.
* No auto-updates; ship MSI manually.

---

### 🛠️ File/Folder Layout

```text
root/
  src-tauri/
    tauri.conf.json
    src/
      lib.rs         # Rust backend
      main.rs
    capabilities/
      default.json
  src/               # React frontend
    App.jsx
    components/
      ProjectCard.jsx
      ProjectGrid.jsx
  package.json
```

---

### 🧩 Tech Stack

* **Tauri 2.x** (stable channel)
* **React 18 + JavaScript**
* **Material-UI v5** for components
* **Rust** (native backend with `rusqlite`, `serde`, `uuid`, `chrono`)
* **SQLite** + `rusqlite`
* **Vite** for frontend bundling

---

### ✅ Current Implementation Status

**Completed Features:**
* ✅ Project management (add, edit, delete, pin/unpin)
* ✅ SQLite persistence with settings table
* ✅ Drag & drop folder support
* ✅ Claude Code launching with continue flag
* ✅ Material-UI with light/dark theme switching
* ✅ Tag filtering with multi-select (AND logic)
* ✅ Keyboard navigation (arrow keys, Enter to launch)
* ✅ Sorting options (Name A-Z, Recently Used)
* ✅ Search functionality across name, tags, notes, path
* ✅ Recent projects tracking
* ✅ Settings persistence (theme, sort preferences)

**Architecture Decisions:**
* Pure Rust backend (migrated from Python sidecar for better performance)
* Cross-compilation support (Windows executable from WSL)
* Tauri drag-drop events for platform-specific file handling
* SQLite for both project data and user settings

---

### ✅ Extras (nice-to-have)

* Fuzzy search bar (`matchSorter`) for tags/names.
* Global settings persistence (stored in SQLite settings table).
* Light UI theme with pastel colours.

---