import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  FormControl,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  InputLabel,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import { invoke } from '@tauri-apps/api/core';

const WSL_LAUNCH_METHODS = [
  { value: 'batch', label: 'Batch File (Default)' },
  { value: 'wt', label: 'Windows Terminal' },
  { value: 'powershell', label: 'PowerShell' },
];

const DEFAULT_CLAUDE_PATH = '/home/gabrielh/.nvm/versions/node/v24.1.0/bin/claude';

const SettingsDialog = ({ open, onClose, showSnackbar }) => {
  const [useWsl, setUseWsl] = useState(true);
  const [claudeExecutablePath, setClaudeExecutablePath] = useState(DEFAULT_CLAUDE_PATH);
  const [keepTerminalOpen, setKeepTerminalOpen] = useState(false);
  const [wslLaunchMethod, setWslLaunchMethod] = useState('batch');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Load settings when dialog opens
  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [wsl, path, keepOpen, method] = await Promise.all([
        invoke('get_setting', { key: 'use_wsl' }),
        invoke('get_setting', { key: 'claude_executable_path' }),
        invoke('get_setting', { key: 'keep_terminal_open' }),
        invoke('get_setting', { key: 'wsl_launch_method' }),
      ]);
      setUseWsl(wsl !== 'false'); // default true
      setClaudeExecutablePath(path || DEFAULT_CLAUDE_PATH);
      setKeepTerminalOpen(keepOpen === 'true');
      setWslLaunchMethod(method || 'batch');
    } catch (error) {
      console.error('Failed to load settings:', error);
      setLoadError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await Promise.all([
        invoke('set_setting', { key: 'use_wsl', value: useWsl ? 'true' : 'false' }),
        invoke('set_setting', { key: 'claude_executable_path', value: claudeExecutablePath }),
        invoke('set_setting', { key: 'keep_terminal_open', value: keepTerminalOpen ? 'true' : 'false' }),
        invoke('set_setting', { key: 'wsl_launch_method', value: wslLaunchMethod }),
      ]);
      showSnackbar('Settings saved', 'success');
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
      showSnackbar(`Failed to save settings: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setUseWsl(true);
    setClaudeExecutablePath(DEFAULT_CLAUDE_PATH);
    setKeepTerminalOpen(false);
    setWslLaunchMethod('batch');
    setLoadError(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <SettingsIcon />
          Application Settings
        </Box>
      </DialogTitle>
      <DialogContent>
        {loadError && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={loadSettings}>
                Retry
              </Button>
            }
          >
            {loadError}
          </Alert>
        )}

        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
          WSL Integration (Windows Only)
        </Typography>

        <FormControlLabel
          control={
            <Switch
              checked={useWsl}
              onChange={e => setUseWsl(e.target.checked)}
              disabled={loading}
            />
          }
          label="Enable WSL mode"
        />

        {useWsl && (
          <Box sx={{ ml: 2, mt: 2 }}>
            <TextField
              fullWidth
              label="Claude Executable Path"
              value={claudeExecutablePath}
              onChange={e => setClaudeExecutablePath(e.target.value)}
              placeholder="/home/user/.nvm/versions/node/v24.1.0/bin/claude"
              helperText="Path to claude executable inside WSL"
              disabled={loading}
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="wsl-launch-method-label">Launch Method</InputLabel>
              <Select
                labelId="wsl-launch-method-label"
                value={wslLaunchMethod}
                label="Launch Method"
                onChange={e => setWslLaunchMethod(e.target.value)}
                disabled={loading}
              >
                {WSL_LAUNCH_METHODS.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={keepTerminalOpen}
                  onChange={e => setKeepTerminalOpen(e.target.checked)}
                  disabled={loading}
                />
              }
              label="Keep terminal open after Claude exits"
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleReset} disabled={loading}>
          Reset
        </Button>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {loading ? 'Saving...' : 'Apply'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsDialog;
