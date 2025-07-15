@echo off
title Claude - Test Project
echo Claude Launcher - WSL Mode
echo Project: Test Project
echo Path: C:\CustomScripts\MyContext\opus
echo.
wsl -e bash -c "cd \"$(wslpath 'C:\CustomScripts\MyContext\opus')\" && /home/gabrielh/.nvm/versions/node/v24.1.0/bin/claude --dangerously-skip-permissions || echo 'Failed to launch Claude. Exit code: '$?; read -p 'Press Enter to close...'"
pause