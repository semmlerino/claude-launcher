#!/bin/bash
# Proper Tauri release build script

echo "Building Claude Launcher Release..."
echo "=================================="

# Ensure we're in the right directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Set up environment
export PATH="$HOME/.cargo/bin:$PATH"

# Clean previous builds (optional)
# rm -rf dist
# cd src-tauri && cargo clean && cd ..

echo "Building frontend..."
npm run build

echo "Building Tauri app..."
~/.cargo/bin/cargo-tauri build --target x86_64-pc-windows-gnu --no-bundle

echo "=================================="
echo "Build complete!"
echo "Executable location: src-tauri/target/x86_64-pc-windows-gnu/release/claude-launcher.exe"
echo ""
echo "To run: ./claude-launcher.bat"