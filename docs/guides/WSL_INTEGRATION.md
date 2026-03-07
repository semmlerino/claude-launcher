# WSL Integration for Claude Launcher

## Overview
The Claude Launcher now supports launching Claude Code through WSL (Windows Subsystem for Linux) on Windows systems. This allows users who have Claude installed in their WSL environment to seamlessly launch projects.

## Configuration
WSL integration is configured through the following settings in the database:

- `use_wsl`: Boolean to enable/disable WSL mode (default: `true` on Windows)
- `claude_executable_path`: Path to claude executable in WSL (default: `/home/gabrielh/.nvm/versions/node/v24.1.0/bin/claude`)
- `keep_terminal_open`: Boolean to keep terminal open after launching (default: `false`)
- `wsl_launch_method`: Launch method to use (default: `batch`, options: `batch`, `wt`, `powershell`)

## How It Works

### Batch File Method (Default)
The launcher creates a temporary batch file to ensure reliable command execution:
1. Creates a `.bat` file in the temp directory with the exact WSL command
2. Executes the batch file using `cmd /c`
3. Automatically cleans up the batch file after 5 seconds
4. Shows clear debug output and error messages

This method avoids complex shell escaping issues and provides the most reliable execution.

### Command Format
The generated WSL command follows this pattern:
```bash
wsl -e bash -c "cd \"$(wslpath 'WINDOWS_PATH')\" && CLAUDE_PATH --dangerously-skip-permissions [--continue] [&& exec bash]"
```

## Future Enhancements
To make WSL configuration more user-friendly, consider adding UI settings:

1. **Settings Page Component** (`src/components/Settings.jsx`):
```jsx
// Add WSL settings section
{isWindows && (
  <Box>
    <Typography variant="h6">WSL Integration</Typography>
    <FormControlLabel
      control={<Switch checked={useWsl} onChange={handleWslToggle} />}
      label="Use WSL for Claude"
    />
    <TextField
      label="Claude Executable Path"
      value={claudePath}
      onChange={handleClaudePathChange}
      disabled={!useWsl}
      fullWidth
      helperText="Path to claude executable in WSL"
    />
    <FormControlLabel
      control={<Checkbox checked={keepTerminal} onChange={handleKeepTerminalToggle} />}
      label="Keep terminal open after launch"
      disabled={!useWsl}
    />
  </Box>
)}
```

2. **Backend API**: The settings commands (`get_setting`, `set_setting`) are already implemented and ready to use.

3. **Platform Detection**: Add a function to detect if running on Windows:
```javascript
const isWindows = await invoke('get_platform') === 'windows';
```

## Testing
To test WSL integration:
1. Ensure WSL is installed and Claude is available at the configured path
2. Launch a project and verify it opens in WSL
3. Test with the continue flag
4. Verify path conversion works for different drive letters

## Troubleshooting
- If launch fails, check that WSL is installed: `wsl --list`
- Verify Claude is accessible: `wsl -e bash -c "/path/to/claude --version"`
- Check Windows Defender or antivirus isn't blocking WSL execution