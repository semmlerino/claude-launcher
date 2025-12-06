@echo off
echo ========================================
echo Building Claude Launcher Windows .exe
echo ========================================
echo.

REM Run the build through WSL
wsl bash -c "cd /mnt/c/CustomScripts/MyContext/tauri-react-python && export PATH=\"$HOME/.cargo/bin:$PATH\" && npm run tauri build -- --target x86_64-pc-windows-gnu --no-bundle"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Build successful!
    echo Output: src-tauri\target\x86_64-pc-windows-gnu\release\claude-launcher.exe
    echo ========================================
) else (
    echo.
    echo ========================================
    echo Build failed with error code %ERRORLEVEL%
    echo ========================================
)

pause
