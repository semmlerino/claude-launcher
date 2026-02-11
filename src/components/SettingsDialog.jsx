import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
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

const SettingsDialog = ({ open, onClose, showSnackbar }) => {
  const [useWsl, setUseWsl] = useState(true);
  const [keepTerminalOpen, setKeepTerminalOpen] = useState(false);
  const [wslLaunchMethod, setWslLaunchMethod] = useState('batch');
  const [hotkeyEnabled, setHotkeyEnabled] = useState(false);
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
      const [wsl, keepOpen, method, hotkey] = await Promise.all([
        invoke('get_setting', { key: 'use_wsl' }),
        invoke('get_setting', { key: 'keep_terminal_open' }),
        invoke('get_setting', { key: 'wsl_launch_method' }),
        invoke('get_setting', { key: 'hotkey_enabled' }),
      ]);
      setUseWsl(wsl !== 'false'); // default true
      setKeepTerminalOpen(keepOpen === 'true');
      setWslLaunchMethod(method || 'batch');
      setHotkeyEnabled(hotkey === 'true');
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
    setKeepTerminalOpen(false);
    setWslLaunchMethod('batch');
    // Note: hotkeyEnabled is not reset here because it saves immediately on toggle
    setLoadError(null);
  };

  const handleHotkeyToggle = async (enabled) => {
    try {
      await invoke('toggle_global_hotkey', { enabled });
      setHotkeyEnabled(enabled);
      showSnackbar(
        `Global hotkey ${enabled ? 'enabled' : 'disabled'}`,
        'success'
      );
    } catch (error) {
      console.error('Failed to toggle hotkey:', error);
      showSnackbar(`Failed to toggle hotkey: ${error}`, 'error');
    }
  };

  const handleResetWindow = async () => {
    try {
      await invoke('reset_window_state');
      showSnackbar('Window position reset to defaults', 'success');
    } catch (error) {
      console.error('Failed to reset window:', error);
      showSnackbar(`Failed to reset window: ${error}`, 'error');
    }
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

        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mt: 3 }}>
          Global Hotkey
        </Typography>

        <FormControlLabel
          control={
            <Switch
              checked={hotkeyEnabled}
              onChange={e => handleHotkeyToggle(e.target.checked)}
              disabled={loading}
            />
          }
          label="Enable Ctrl+Shift+Space to summon window"
        />

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 2, mt: 1 }}>
          Press Ctrl+Shift+Space from any application to bring launcher window to focus.
          On macOS, use Cmd+Shift+Space.
        </Typography>

        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mt: 3 }}>
          Window Position
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Window size and position are automatically saved. If the window appears off-screen
          after monitor changes, reset to defaults.
        </Typography>

        <Button
          variant="outlined"
          onClick={handleResetWindow}
          disabled={loading}
          fullWidth
        >
          Reset Window Position
        </Button>
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
