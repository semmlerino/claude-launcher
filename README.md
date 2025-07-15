# Claude Launcher

A fast, native Windows desktop launcher for Claude Code projects, built with Tauri and React.

## Features

- 🚀 **Quick Launch** - Launch Claude Code projects with one click
- 📁 **Project Management** - Add, organize, and manage your coding projects
- 🏷️ **Tags & Notes** - Organize projects with custom tags and notes
- ⭐ **Pin Favorites** - Pin frequently used projects to the top
- 🕐 **Recent Projects** - Automatically tracks your 5 most recent projects
- 🔍 **Smart Search** - Fuzzy search across names, tags, notes, and paths
- 🎨 **Modern UI** - Clean Material-UI interface with light/dark theme support
- ⌨️ **Keyboard Navigation** - Navigate projects using arrow keys
- 💾 **Persistent Storage** - SQLite database stores all project data

## Tech Stack

- **Frontend**: React 18 + Material-UI + TypeScript
- **Backend**: Rust (Tauri 2.0)
- **Database**: SQLite with rusqlite
- **Build**: Vite + Tauri CLI

## Why Rust Instead of Python?

Originally designed with a Python sidecar, we switched to pure Rust for:
- **Simpler architecture** - No IPC complexity or process management
- **Better performance** - Direct function calls vs process communication
- **Smaller binaries** - ~15MB vs ~50MB+ with Python bundled
- **Easier distribution** - Single executable, no runtime dependencies
- **More reliable** - No cross-process communication failures

## Installation

### From Release (Recommended)

Download the latest `.msi` installer from the [Releases](https://github.com/your-repo/releases) page and run it.

### From Source

Prerequisites:
- Node.js 16+
- Rust (latest stable)
- Windows SDK

```bash
# Clone the repository
git clone https://github.com/your-repo/claude-launcher.git
cd claude-launcher

# Install dependencies
npm install

# Run in development
npm run tauri dev

# Build for production
npm run tauri build
```

## Usage

1. **Add Projects**: Click the + button or drag folders into the app
2. **Launch Projects**: Click "Launch" on any project card
3. **Continue Session**: Check "Continue" to use the `--continue` flag
4. **Edit Details**: Click the edit icon to modify name, tags, or notes
5. **Pin Projects**: Click the star icon to pin to the top
6. **Search**: Use the search bar to filter projects

### Keyboard Shortcuts

- **Arrow Keys**: Navigate between project cards
- **Enter**: Launch the selected project
- **Tab**: Move focus between elements

## Data Storage

Project data is stored in a SQLite database at:
- Windows: `%APPDATA%\ClaudeLauncher\projects.db`
- Linux/Mac: `~/.local/share/claude-launcher/projects.db`

## Development

### Project Structure

```
├── src/                    # React frontend
│   ├── components/         # React components
│   ├── App.jsx            # Main app component
│   └── main.jsx           # Entry point
├── src-tauri/             # Rust backend
│   ├── src/
│   │   └── lib.rs         # Tauri commands & SQLite logic
│   └── tauri.conf.json    # Tauri configuration
└── package.json           # Node dependencies
```

### Building

```bash
# Development
npm run tauri dev

# Production build
npm run tauri build

# Build MSI installer only
npm run tauri build -- --bundles msi
```

## Troubleshooting

### Claude Code Not Found

If you see "Claude Code is not installed or not in PATH":
1. Ensure Claude Code is installed
2. Add it to your system PATH
3. Restart the launcher

The app tries these command names:
- `claude-code`
- `claude`
- `claude-cli`

### Database Issues

If projects aren't saving:
1. Check `%APPDATA%\ClaudeLauncher\` exists
2. Delete `projects.db` to reset the database
3. Restart the application

## Testing

The project includes comprehensive unit and integration tests. See [TESTING.md](TESTING.md) for detailed testing documentation.

```bash
# Run frontend tests
npm test

# Run backend tests
npm run test:rust

# Run all tests with coverage
npm run test:coverage
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. Make sure to:
1. Add tests for new features
2. Run the test suite before submitting
3. Follow the existing code style
4. Update documentation as needed

## License

MIT License - see LICENSE file for details