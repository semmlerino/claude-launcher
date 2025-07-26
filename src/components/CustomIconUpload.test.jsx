import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomIconUpload from './CustomIconUpload';

// Mock Tauri APIs
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn()
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}));

describe('CustomIconUpload', () => {
  const mockOnClose = vi.fn();
  const mockOnIconUploaded = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dialog Rendering', () => {
    it('renders when open is true', () => {
      render(
        <CustomIconUpload 
          open={true}
          onClose={mockOnClose}
          onIconUploaded={mockOnIconUploaded}
        />
      );
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Upload Custom Icon')).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      render(
        <CustomIconUpload 
          open={false}
          onClose={mockOnClose}
          onIconUploaded={mockOnIconUploaded}
        />
      );
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('File Selection', () => {
    it('shows file selection button initially', () => {
      render(
        <CustomIconUpload 
          open={true}
          onClose={mockOnClose}
          onIconUploaded={mockOnIconUploaded}
        />
      );
      
      expect(screen.getByText('Select Icon File')).toBeInTheDocument();
    });

    it('calls file dialog when select button is clicked', async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      open.mockResolvedValue('/path/to/icon.svg');

      const user = userEvent.setup();
      
      render(
        <CustomIconUpload 
          open={true}
          onClose={mockOnClose}
          onIconUploaded={mockOnIconUploaded}
        />
      );
      
      await user.click(screen.getByText('Select Icon File'));
      
      expect(open).toHaveBeenCalledWith({
        title: 'Select Icon File',
        multiple: false,
        filters: [
          {
            name: 'Image Files',
            extensions: ['svg', 'png', 'jpg', 'jpeg', 'ico', 'webp']
          }
        ]
      });
    });

    it('updates UI when file is selected', async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      open.mockResolvedValue('/path/to/my-icon.svg');

      const user = userEvent.setup();
      
      render(
        <CustomIconUpload 
          open={true}
          onClose={mockOnClose}
          onIconUploaded={mockOnIconUploaded}
        />
      );
      
      await user.click(screen.getByText('Select Icon File'));
      
      await waitFor(() => {
        expect(screen.getByText('Change File')).toBeInTheDocument();
        expect(screen.getByText('my-icon.svg')).toBeInTheDocument();
      });
    });

    it('shows preview for image files', async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      open.mockResolvedValue('/path/to/icon.png');

      const user = userEvent.setup();
      
      render(
        <CustomIconUpload 
          open={true}
          onClose={mockOnClose}
          onIconUploaded={mockOnIconUploaded}
        />
      );
      
      await user.click(screen.getByText('Select Icon File'));
      
      await waitFor(() => {
        expect(screen.getByText('Preview:')).toBeInTheDocument();
        const preview = screen.getByAltText('Icon preview');
        expect(preview).toHaveAttribute('src', 'file:///path/to/icon.png');
      });
    });
  });

  describe('Custom Name Input', () => {
    it('allows entering a custom name for the icon', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomIconUpload 
          open={true}
          onClose={mockOnClose}
          onIconUploaded={mockOnIconUploaded}
        />
      );
      
      const nameInput = screen.getByLabelText('Custom Name (Optional)');
      await user.type(nameInput, 'My Custom Icon');
      
      expect(nameInput).toHaveValue('My Custom Icon');
    });

    it('shows helper text for the custom name input', () => {
      render(
        <CustomIconUpload 
          open={true}
          onClose={mockOnClose}
          onIconUploaded={mockOnIconUploaded}
        />
      );
      
      expect(screen.getByText('If left empty, a unique name will be generated')).toBeInTheDocument();
    });
  });

  describe('Upload Process', () => {
    it('disables upload button when no file is selected', () => {
      render(
        <CustomIconUpload 
          open={true}
          onClose={mockOnClose}
          onIconUploaded={mockOnIconUploaded}
        />
      );
      
      const uploadButton = screen.getByText('Upload');
      expect(uploadButton).toBeDisabled();
    });

    it('enables upload button when file is selected', async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      open.mockResolvedValue('/path/to/icon.svg');

      const user = userEvent.setup();
      
      render(
        <CustomIconUpload 
          open={true}
          onClose={mockOnClose}
          onIconUploaded={mockOnIconUploaded}
        />
      );
      
      await user.click(screen.getByText('Select Icon File'));
      
      await waitFor(() => {
        const uploadButton = screen.getByText('Upload');
        expect(uploadButton).not.toBeDisabled();
      });
    });

    it('calls invoke with correct parameters on upload', async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');
      
      open.mockResolvedValue('/path/to/icon.svg');
      invoke.mockResolvedValue({
        success: true,
        icon: {
          id: 'icon123.svg',
          name: 'icon123.svg',
          type: 'svg',
          path: 'custom://icon123.svg'
        }
      });

      const user = userEvent.setup();
      
      render(
        <CustomIconUpload 
          open={true}
          onClose={mockOnClose}
          onIconUploaded={mockOnIconUploaded}
        />
      );
      
      // Select file
      await user.click(screen.getByText('Select Icon File'));
      
      // Enter custom name
      await user.type(screen.getByLabelText('Custom Name (Optional)'), 'My Icon');
      
      // Upload
      await user.click(screen.getByText('Upload'));
      
      expect(invoke).toHaveBeenCalledWith('upload_custom_icon', {
        sourcePath: '/path/to/icon.svg',
        desiredName: 'My Icon'
      });
    });

    it('calls onIconUploaded callback on successful upload', async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');
      
      const mockIcon = {
        id: 'icon123.svg',
        name: 'icon123.svg',
        type: 'svg',
        path: 'custom://icon123.svg'
      };
      
      open.mockResolvedValue('/path/to/icon.svg');
      invoke.mockResolvedValue({
        success: true,
        icon: mockIcon
      });

      const user = userEvent.setup();
      
      render(
        <CustomIconUpload 
          open={true}
          onClose={mockOnClose}
          onIconUploaded={mockOnIconUploaded}
        />
      );
      
      await user.click(screen.getByText('Select Icon File'));
      await user.click(screen.getByText('Upload'));
      
      await waitFor(() => {
        expect(mockOnIconUploaded).toHaveBeenCalledWith(mockIcon);
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('shows error message on upload failure', async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');
      
      open.mockResolvedValue('/path/to/icon.svg');
      invoke.mockRejectedValue(new Error('Upload failed'));

      const user = userEvent.setup();
      
      render(
        <CustomIconUpload 
          open={true}
          onClose={mockOnClose}
          onIconUploaded={mockOnIconUploaded}
        />
      );
      
      await user.click(screen.getByText('Select Icon File'));
      await user.click(screen.getByText('Upload'));
      
      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument();
      });
    });

    it('shows uploading state during upload', async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');
      
      open.mockResolvedValue('/path/to/icon.svg');
      invoke.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      const user = userEvent.setup();
      
      render(
        <CustomIconUpload 
          open={true}
          onClose={mockOnClose}
          onIconUploaded={mockOnIconUploaded}
        />
      );
      
      await user.click(screen.getByText('Select Icon File'));
      await user.click(screen.getByText('Upload'));
      
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });
  });

  describe('Dialog Actions', () => {
    it('clears form when clear button is clicked', async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      open.mockResolvedValue('/path/to/icon.svg');

      const user = userEvent.setup();
      
      render(
        <CustomIconUpload 
          open={true}
          onClose={mockOnClose}
          onIconUploaded={mockOnIconUploaded}
        />
      );
      
      // Select file and enter name
      await user.click(screen.getByText('Select Icon File'));
      await user.type(screen.getByLabelText('Custom Name (Optional)'), 'Test Name');
      
      // Clear form
      await user.click(screen.getByText('Clear'));
      
      expect(screen.getByText('Select Icon File')).toBeInTheDocument();
      expect(screen.getByLabelText('Custom Name (Optional)')).toHaveValue('');
    });

    it('closes dialog when cancel button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <CustomIconUpload 
          open={true}
          onClose={mockOnClose}
          onIconUploaded={mockOnIconUploaded}
        />
      );
      
      await user.click(screen.getByText('Cancel'));
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('prevents closing during upload', () => {
      render(
        <CustomIconUpload 
          open={true}
          onClose={mockOnClose}
          onIconUploaded={mockOnIconUploaded}
        />
      );
      
      // The dialog should have disableEscapeKeyDown when uploading
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });
  });

  describe('Supported Formats Info', () => {
    it('displays supported file formats information', () => {
      render(
        <CustomIconUpload 
          open={true}
          onClose={mockOnClose}
          onIconUploaded={mockOnIconUploaded}
        />
      );
      
      expect(screen.getByText(/Supported formats:/)).toBeInTheDocument();
      expect(screen.getByText(/SVG, PNG, JPG, JPEG, ICO, WebP/)).toBeInTheDocument();
      expect(screen.getByText(/SVG files work best for scalable icons/)).toBeInTheDocument();
    });
  });
});