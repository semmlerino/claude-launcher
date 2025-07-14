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

## Cross-Compilation (WSL to Windows)

To build a Windows executable from WSL:

```bash
# Add Rust Windows target
rustup target add x86_64-pc-windows-gnu

# Build Windows executable
npm run tauri build -- --target x86_64-pc-windows-gnu --no-bundle
```

The executable will be created in `src-tauri/target/x86_64-pc-windows-gnu/release/`

## Troubleshooting

### Cargo not found
If you get "cargo not found", install Rust:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"
```

### Build timeouts
Initial builds can take 10+ minutes compiling 550+ Rust dependencies. Use generous timeouts:
```bash
# Use longer timeout for first build
npm run tauri dev
```

### WSL PATH issues
If Rust tools aren't found in WSL:
```bash
export PATH="$HOME/.cargo/bin:$PATH"
```

### Window doesn't appear
On WSL, you might need an X server like VcXsrv or WSLg to display the window.