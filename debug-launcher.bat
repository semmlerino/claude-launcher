@echo off
echo Starting Claude Launcher Debug...
echo.
echo Current Directory: %CD%
echo.

cd /d "C:\CustomScripts\MyContext\tauri-react-python"
echo Changed to: %CD%
echo.

echo Checking dist folder...
dir dist /b 2>nul || echo [ERROR] dist folder not found!
echo.

echo Setting environment variables...
set RUST_LOG=info,wry=debug,tao=debug,tauri=debug
set RUST_BACKTRACE=1

echo.
echo Starting launcher with debug logging...
"src-tauri\target\x86_64-pc-windows-gnu\release\claude-launcher.exe"

echo.
echo Exit code: %ERRORLEVEL%
pause