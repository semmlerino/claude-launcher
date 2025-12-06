# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ IMPORTANT: Windows Compilation Required

**ALWAYS compile for Windows when building production releases:**

```bash
# For Windows .exe from WSL (RECOMMENDED)
export PATH="$HOME/.cargo/bin:$PATH" && rustup target add x86_64-pc-windows-gnu
export PATH="$HOME/.cargo/bin:$PATH" && npm run tauri build -- --target x86_64-pc-windows-gnu --no-bundle

# For production builds in WSL environment (Linux binary for WSL)
export PATH="$HOME/.cargo/bin:$PATH" && npm run tauri build

# For production builds on native Windows (requires MSVC toolchain)
npm run tauri build -- --target x86_64-pc-windows-msvc
```

This application is designed specifically for Windows with WSL integration, Windows-specific batch file launching, and Windows file system paths. The cross-compiled Windows .exe will be created in `src-tauri/target/x86_64-pc-windows-gnu/release/claude-launcher.exe`.

## Essential Commands

### Development
```bash
# Start development server (requires Rust in PATH)
export PATH="$HOME/.cargo/bin:$PATH" && npm run tauri dev

# Build React frontend only
npm run build

# Build production executable
npm run tauri build
```

### Testing
```bash
# Run frontend tests
npm test                  # Run all tests in watch mode
npm test -- --run        # Run all tests once
npm test -- ProjectCard  # Run tests matching "ProjectCard"
npm test:ui              # Run tests with UI
npm test:coverage        # Run tests with coverage

# Run backend tests (requires Rust in PATH)
export PATH="$HOME/.cargo/bin:$PATH" && npm run test:rust
# Or directly: cargo test
# Run specific Rust test: cargo test test_name

# Run linting and formatting
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format code with Prettier
npm run format:check     # Check formatting
```

### WSL Environment Setup
```bash
# Add Rust to PATH (required for WSL)
export PATH="$HOME/.cargo/bin:$PATH"

# Clean Rust build cache if needed
cd src-tauri && cargo clean
```

### Build Timeouts
- Initial builds can take 10+ minutes compiling 550+ Rust dependencies
- Use generous timeouts (600000ms/10 minutes) for first builds
- Subsequent builds are much faster due to cached dependencies

## Security Context

This is a **personal tool** running only in the developer's own environment.

**When reviewing or modifying this codebase:**
- **DO NOT** flag or fix security vulnerabilities (path traversal, injection, XSS, etc.)
- **DO NOT** add input sanitization, validation, or permission checks
- **DO NOT** harden CSP, escape user inputs, or add security-focused error handling
- **DO** prioritize simplicity, functionality, and correctness over defensive patterns
- **DO** focus on bugs that affect functionality, not theoretical security risks

Security issues are explicitly out of scope for this project. The only user is the developer, running locally on their own machine with full trust.

## Architecture Overview

This is a **Tauri 2.0 desktop application** that combines:
- **Frontend**: React 18 + Material-UI (in `src/`)
- **Backend**: Rust with SQLite database (in `src-tauri/src/`)
- **Build System**: Vite for frontend, Cargo for backend, Tauri CLI orchestrates both

### Key Architectural Decisions

**Pure Rust Backend**: Originally used Python sidecar but migrated to Rust for better performance, smaller binaries, and simpler architecture.

**SQLite Data Layer**: All project data and settings stored in SQLite database using `rusqlite` crate.

**Tauri Command System**: Frontend communicates with backend through Tauri's `invoke()` system calling registered Rust functions.

### Core Data Flow

1. **React Frontend** → `invoke('command_name', params)` → **Rust Backend**
2. **Rust Backend** → SQLite database operations → Returns data to Frontend
3. **Frontend** updates UI state and persists user preferences via settings commands

### Main Components

**Frontend (`src/App.jsx`)**:
- Main application state management
- Material-UI components for project cards, search, filtering
- Tauri API integration for file dialogs, logging, events

**Backend (`src-tauri/src/lib.rs`)**:
- All Tauri command handlers (database operations, file system, process launching)
- SQLite database initialization and management
- Settings persistence infrastructure

**Database Schema**:
- `projects` table: id, path, name, tags, notes, pinned, last_used, background_color, icon, icon_size, continue_flag
- `settings` table: key-value pairs for user preferences

**Performance Optimization**:
- LRU cache for settings (100 entries) - reduces database reads
- In-memory project cache with invalidation on updates
- Thread-safe database access using `parking_lot::Mutex`

## Development Patterns

### Settings Persistence
Use the built-in settings infrastructure:
```rust
// Backend commands
get_setting(key: String) -> Option<String>
set_setting(key: String, value: String)
```

