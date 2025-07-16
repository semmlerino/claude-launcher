import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { randomFillSync } from 'crypto';

// Clean up DOM after each test
afterEach(() => {
  cleanup();
});

// Polyfill crypto for jsdom
Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: function (buffer) {
      return randomFillSync(buffer);
    },
  },
});

// Mock MUI Lab's Masonry component which causes hanging in jsdom
vi.mock('@mui/lab', () => ({
  Masonry: ({ children, ...props }) => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'mock-masonry', ...props }, children);
  }
}));

// Mock Material UI components that cause hanging but keep semantic behavior
vi.mock('@mui/material', () => ({
  // Theme providers - essential for context
  ThemeProvider: ({ children }) => children,
  createTheme: (options = {}) => ({
    palette: {
      mode: 'light',
      primary: { main: '#1976d2' },
      secondary: { main: '#dc004e' },
      background: { default: '#f5f5f5', paper: '#fff' },
      text: { primary: '#000', secondary: '#666' },
      error: { main: '#f44336' },
      action: { hover: '#f5f5f5' },
      divider: '#e0e0e0',
      ...(options.palette || {})
    },
    spacing: (factor) => `${8 * factor}px`,
    shape: { borderRadius: 4 },
    ...options
  }),
  useTheme: () => ({ 
    palette: { 
      mode: 'light',
      primary: { main: '#1976d2' },
      secondary: { main: '#dc004e' },
      background: { default: '#f5f5f5', paper: '#fff' },
      text: { primary: '#000', secondary: '#666' }
    }, 
    spacing: (factor) => `${8 * factor}px`,
    shape: { borderRadius: 4 },
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 960,
        lg: 1280,
        xl: 1920,
      },
      up: (key) => `(min-width:${
        typeof key === 'number' ? key : { xs: 0, sm: 600, md: 960, lg: 1280, xl: 1920 }[key]
      }px)`,
      down: (key) => `(max-width:${
        typeof key === 'number' ? key - 0.05 : { xs: 599.95, sm: 959.95, md: 1279.95, lg: 1919.95, xl: 10000 }[key]
      }px)`,
      between: (start, end) => `(min-width:${
        typeof start === 'number' ? start : { xs: 0, sm: 600, md: 960, lg: 1280, xl: 1920 }[start]
      }px) and (max-width:${
        typeof end === 'number' ? end - 0.05 : { xs: 599.95, sm: 959.95, md: 1279.95, lg: 1919.95, xl: 10000 }[end]
      }px)`,
      only: (key) => {
        const keys = ['xs', 'sm', 'md', 'lg', 'xl'];
        const index = keys.indexOf(key);
        if (index === keys.length - 1) {
          return `(min-width:${{ xs: 0, sm: 600, md: 960, lg: 1280, xl: 1920 }[key]}px)`;
        }
        return `(min-width:${{ xs: 0, sm: 600, md: 960, lg: 1280, xl: 1920 }[key]}px) and (max-width:${
          { xs: 599.95, sm: 959.95, md: 1279.95, lg: 1919.95, xl: 10000 }[keys[index + 1]]
        }px)`;
      }
    },
    shadows: [
      'none',
      '0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)',
      '0px 3px 1px -2px rgba(0,0,0,0.2),0px 2px 2px 0px rgba(0,0,0,0.14),0px 1px 5px 0px rgba(0,0,0,0.12)',
      '0px 3px 3px -2px rgba(0,0,0,0.2),0px 3px 4px 0px rgba(0,0,0,0.14),0px 1px 8px 0px rgba(0,0,0,0.12)',
      '0px 2px 4px -1px rgba(0,0,0,0.2),0px 4px 5px 0px rgba(0,0,0,0.14),0px 1px 10px 0px rgba(0,0,0,0.12)',
      '0px 3px 5px -1px rgba(0,0,0,0.2),0px 5px 8px 0px rgba(0,0,0,0.14),0px 1px 14px 0px rgba(0,0,0,0.12)',
      '0px 3px 5px -1px rgba(0,0,0,0.2),0px 6px 10px 0px rgba(0,0,0,0.14),0px 1px 18px 0px rgba(0,0,0,0.12)',
      '0px 4px 5px -2px rgba(0,0,0,0.2),0px 7px 10px 1px rgba(0,0,0,0.14),0px 2px 16px 1px rgba(0,0,0,0.12)',
      '0px 5px 5px -3px rgba(0,0,0,0.2),0px 8px 10px 1px rgba(0,0,0,0.14),0px 3px 14px 2px rgba(0,0,0,0.12)'
    ]
  }),
  
  useMediaQuery: () => false,
  
  // Basic components with semantic behavior
  Box: require('react').forwardRef(({ children, component = 'div', ...props }, ref) => {
    const React = require('react');
    const { sx, ...domProps } = props;
    return React.createElement(component, { ...domProps, ref }, children);
  }),
  
  Typography: ({ children, variant, component, ...props }) => {
    const React = require('react');
    let tag = component || 'p';
    if (variant && !component) {
      switch (variant) {
        case 'h1': tag = 'h1'; break;
        case 'h2': tag = 'h2'; break;
        case 'h3': tag = 'h3'; break;
        case 'h4': tag = 'h4'; break;
        case 'h5': tag = 'h5'; break;
        case 'h6': tag = 'h6'; break;
        case 'caption': tag = 'small'; break;
        default: tag = 'p';
      }
    }
    const { sx, color, gutterBottom, noWrap, fontWeight, fontStyle, ...domProps } = props;
    return React.createElement(tag, domProps, children);
  },
  
  Button: ({ children, startIcon, endIcon, ...props }) => {
    const React = require('react');
    const { sx, color, variant, ...domProps } = props;
    return React.createElement('button', domProps, 
      startIcon ? React.createElement(React.Fragment, {}, startIcon, ' ', children) : children
    );
  },
  
  // Form components with semantic roles
  TextField: ({ InputProps, inputProps, ...props }) => {
    const React = require('react');
    const { sx, label, fullWidth, multiline, rows, variant, size, ...domProps } = props;
    const finalProps = { ...domProps, ...inputProps };
    return React.createElement(multiline ? 'textarea' : 'input', finalProps);
  },
  
  Checkbox: (props) => {
    const React = require('react');
    const { sx, ...domProps } = props;
    return React.createElement('input', { type: 'checkbox', ...domProps });
  },
  
  IconButton: ({ children, ...props }) => {
    const React = require('react');
    const { sx, color, size, edge, ...domProps } = props;
    return React.createElement('button', domProps, children);
  },
  
  // Card components
  Card: ({ children, ...props }) => {
    const React = require('react');
    const { sx, ...domProps } = props;
    return React.createElement('div', domProps, children);
  },
  
  CardContent: ({ children, ...props }) => {
    const React = require('react');
    const { sx, ...domProps } = props;
    return React.createElement('div', domProps, children);
  },
  
  CardActions: ({ children, ...props }) => {
    const React = require('react');
    const { sx, ...domProps } = props;
    return React.createElement('div', domProps, children);
  },
  
  // Other essential components
  Chip: ({ label, ...props }) => {
    const React = require('react');
    const { sx, clickable, color, size, variant, ...domProps } = props;
    return React.createElement('span', domProps, label);
  },
  
  CircularProgress: (props) => {
    const React = require('react');
    const { sx, ...domProps } = props;
    return React.createElement('div', { role: 'progressbar', ...domProps });
  },
  
  FormControlLabel: ({ control, label, ...props }) => {
    const React = require('react');
    const { sx, ...domProps } = props;
    return React.createElement('label', domProps, 
      React.createElement(React.Fragment, {}, control, ' ', label)
    );
  },
  
  Tooltip: ({ children, title, ...props }) => {
    // Just return children without tooltip behavior
    return children;
  },
  
  Divider: (props) => {
    const React = require('react');
    const { sx, ...domProps } = props;
    return React.createElement('hr', domProps);
  },
  
  // Dialog components
  Dialog: ({ children, open, ...props }) => {
    const React = require('react');
    const { sx, ...domProps } = props;
    return open ? React.createElement('div', { role: 'dialog', ...domProps }, children) : null;
  },
  
  DialogTitle: ({ children, ...props }) => {
    const React = require('react');
    const { sx, ...domProps } = props;
    return React.createElement('h2', domProps, children);
  },
  
  DialogContent: ({ children, ...props }) => {
    const React = require('react');
    const { sx, ...domProps } = props;
    return React.createElement('div', domProps, children);
  },
  
  DialogContentText: ({ children, ...props }) => {
    const React = require('react');
    const { sx, ...domProps } = props;
    return React.createElement('p', domProps, children);
  },
  
  DialogActions: ({ children, ...props }) => {
    const React = require('react');
    const { sx, ...domProps } = props;
    return React.createElement('div', domProps, children);
  },
  
  // Layout components
  Grid: ({ children, ...props }) => {
    const React = require('react');
    const { sx, container, item, xs, sm, md, lg, xl, spacing, ...domProps } = props;
    return React.createElement('div', domProps, children);
  },
  
  Paper: ({ children, ...props }) => {
    const React = require('react');
    const { sx, elevation, variant, ...domProps } = props;
    return React.createElement('div', domProps, children);
  },
  
  InputAdornment: ({ children, position, ...props }) => {
    const React = require('react');
    const { sx, ...domProps } = props;
    return React.createElement('div', domProps, children);
  },
  
  // App-specific components
  CssBaseline: () => null,
  
  AppBar: ({ children, ...props }) => {
    const React = require('react');
    const { sx, position, ...domProps } = props;
    return React.createElement('header', domProps, children);
  },
  
  Toolbar: ({ children, ...props }) => {
    const React = require('react');
    const { sx, ...domProps } = props;
    return React.createElement('div', domProps, children);
  },
  
  Container: ({ children, ...props }) => {
    const React = require('react');
    const { sx, maxWidth, ...domProps } = props;
    return React.createElement('div', domProps, children);
  },
  
  Fab: ({ children, ...props }) => {
    const React = require('react');
    const { sx, color, size, ...domProps } = props;
    return React.createElement('button', domProps, children);
  },
  
  Snackbar: ({ children, open, ...props }) => {
    const React = require('react');
    const { sx, autoHideDuration, anchorOrigin, ...domProps } = props;
    return open ? React.createElement('div', domProps, children) : null;
  },
  
  Alert: ({ children, ...props }) => {
    const React = require('react');
    const { sx, severity, ...domProps } = props;
    return React.createElement('div', { role: 'alert', ...domProps }, children);
  },
  
  // Form components
  Select: ({ children, value, onChange, ...props }) => {
    const React = require('react');
    const { sx, label, startAdornment, ...domProps } = props;
    return React.createElement('select', { 
      value, 
      onChange,
      ...domProps,
      role: 'combobox'
    }, children);
  },
  
  FormControl: ({ children, ...props }) => {
    const React = require('react');
    const { sx, ...domProps } = props;
    return React.createElement('div', domProps, children);
  },
  
  InputLabel: ({ children, ...props }) => {
    const React = require('react');
    const { sx, ...domProps } = props;
    return React.createElement('label', domProps, children);
  },
  
  // Keep these for now - may cause issues if removed
  Menu: ({ children, open, ...props }) => {
    const React = require('react');
    const { sx, anchorPosition, anchorReference, ...domProps } = props;
    return open ? React.createElement('div', { role: 'menu', ...domProps }, children) : null;
  },
  
  MenuItem: ({ children, value, ...props }) => {
    const React = require('react');
    const { sx, ...domProps } = props;
    return React.createElement('option', { 
      value, 
      role: 'option',
      ...domProps 
    }, children);
  },
  
  ListItemIcon: ({ children, ...props }) => {
    const React = require('react');
    const { sx, ...domProps } = props;
    return React.createElement('span', domProps, children);
  },
  
  ListItemText: ({ children, ...props }) => {
    const React = require('react');
    const { sx, ...domProps } = props;
    return React.createElement('span', domProps, children);
  },
  
  // Default export for anything else
  default: ({ children }) => children
}));

