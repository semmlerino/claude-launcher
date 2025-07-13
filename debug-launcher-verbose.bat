@echo off
echo ============================================
echo Claude Launcher - Verbose Debug Mode
echo ============================================
echo.

cd /d "C:\CustomScripts\MyContext\tauri-react-python"
echo Working Directory: %CD%
echo.

echo Setting debug environment variables...
set RUST_LOG=debug,tauri=debug,wry=debug,tao=debug,tauri_utils=debug,tauri_runtime=debug
set RUST_BACKTRACE=full

echo.
echo Checking resources...
echo.
echo Dist folder contents:
dir dist /b 2>nul || echo [ERROR] dist folder not found!
echo.

echo Starting launcher with full debug logging...
echo ============================================
echo.

"src-tauri\target\x86_64-pc-windows-gnu\release\claude-launcher.exe" 2>&1

echo.
echo ============================================
echo Exit code: %ERRORLEVEL%
pause