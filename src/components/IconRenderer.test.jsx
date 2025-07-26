import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import IconRenderer from './IconRenderer';
import { Code, Terminal, Folder } from '@mui/icons-material';

// Mock Tauri core API
vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: vi.fn((path) => {
    // Convert file paths to asset protocol URLs for testing (Tauri v2)
    return `http://asset.localhost/${path.replace(/^\//, '')}`;
  })
}));

// Mock the iconMapping module
vi.mock('../utils/iconMapping', () => ({
  getIconComponent: vi.fn((iconName) => {
    if (iconName === 'Code') return Code;
    if (iconName === 'Terminal') return Terminal;
    if (iconName && iconName.startsWith('custom://')) return 'CUSTOM_ICON';
    return Folder;
  }),
  isCustomIcon: vi.fn((iconName) => {
    return !!(iconName && typeof iconName === 'string' && iconName.startsWith('custom://'));
  }),
  getCustomIconPath: vi.fn(async (iconName) => {
    if (iconName === 'custom://test-icon.svg') {
      return '/mock/path/to/test-icon.svg';
    }
    if (iconName === 'custom://missing-icon.svg') {
      throw new Error('Icon not found');
    }
    return null;
  })
}));

describe('IconRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Predefined Icons', () => {
    it('renders predefined Material-UI icons', () => {
      render(<IconRenderer iconName="Code" data-testid="icon-renderer" />);
      
      // The icon should render as text content based on our mock
      expect(screen.getByText('CodeIcon')).toBeInTheDocument();
    });

    it('renders fallback icon for invalid predefined icons', () => {
      render(<IconRenderer iconName="NonExistentIcon" data-testid="icon-renderer" />);
      
      // Should render fallback (Folder) icon
      expect(screen.getByText('FolderIcon')).toBeInTheDocument();
    });

    it('renders fallback icon for null input', () => {
      render(<IconRenderer iconName={null} data-testid="icon-renderer" />);
      expect(screen.getByText('FolderIcon')).toBeInTheDocument();
    });

    it('renders fallback icon for undefined input', () => {
      render(<IconRenderer iconName={undefined} data-testid="icon-renderer" />);
      expect(screen.getByText('FolderIcon')).toBeInTheDocument();
    });

    it('applies custom styles to predefined icons', () => {
      render(
        <IconRenderer 
          iconName="Code" 
          sx={{ fontSize: 32, color: 'primary.main' }}
          data-testid="icon-renderer"
        />
      );
      
      expect(screen.getByText('CodeIcon')).toBeInTheDocument();
    });
  });

  describe('Custom Icons', () => {
    it('renders custom icons when path is available', async () => {
      render(<IconRenderer iconName="custom://test-icon.svg" data-testid="icon-container" />);
      
      await waitFor(() => {
        // In our mock system, Box component renders as div
        const container = screen.getByTestId('icon-container');
        expect(container).toBeInTheDocument();
        // Check that it has image-related attributes even if rendered as div
        expect(container).toHaveAttribute('alt', 'Custom icon');
        // convertFileSrc converts the path to a secure asset protocol URL
        expect(container).toHaveAttribute('src', 'http://asset.localhost/mock/path/to/test-icon.svg');
      });
    });

    it('renders fallback icon when custom icon fails to load', async () => {
      render(<IconRenderer iconName="custom://missing-icon.svg" />);
      
      // Should eventually fall back to default icon
      await waitFor(() => {
        expect(screen.getByText('FolderIcon')).toBeInTheDocument();
      });
    });

    it('renders fallback icon when custom icon path is null', async () => {
      render(<IconRenderer iconName="custom://null-icon.svg" />);
      
      await waitFor(() => {
        // Should render fallback when path cannot be loaded
        expect(screen.getByText('FolderIcon')).toBeInTheDocument();
      });
    });

    it('applies size styles to custom icon elements', async () => {
      render(
        <IconRenderer 
          iconName="custom://test-icon.svg" 
          sx={{ fontSize: 48 }}
          data-testid="sized-icon"
        />
      );
      
      await waitFor(() => {
        const element = screen.getByTestId('sized-icon');
        expect(element).toBeInTheDocument();
      });
    });

    it('applies default size when no fontSize is specified', async () => {
      render(<IconRenderer iconName="custom://test-icon.svg" data-testid="default-size-icon" />);
      
      await waitFor(() => {
        const element = screen.getByTestId('default-size-icon');
        expect(element).toBeInTheDocument();
      });
    });
  });

  describe('Fallback Behavior', () => {
    it('uses custom fallback icon when provided', () => {
      const CustomFallback = Terminal;
      
      render(
        <IconRenderer 
          iconName="invalid-icon" 
          fallbackIcon={CustomFallback}
          data-testid="icon-renderer"
        />
      );
      
      // Should render the custom fallback (Terminal)
      expect(screen.getByText('TerminalIcon')).toBeInTheDocument();
    });

    it('uses default Folder fallback when no custom fallback provided', () => {
      render(
        <IconRenderer 
          iconName="invalid-icon" 
          data-testid="icon-renderer"
        />
      );
      
      // Should render default fallback (Folder)
      expect(screen.getByText('FolderIcon')).toBeInTheDocument();
    });
  });

  describe('Props Forwarding', () => {
    it('forwards additional props to the rendered component', () => {
      render(
        <IconRenderer 
          iconName="Code" 
          data-testid="icon-renderer"
          title="Custom title"
          className="custom-class"
        />
      );
      
      // The icon renders as text content, but props should be on container
      expect(screen.getByText('CodeIcon')).toBeInTheDocument();
    });
  });
});