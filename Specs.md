\*\*🧠 Objective\*\*

Ship a \*Windows‑only\* desktop launcher for \*\*Claude Code\*\*, packaged with \*\*Tauri\*\*.



\* \*\*React\*\* (front‑end) for UI

\* \*\*Python 3.11+\*\* (side‑car) for all process control \& persistence

\* No Mac / Linux concerns—optimize for Windows 11.

\* Card-based dashboard with modern and sleek UI.



---



\### ✅ Core Features



1\. \*\*📁 Project Management\*\*



| Action                       | React / Tauri implementation                                                                                  |

| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |

| \*\*Add Project\*\*              | `tauri.dialog.open` with `directory: true` → returns folder path                                              |

| \*\*Drag‑and‑Drop\*\*            | HTML5 DnD (`onDrop`) + `preventDefault` to accept folders                                                     |

| \*\*Auto‑init\*\*                | JS extracts folder name → default project name; sends `init\_project` IPC to Python (stores tags, notes empty) |

| \*\*Display\*\*                  | React grid (e.g. \*\*Material‑UI\*\* `<Masonry>` or plain CSS grid) rendering \*\*ProjectCard\*\* component           |

| \*\*Edit name / tags / notes\*\* | Inline editable \*\*MUI TextField\*\*s; debounce → `update\_project` IPC                                           |

| \*\*Pin / Unpin\*\*              | Star icon toggle; boolean persisted                                                                           |

| \*\*Recent (last 5)\*\*          | Compute in Python by `last\_used`; React shows a “Recent” section pinned to top                                |



2\. \*\*🚀 Launching Claude Code\*\*



| Step              | Implementation                                                                        |

| ----------------- | ------------------------------------------------------------------------------------- |

| \*\*Launch\*\*        | React “Launch” button → `invoke('launch\_project', { id, continueFlag })`              |

| \*\*Python side\*\*   | Uses `subprocess.Popen(\["claude-code", "--dangerously-skip-permissions", ...(flag)])` |

| \*\*Continue flag\*\* | Checkbox on card adds `--continue`  (and other flags)                                                  |



3\. \*\*🎨 UI / UX\*\*



\* \*\*React + MUI\*\* (light \& dark theme via `ThemeProvider` and system preference).

\* \*\*Keyboard friendly\*\*: arrow‑key card navigation (`tabIndex`, `onKeyDown`).

\* Responsive grid—two columns ≥ 1280 px, single column otherwise.

\* Card-based dashboard with clean and modern UI.

\* Cards show name, tag chips, notes preview (ellipsis), pin, launch. Tooltip on hover for full notes.



4\. \*\*🗃️ Persistence\*\*



\* \*\*SQLite\*\* (bundled DB file under `%APPDATA%\\ClaudeLauncher\\projects.db`).

\* Python uses `sqlite3` or SQLAlchemy.

\* Schema: `projects(id, path, name, tags, notes, pinned, last\_used)`.



---



\### 🧼 Scope Exclusions (v1)



\* No embedded terminal / CLI output.

\* No per‑project custom flags beyond `--continue`.

\* No auto‑updates; ship MSI manually.



---



\### 🛠️ File/Folder Layout



```text

root/

&nbsp; src-tauri/

&nbsp;   tauri.conf.json

&nbsp;   python/          # launcher backend

&nbsp;     main.py

&nbsp;     db.py

&nbsp; web/

&nbsp;   package.json

&nbsp;   src/

&nbsp;     App.tsx

&nbsp;     components/ProjectCard.tsx

```



---



\### 🧩 Tech Stack



\* \*\*Tauri 2.x\*\* (stable channel)

\* \*\*React 18 + TypeScript\*\*

\* \*\*MUI v6\*\* for components

\* \*\*Python 3.11\*\* (side‑car, frozen with \*\*PyInstaller\*\*; added to Tauri bundle)

\* \*\*SQLite\*\* + `SQLAlchemy`

\* \*\*Vitest\*\* for unit tests (JS) \& `pytest` (Python)



---



\### ✅ Extras (nice‑to‑have)



\* Fuzzy search bar (`@tanstack/match-sorter`) for tags/names.

\* Global settings modal (store JSON in `%APPDATA%\\ClaudeLauncher\\settings.json`).

\* Light UI theme with pastel colours. 



--- 



