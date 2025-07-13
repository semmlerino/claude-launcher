# Build and Run Instructions

## Development Mode

To run the Claude Launcher in development mode:

```bash
# Make sure Rust is installed and in PATH
export PATH="$HOME/.cargo/bin:$PATH"

# Install dependencies (if not already done)
npm install

# Run in development mode
npm run tauri dev
```

This will:
1. Start the Vite frontend dev server on http://localhost:1422/
2. Build and run the Tauri backend
3. Open the application window

## Production Build

To create a production build for Windows:

```bash
# Build the application
npm run tauri build
```

This will create:
- MSI installer in `src-tauri/target/release/bundle/msi/`
- NSIS installer in `src-tauri/target/release/bundle/nsis/`

## Testing the Python Sidecar

To test the Python sidecar independently:

```bash
python3 test_python_sidecar.py
```

## Troubleshooting

### Cargo not found
If you get "cargo not found", install Rust:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"
```

### Python errors
Make sure Python 3.11+ is installed:
```bash
python3 --version
```

### Window doesn't appear
On WSL, you might need an X server like VcXsrv or WSLg to display the window.