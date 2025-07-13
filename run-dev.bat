@echo off
cd /d "C:\CustomScripts\MyContext\tauri-react-python"
echo Running Claude Launcher from correct directory...
echo Current directory: %CD%
"src-tauri\target\x86_64-pc-windows-gnu\debug\claude-launcher.exe"
pause