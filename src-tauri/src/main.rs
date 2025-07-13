// Prevents additional console window on Windows in release, DO NOT REMOVE!!
// Temporarily comment out to see console output
// #![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    println!("Claude Launcher starting from main.rs...");
    println!("Current directory: {:?}", std::env::current_dir());
    println!("Executable path: {:?}", std::env::current_exe());
    claude_launcher_lib::run()
}