// Mock MUI Icons with minimal implementation
vi.mock('@mui/icons-material', () => ({
  // Icon components that render as simple spans with descriptive text
  Star: (props) => {
    const React = require('react');
    return React.createElement('span', { ...props, 'data-testid': 'star-icon' }, '★');
  },
  StarBorder: (props) => {
    const React = require('react');
    return React.createElement('span', { ...props, 'data-testid': 'star-border-icon' }, '☆');
  },
  Launch: (props) => {
    const React = require('react');
    return React.createElement('span', { ...props, 'data-testid': 'launch-icon' }, '↗');
  },
  Edit: (props) => {
    const React = require('react');
    return React.createElement('span', { ...props, 'data-testid': 'edit-icon' }, '✎');
  },
  Delete: (props) => {
    const React = require('react');
    return React.createElement('span', { ...props, 'data-testid': 'delete-icon' }, '🗑');
  },
  Check: (props) => {
    const React = require('react');
    return React.createElement('span', { ...props, 'data-testid': 'check-icon' }, '✓');
  },
  Close: (props) => {
    const React = require('react');
    return React.createElement('span', { ...props, 'data-testid': 'close-icon' }, '✕');
  },
  Folder: (props) => {
    const React = require('react');
    return React.createElement('span', { ...props, 'data-testid': 'folder-icon' }, '📁');
  },
  Notes: (props) => {
    const React = require('react');
    return React.createElement('span', { ...props, 'data-testid': 'notes-icon' }, '📝');
  },
  Palette: (props) => {
    const React = require('react');
    return React.createElement('span', { ...props, 'data-testid': 'palette-icon' }, '🎨');
  },
  // App-specific icons
  Add: (props) => {
    const React = require('react');
    return React.createElement('span', { ...props, 'data-testid': 'add-icon' }, '+');
  },
  Search: (props) => {
    const React = require('react');
    return React.createElement('span', { ...props, 'data-testid': 'search-icon' }, '🔍');
  },
  DarkMode: (props) => {
    const React = require('react');
    return React.createElement('span', { ...props, 'data-testid': 'dark-mode-icon' }, '🌙');
  },
  LightMode: (props) => {
    const React = require('react');
    return React.createElement('span', { ...props, 'data-testid': 'light-mode-icon' }, '☀️');
  },
  Refresh: (props) => {
    const React = require('react');
    return React.createElement('span', { ...props, 'data-testid': 'refresh-icon' }, '🔄');
  },
  Clear: (props) => {
    const React = require('react');
    return React.createElement('span', { ...props, 'data-testid': 'clear-icon' }, '✕');
  },
  Sort: (props) => {
    const React = require('react');
    return React.createElement('span', { ...props, 'data-testid': 'sort-icon' }, '↕');
  },
  // Default fallback for other icons
  default: (props) => {
    const React = require('react');
    return React.createElement('span', { ...props, 'data-testid': 'icon' }, '●');
  }
}));

// Mock console methods that might be noisy in tests
global.console = {
  ...console,
  // Keep error and warn for debugging test failures
  error: console.error,
  warn: console.warn,
  // Silence info and debug logs unless debugging
  info: vi.fn(),
  debug: vi.fn(),
  log: vi.fn(),
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));