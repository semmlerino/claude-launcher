# PowerShell script to run Claude Launcher
Write-Host "Claude Launcher - Windows PowerShell Runner" -ForegroundColor Green
Write-Host ""

# Set working directory
Set-Location "C:\CustomScripts\MyContext\tauri-react-python"
Write-Host "Working Directory: $(Get-Location)" -ForegroundColor Yellow

# Set environment variables
$env:RUST_LOG = "debug"
$env:RUST_BACKTRACE = "1"

Write-Host ""
Write-Host "Starting Claude Launcher..." -ForegroundColor Green
Write-Host ""

# Run the executable
& ".\src-tauri\target\x86_64-pc-windows-gnu\release\claude-launcher.exe"

Write-Host ""
Write-Host "Exit Code: $LASTEXITCODE" -ForegroundColor Yellow
Read-Host "Press Enter to exit"