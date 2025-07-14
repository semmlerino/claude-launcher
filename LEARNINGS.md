# Claude Launcher Development Learnings

## Project Structure & Naming
- **Issue**: Build error due to incomplete project renaming
- **Root Cause**: `main.rs` still referenced old crate name `tauri_react_python_lib` while `Cargo.toml` had `claude_launcher_lib`
- **Prevention**:
  - Always run build after major refactoring/renaming
  - Use grep to find all references: `grep -r "old_name" .`
  - Check critical entry points: `main.rs`, `Cargo.toml`, `tauri.conf.json`
  - Create a renaming checklist for systematic updates

## Cross-Platform Building from WSL

### Building Windows Executables from WSL
- **Working approach**: Use GNU target: `cargo build --release --target x86_64-pc-windows-gnu`
- **MSVC target fails** because it requires Windows SDK tools (lib.exe, link.exe)
- **GNU target works** because it uses MinGW toolchain available in WSL

### Graphics/GUI Issues in WSL
- **Error**: `libEGL warning: failed to open /dev/dri/renderD128: Permission denied`
- **Cause**: Limited GPU support in WSL for GUI applications
- **Solutions**:
  1. Build and run natively on Windows (recommended for Windows apps)
  2. Use software rendering: `LIBGL_ALWAYS_SOFTWARE=1 ./app`
  3. Ensure WSLg is properly configured with `$DISPLAY` and `$WAYLAND_DISPLAY`

## Security Configuration

### Content Security Policy (CSP)
- **Never use** `"csp": null` - it disables all security
- **Proper CSP example**:
  ```json
  "security": {
    "csp": "default-src 'self'; connect-src 'self'; font-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'"
  }
  ```

### Tauri Capabilities
- **Avoid broad permissions** like `fs:default`, `shell:default`
- **Use specific scoped permissions**:
  - Define exact file paths in `fs:scope`
  - List specific shell commands in `shell:allow-execute`
- **Remove unused permissions** (e.g., Python commands after removing sidecar)

## Build & Development Workflow

### Windows Development from PowerShell
- **Install Rust**: Download from https://rustup.rs/
- **If winget fails**: Close App Installer processes first
- **Missing build tools**: Install Visual Studio Build Tools with C++ workload

### Cargo & Rust Tips
- **Check installed targets**: `rustup target list | grep installed`
- **Add Windows target**: `rustup target add x86_64-pc-windows-gnu`
- **Clean builds**: `cargo clean` before switching targets
- **Timeout issues**: Use longer timeout for cross-compilation builds

## Database Integration
- **SQLite with Rust**: Use `rusqlite` with `bundled` feature
- **Cross-platform paths**: Use `dirs` crate for app data locations
- **Database location**: Store in platform-appropriate directory (`$APPDATA` on Windows)

## Frontend Integration
- **State management**: Use React hooks with Tauri's invoke system
- **Error handling**: Always handle Promise rejections from Tauri commands
- **File paths**: Convert dropped file paths to proper format for the OS

## Debugging Tips
1. **Check module names** match between `main.rs` and `Cargo.toml`
2. **Verify CSP** isn't blocking legitimate resources
3. **Test permissions** incrementally - start minimal, add as needed
4. **Use proper paths** - absolute paths in WSL start with `/mnt/c/`
5. **Build for the right target** - GNU for WSL→Windows, MSVC for native Windows

## Common Pitfalls Avoided
- ❌ Using `csp: null` for "convenience"
- ❌ Granting excessive permissions in capabilities
- ❌ Incomplete project renaming
- ❌ Building Linux binary when Windows exe is needed
- ❌ Not testing after major refactoring
- ❌ Missing build tools for cross-compilation

## Running Release Builds
- **Working Directory Matters**: Release executables must be run from project root
- **Error**: "localhost refused to connect" means app can't find bundled resources
- **Solution**: Run from project directory or create a batch file that sets correct working directory
- **Cross-compilation**: Can build Windows exe from WSL using `--target x86_64-pc-windows-gnu`
- **Installer Creation**: Requires NSIS on Windows (not available in WSL)

## "Localhost Refused to Connect" - Deep Dive

### Root Cause
The error occurs when Tauri's release build tries to load from `http://localhost:1422` (dev server) instead of using bundled frontend files.

### Diagnostic Steps
1. **Enable console output** by commenting out `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]`
2. **Add comprehensive logging** to see:
   - Resource directory location
   - Frontend dist configuration
   - Page load URLs
   - Window events

### Key Findings from Logs
```
[INFO] Resource directory: Ok("\\\\?\\C:\\...\\release")
[WARN] Dist folder not found at expected location
[INFO] Page load event: Url { scheme: "http", host: Some(Domain("localhost")), port: Some(1422) }
```

### The Fix
**Use Tauri CLI for building**, not just cargo:
```bash
cargo-tauri build --target x86_64-pc-windows-gnu --no-bundle
```

This ensures:
- Frontend is properly built (`npm run build`)
- Resources are correctly embedded
- Release build uses bundled files, not dev server

### Why `cargo build` Alone Fails
- `cargo build` only compiles Rust code
- `cargo-tauri build` runs the full Tauri build pipeline:
  1. Runs `beforeBuildCommand` (builds frontend)
  2. Embeds frontend resources
  3. Compiles Rust with proper resource handling
  4. Creates proper release binary

