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
npm test:ui              # Run tests with UI
npm test:coverage        # Run tests with coverage

# Run backend tests (requires Rust in PATH)
export PATH="$HOME/.cargo/bin:$PATH" && npm run test:rust
# Or directly: cargo test

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
- `projects` table: id, path, name, tags, notes, pinned, last_used, color (optional)
- `settings` table: key-value pairs for user preferences

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

### State Management
- React state for UI interactions
- `useEffect` hooks for data synchronization
- Settings loaded on app initialization, saved immediately on changes

### Component Architecture
- `App.jsx` - Main container with global state
- `ProjectGrid.jsx` - Layout and organization logic
- `ProjectCard.jsx` - Individual project display and actions
- `ColorPicker.jsx` - Color selection component
- `ContextMenu.jsx` - Right-click menu functionality
- `ErrorBoundary.jsx` - Error handling wrapper

### Feature Implementation Pattern
1. Add React state variables
2. Implement UI components
3. Add Tauri commands if backend needed
4. Integrate with existing filtering/sorting/search
5. Add settings persistence if needed

## Database Operations

All database operations happen in Rust backend through Tauri commands:
- `init_database()` - Initialize tables and indexes
- `add_project(path)` - Add new project from file path
- `get_projects()` - Retrieve all projects
- `update_project(id, updates)` - Update project fields
- `delete_project(id)` - Remove project
- `launch_project(id, continueFlag)` - Launch Claude Code with project
- `launch_batch_file(path)` - Launch Windows batch files
- `open_path(path)` - Open folder in file explorer

## Current Features

**Core Functionality**:
- Project management with SQLite persistence
- Claude Code integration (launches `claude-code` command)
- Drag & drop folder support
- Search, tag filtering, sorting (Name A-Z, Recently Used)
- Pin favorites, recent projects tracking
- Color-coding for projects
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

Key testing principles:
- Use semantic queries (getByRole, getByLabelText) over implementation details
- Wrap async operations in act() when needed
- Use within() for component-scoped queries when multiple elements exist
- Match implementation exactly (check actual code before writing tests)

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