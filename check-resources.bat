@echo off
echo Checking Tauri Resources...
echo.

cd /d "C:\CustomScripts\MyContext\tauri-react-python\src-tauri\target\x86_64-pc-windows-gnu\release"

echo Current directory: %CD%
echo.

echo Checking for resources...
if exist resources (
    echo Resources folder found!
    dir resources /b
) else (
    echo [WARNING] No resources folder found
)

echo.
echo Checking for _up_ folder...
if exist _up_ (
    echo _up_ folder found!
    dir _up_ /b
) else (
    echo [WARNING] No _up_ folder found
)

echo.
echo Checking exe size (should be large if resources are embedded)...
for %%I in (claude-launcher.exe) do echo Size: %%~zI bytes

pause