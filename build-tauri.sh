#!/bin/bash
export PATH="$HOME/.cargo/bin:$PATH"
export RUST_LOG=debug

echo "Building frontend..."
npm run build

echo "Building Tauri app..."
cd src-tauri
cargo build --release --target x86_64-pc-windows-gnu

echo "Build complete!"