### Debugging Tips
1. **Check resource embedding**: Look for large exe size
2. **Enable debug logging**: `RUST_LOG=debug`
3. **Use setup hook**: Log paths and resource locations
4. **Watch page load events**: Should load from asset protocol, not localhost

## Working with Timeouts in Claude Code
- **Default timeout**: 2 minutes for bash commands
- **Extended timeout**: Add `timeout` parameter up to 600000ms (10 minutes)
- **Build commands** often need extended timeouts:
  ```javascript
  // In Claude Code, use:
  bash(command, { timeout: 600000 })
  ```

## Logging Infrastructure
- **Backend (Rust)**: 
  - `tauri-plugin-log` for structured logging
  - Logs to: stdout, log files, and webview console
  - Log levels: `RUST_LOG=debug,tauri=debug,wry=debug`
- **Frontend (React)**:
  - `@tauri-apps/plugin-log` package
  - Import: `import { info, error, warn, debug } from '@tauri-apps/plugin-log'`
- **Log locations**:
  - Console output (when `RUST_LOG` is set)
  - `%APPDATA%\ClaudeLauncher\logs\` (Windows)
  - Browser DevTools (F12)

## Settings & Data Persistence
- **Database Schema**: Use SQLite with separate `settings` table for key-value storage
- **Settings Infrastructure**:
  ```rust
  // Tauri commands for settings
  get_setting(key: String) -> Option<String>
  set_setting(key: String, value: String)
  ```
- **React Integration**: Load settings on app init, persist changes immediately
- **Common Settings**: Theme preferences, sort options, UI state
- **Database Location**: Same as main app database for consistency

## UI State Management & Features

### Tag Filtering System
- **Multi-select filtering**: Users can select multiple tags simultaneously
- **AND logic**: Projects must have ALL selected tags to be shown
- **State management**: Use React state + useEffect for real-time filtering
- **UI Components**: Clickable chips throughout the app (main filter area + project cards)
- **Clear filters**: Provide easy way to reset all active filters

### Keyboard Navigation
- **Arrow keys**: Up/Down to navigate between projects
- **Enter key**: Launch selected project (Shift+Enter for continue mode)
- **Escape key**: Reset selection to first project
- **Visual feedback**: Enhanced shadow and border for selected project
- **Integration**: Works with filtered project lists
- **State management**: Track `selectedProjectIndex` and sync with filtering

### Project Sorting
- **Available options**: Name (A-Z), Recently Used
- **Default sort**: Recently Used (most practical for users)
- **Persistence**: Save sort preference to database settings
- **Integration**: Sorting applied after tag filtering and search
- **UI placement**: Dropdown in toolbar between search and refresh
- **Null handling**: Projects without `last_used` appear at end of Recently Used sort

## Rust Development in WSL Environment

### PATH Configuration Issues
- **Problem**: `cargo not found` error even when Rust is installed
- **Root cause**: `~/.cargo/bin` not in PATH during npm script execution
- **Solution**: Export PATH in same command context:
  ```bash
  export PATH="$HOME/.cargo/bin:$PATH" && npm run tauri dev
  ```
- **Alternative**: Add to shell profile permanently

### Compilation Performance
- **First build**: Can take 10+ minutes compiling 550+ dependencies
- **Subsequent builds**: Much faster due to cached dependencies
- **Timeout considerations**: Use generous timeouts (10+ minutes) for initial builds
- **Clean builds**: `cargo clean` removes cache, requires full recompilation
- **Build types**: `cargo build --release` vs `npm run tauri dev` serve different purposes

### Build Process Understanding
- **npm run tauri dev**: Builds frontend + backend, starts dev server
- **npm run tauri build**: Full production build with bundled resources
- **cargo build**: Rust-only compilation, missing frontend integration
- **Resource embedding**: Only happens through Tauri CLI, not direct cargo commands
- **Development workflow**: Use `tauri dev` for testing, `tauri build` for deployment

## Development Workflow Improvements

### Systematic Feature Implementation
1. **Planning Phase**: Update improvement plan with specific requirements
2. **State Management**: Add necessary React state variables
3. **UI Components**: Implement user interface elements
4. **Backend Integration**: Add Tauri commands if needed
5. **Persistence**: Save settings/preferences to database
6. **Testing**: Build and verify functionality works
7. **Documentation**: Update improvement plan and todo tracking

### Code Organization Patterns
- **Utility functions**: Extract complex logic (sorting, filtering) to separate functions
- **Component props**: Pass functions down component hierarchy for events
- **State updates**: Use useEffect with proper dependencies for reactive updates
- **Error handling**: Wrap Tauri invoke calls in try-catch blocks
- **Loading states**: Show appropriate UI during async operations

### Material-UI Integration
- **Import strategy**: Import specific components to reduce bundle size
- **Consistent styling**: Use theme-based colors and spacing
- **Responsive design**: Use breakpoints for mobile/desktop layouts
- **Component composition**: Combine multiple MUI components for complex UI
- **Form controls**: Use FormControl, Select, MenuItem for dropdowns

## Future Improvements
- Consider GitHub Actions for automated Windows builds
- Add pre-commit hooks for build verification
- Create a build script that always uses `cargo-tauri build`
- Add resource embedding verification to build process
- Create project template with proper security defaults
- Document required tools for each platform
- Include proper installer creation in CI/CD pipeline
- Add remaining sort options (Date Added, Most Used) with database schema updates
- Implement project validation and error handling
- Add import/export functionality for project data
- Create settings/preferences page for advanced configuration