Known setting keys:
- `theme_preference`: 'light' | 'dark'
- `sort_preference`: 'name' | 'recent'
- `use_wsl`: 'true' | 'false' - Enable WSL integration (Windows only)
- `claude_executable_path`: Path to claude executable in WSL
- `keep_terminal_open`: 'true' | 'false' - Keep terminal window open after launch
- `wsl_launch_method`: 'batch' | 'wt' | 'powershell' - How to launch WSL commands

### State Management
- React state for UI interactions
- `useEffect` hooks for data synchronization
- Settings loaded on app initialization, saved immediately on changes

### Component Architecture
- `App.jsx` - Main container with global state, theme, settings, project data
- `ProjectGrid.jsx` - Layout and organization logic using MUI Masonry
- `ProjectCard.jsx` - Individual project display and actions, keyboard navigation
- `ColorPicker.jsx` - Custom color selection component
- `IconPicker.jsx` - Icon selection from Material UI icon set
- `IconRenderer.jsx` - Displays project icons with size variants
- `CustomIconUpload.jsx` - Upload custom SVG/PNG/JPG/ICO/WEBP icons
- `ContextMenu.jsx` - Right-click menu functionality
- `ErrorBoundary.jsx` - Error handling wrapper for React errors

### Feature Implementation Pattern
1. Add React state variables
2. Implement UI components
3. Add Tauri commands if backend needed
4. Integrate with existing filtering/sorting/search
5. Add settings persistence if needed

## Database Operations

All database operations happen in Rust backend through Tauri commands:

**Project Management**:
- `init_database()` - Initialize tables and indexes
- `add_project(path)` - Add new project from file path
- `get_projects()` - Retrieve all projects
- `get_recent_projects(limit)` - Get recently used projects
- `update_project(id, updates)` - Update project fields
- `delete_project(id)` - Remove project

**Project Actions**:
- `launch_project(id, continueFlag)` - Launch Claude Code with project (handles WSL batch file creation internally)
- `open_project_folder(id)` - Open project folder in file explorer
- `check_claude_installed()` - Check if Claude CLI is available (supports WSL detection)

**Custom Icons**:
- `upload_custom_icon(source_path, desired_name)` - Upload a custom icon file (SVG, PNG, JPG, ICO, WEBP)
- `get_custom_icons()` - List all uploaded custom icons
- `delete_custom_icon(icon_id)` - Delete a custom icon file
- `get_custom_icon_path(icon_id)` - Get filesystem path for a custom icon

## Current Features

**Core Functionality**:
- Project management with SQLite persistence
- Claude Code integration (launches `claude-code` command)
- Drag & drop folder support
- Search, tag filtering, sorting (Name A-Z, Recently Used)
- Pin favorites, recent projects tracking
- Color-coding for projects with custom background colors
- Custom icons with configurable sizes
- Continue flag per project (launches with `--continue`)
- Context menu actions (Open Folder)

**UI Features**:
- Material-UI with light/dark theme
- Keyboard navigation (arrow keys, Enter to launch)
- Responsive design with Masonry layout
- Real-time search and filtering
- Custom window chrome with draggable area

**Settings**:
- Theme preference persistence
- Sort option persistence
- All user preferences saved to database

## Testing Approach

The project has comprehensive tests using:
- **Frontend**: Vitest + React Testing Library + happy-dom
- **Backend**: Rust's built-in test framework with in-memory SQLite
- **Integration**: Tauri mockIPC for frontend-backend testing

### Test Configuration
- **Test timeout**: 30 seconds per test (configured for slower operations)
- **Hook timeout**: 10 seconds
- **Environment**: happy-dom (faster than jsdom, sufficient for this app)
- **Setup file**: `src/test/setup.js` - Contains all mocks and polyfills

### Key Testing Principles
- Use semantic queries (getByRole, getByLabelText) over implementation details
- Wrap async operations in act() when needed
- Use within() for component-scoped queries when multiple elements exist
- Match implementation exactly (check actual code before writing tests)
- All MUI components and icons are mocked in setup.js to prevent test hanging
- Tauri APIs are fully mocked via vitest

### Mock Structure
- **MUI mocks**: Comprehensive mocks in setup.js render semantic HTML equivalents
- **Tauri mocks**: All plugins mocked with vi.fn() for easy assertion
- **Icon mocks**: Material icons return their name as string for testing

## Known Build Issues

**WSL Environment**: 
- Rust tools not in PATH by default - must export PATH before running commands
- Long compilation times for first builds
- Use `npm run tauri dev` not `cargo build` for proper resource embedding

**Development vs Production**:
- `npm run tauri dev` builds both frontend and backend, starts development server
- `npm run tauri build` creates production executable with embedded resources
- Direct `cargo build` only compiles Rust, missing frontend integration

**Windows Path Handling**:
- Application uses Windows paths internally (C:\...)
- Converts WSL paths when needed for batch file execution
- Uses `tauri-plugin-opener` for cross-platform file/folder opening