import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import SettingsDialog from './SettingsDialog';

// Mock Tauri core API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

// Helper to render with theme
const renderWithTheme = (ui) => {
  const theme = createTheme({ palette: { mode: 'light' } });
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('SettingsDialog', () => {
  const mockShowSnackbar = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock responses
    invoke.mockImplementation((cmd, args) => {
      if (cmd === 'get_setting') {
        const defaults = {
          use_wsl: 'true',
          claude_executable_path: '/usr/bin/claude',
          keep_terminal_open: 'false',
          wsl_launch_method: 'batch',
        };
        return Promise.resolve(defaults[args.key] || null);
      }
      if (cmd === 'set_setting') {
        return Promise.resolve();
      }
      return Promise.resolve(null);
    });
  });

  describe('Rendering', () => {
    it('renders dialog when open', async () => {
      renderWithTheme(
        <SettingsDialog
          open={true}
          onClose={mockOnClose}
          showSnackbar={mockShowSnackbar}
        />
      );

      expect(screen.getByText('Application Settings')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      renderWithTheme(
        <SettingsDialog
          open={false}
          onClose={mockOnClose}
          showSnackbar={mockShowSnackbar}
        />
      );

      expect(screen.queryByText('Application Settings')).not.toBeInTheDocument();
    });

    it('renders WSL settings section', async () => {
      renderWithTheme(
        <SettingsDialog
          open={true}
          onClose={mockOnClose}
          showSnackbar={mockShowSnackbar}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('WSL Integration (Windows Only)')).toBeInTheDocument();
        expect(screen.getByText('Enable WSL mode')).toBeInTheDocument();
      });
    });
  });

  describe('Settings Loading', () => {
    it('loads settings when dialog opens', async () => {
      renderWithTheme(
        <SettingsDialog
          open={true}
          onClose={mockOnClose}
          showSnackbar={mockShowSnackbar}
        />
      );

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith('get_setting', { key: 'use_wsl' });
        expect(invoke).toHaveBeenCalledWith('get_setting', { key: 'claude_executable_path' });
        expect(invoke).toHaveBeenCalledWith('get_setting', { key: 'keep_terminal_open' });
        expect(invoke).toHaveBeenCalledWith('get_setting', { key: 'wsl_launch_method' });
      });
    });

    it('displays loaded settings values', async () => {
      renderWithTheme(
        <SettingsDialog
          open={true}
          onClose={mockOnClose}
          showSnackbar={mockShowSnackbar}
        />
      );

      await waitFor(() => {
        // Check claude path is displayed
        const pathInput = screen.getByLabelText(/Claude Executable Path/i);
        expect(pathInput).toHaveValue('/usr/bin/claude');
      });
    });
  });

  describe('Settings Saving', () => {
    it('saves settings when Apply is clicked', async () => {
      renderWithTheme(
        <SettingsDialog
          open={true}
          onClose={mockOnClose}
          showSnackbar={mockShowSnackbar}
        />
      );

      // Wait for settings to load
      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith('get_setting', { key: 'use_wsl' });
      });

      // Click Apply
      const applyButton = screen.getByRole('button', { name: /apply/i });
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith('set_setting', expect.objectContaining({ key: 'use_wsl' }));
        expect(invoke).toHaveBeenCalledWith('set_setting', expect.objectContaining({ key: 'claude_executable_path' }));
        expect(mockShowSnackbar).toHaveBeenCalledWith('Settings saved', 'success');
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Form Interactions', () => {
    it('shows WSL options when WSL is enabled', async () => {
      renderWithTheme(
        <SettingsDialog
          open={true}
          onClose={mockOnClose}
          showSnackbar={mockShowSnackbar}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Claude Executable Path/i)).toBeInTheDocument();
        expect(screen.getByText('Launch Method')).toBeInTheDocument();
        expect(screen.getByText(/Keep terminal open/i)).toBeInTheDocument();
      });
    });

    it('hides WSL options when WSL is disabled', async () => {
      invoke.mockImplementation((cmd, args) => {
        if (cmd === 'get_setting' && args.key === 'use_wsl') {
          return Promise.resolve('false');
        }
        return Promise.resolve(null);
      });

      renderWithTheme(
        <SettingsDialog
          open={true}
          onClose={mockOnClose}
          showSnackbar={mockShowSnackbar}
        />
      );

      await waitFor(() => {
        expect(screen.queryByLabelText(/Claude Executable Path/i)).not.toBeInTheDocument();
      });
    });

    it('allows changing the claude executable path', async () => {
      renderWithTheme(
        <SettingsDialog
          open={true}
          onClose={mockOnClose}
          showSnackbar={mockShowSnackbar}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Claude Executable Path/i)).toBeInTheDocument();
      });

      const pathInput = screen.getByLabelText(/Claude Executable Path/i);
      fireEvent.change(pathInput, { target: { value: '/new/path/to/claude' } });

      expect(pathInput).toHaveValue('/new/path/to/claude');
    });
  });

  describe('Button Actions', () => {
    it('calls onClose when Cancel is clicked', async () => {
      renderWithTheme(
        <SettingsDialog
          open={true}
          onClose={mockOnClose}
          showSnackbar={mockShowSnackbar}
        />
      );

      // Wait for dialog to fully render
      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('resets form when Reset is clicked', async () => {
      renderWithTheme(
        <SettingsDialog
          open={true}
          onClose={mockOnClose}
          showSnackbar={mockShowSnackbar}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Claude Executable Path/i)).toBeInTheDocument();
      });

      // Change the path
      const pathInput = screen.getByLabelText(/Claude Executable Path/i);
      fireEvent.change(pathInput, { target: { value: '/changed/path' } });
      expect(pathInput).toHaveValue('/changed/path');

      // Click Reset
      const resetButton = screen.getByText('Reset');
      fireEvent.click(resetButton);

      // Should reset to default value
      await waitFor(() => {
        expect(pathInput).toHaveValue('/home/gabrielh/.nvm/versions/node/v24.1.0/bin/claude');
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error when settings fail to load', async () => {
      invoke.mockRejectedValue(new Error('Network error'));

      renderWithTheme(
        <SettingsDialog
          open={true}
          onClose={mockOnClose}
          showSnackbar={mockShowSnackbar}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load settings')).toBeInTheDocument();
      });
    });

    it('shows error snackbar when save fails', async () => {
      invoke.mockImplementation((cmd) => {
        if (cmd === 'get_setting') {
          return Promise.resolve('true');
        }
        if (cmd === 'set_setting') {
          return Promise.reject(new Error('Save failed'));
        }
        return Promise.resolve(null);
      });

      renderWithTheme(
        <SettingsDialog
          open={true}
          onClose={mockOnClose}
          showSnackbar={mockShowSnackbar}
        />
      );

      await waitFor(() => {
        expect(invoke).toHaveBeenCalled();
      });

      const applyButton = screen.getByRole('button', { name: /apply/i });
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(mockShowSnackbar).toHaveBeenCalledWith(
          expect.stringContaining('Failed to save settings'),
          'error'
        );
      });
    });
  });
});
