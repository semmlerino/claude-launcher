@echo off
echo Testing WSL command format...
echo.

REM Test the exact command structure we're using
cmd /c start "Claude Test" "" wsl -e bash -c "echo 'Test successful!' && read -p 'Press Enter to close...'"

echo.
echo If a terminal window opened and showed 'Test successful!', the command format is correct.
pause