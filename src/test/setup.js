import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { randomFillSync } from 'crypto';
import * as React from 'react';

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
    return React.createElement('div', { 'data-testid': 'mock-masonry', ...props }, children);
  },
}));

// Mock Material UI components that cause hanging but keep semantic behavior
vi.mock('@mui/material', () => {
  const originalModule = {};

  return {
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
        ...(options.palette || {}),
      },
      spacing: factor => `${8 * factor}px`,
      shape: { borderRadius: 4 },
      ...options,
    }),
    useTheme: () => ({
      palette: {
        mode: 'light',
        primary: { main: '#1976d2' },
        secondary: { main: '#dc004e' },
        background: { default: '#f5f5f5', paper: '#fff' },
        text: { primary: '#000', secondary: '#666' },
      },
    }),
    styled: () => props => props.children || null,
    GlobalStyles: () => null,
    CssBaseline: () => null,

    // Basic components - render children
    Box: ({ children, ...props }) => React.createElement('div', props, children),
    Container: ({ children, ...props }) => React.createElement('div', props, children),
    Stack: ({ children, ...props }) => React.createElement('div', props, children),
    Grid: ({ children, ...props }) => React.createElement('div', props, children),
    Paper: ({ children, ...props }) => React.createElement('div', props, children),
    Card: ({ children, ...props }) => React.createElement('div', props, children),
    CardContent: ({ children, ...props }) => React.createElement('div', props, children),
    CardActions: ({ children, ...props }) => React.createElement('div', props, children),
    CardActionArea: ({ children, ...props }) => React.createElement('div', props, children),
    Divider: props => React.createElement('hr', props),
    Backdrop: ({ children, ...props }) => React.createElement('div', props, children),

    // Text components - render children
    Typography: ({ variant, component, children, ...props }) => {
      const tag = component || (variant && variant.startsWith('h') ? variant : 'p');
      return React.createElement(tag, props, children);
    },

    // Form components
    TextField: ({
      label,
      value,
      onChange,
      error,
      helperText,
      multiline,
      rows,
      InputProps = {},
      ...props
    }) => {
      const inputProps = {
        ...props,
        value,
        onChange: onChange ? e => onChange(e) : undefined,
        rows: multiline ? rows : undefined,
        ...InputProps.inputProps,
      };
      const input = multiline
        ? React.createElement('textarea', inputProps)
        : React.createElement('input', inputProps);

      return React.createElement(
        'div',
        null,
        label && React.createElement('label', null, label),
        input,
        helperText && React.createElement('span', null, helperText),
      );
    },
    Select: ({ children, value, onChange, ...props }) =>
      React.createElement(
        'select',
        { ...props, value, onChange: onChange ? e => onChange(e) : undefined },
        children,
      ),
    MenuItem: ({ children, value, ...props }) =>
      React.createElement('option', { ...props, value }, children),
    FormControl: ({ children, ...props }) => React.createElement('div', props, children),
    FormLabel: ({ children, ...props }) => React.createElement('label', props, children),
    FormHelperText: ({ children, ...props }) => React.createElement('span', props, children),
    Input: props => React.createElement('input', props),
    InputLabel: ({ children, ...props }) => React.createElement('label', props, children),
    InputAdornment: ({ children, ...props }) => React.createElement('span', props, children),
    OutlinedInput: props => React.createElement('input', props),
    Checkbox: props => React.createElement('input', { ...props, type: 'checkbox' }),
    FormControlLabel: ({ control, label, ...props }) =>
      React.createElement('label', props, control, label),
    FormGroup: ({ children, ...props }) => React.createElement('div', props, children),

    // Button components
    Button: ({ children, startIcon, endIcon, ...props }) =>
      React.createElement('button', props, startIcon, children, endIcon),
    IconButton: ({ children, ...props }) => React.createElement('button', props, children),
    ButtonGroup: ({ children, ...props }) => React.createElement('div', props, children),
    ToggleButton: ({ children, ...props }) => React.createElement('button', props, children),
    ToggleButtonGroup: ({ children, ...props }) => React.createElement('div', props, children),
    Fab: ({ children, ...props }) => React.createElement('button', props, children),

    // Navigation components
    AppBar: ({ children, ...props }) => React.createElement('header', props, children),
    Toolbar: ({ children, ...props }) => React.createElement('div', props, children),
    Drawer: ({ children, open, ...props }) =>
      open ? React.createElement('div', props, children) : null,
    BottomNavigation: ({ children, ...props }) => React.createElement('nav', props, children),
    BottomNavigationAction: props => React.createElement('button', props),
    Link: ({ children, ...props }) => React.createElement('a', props, children),
    Breadcrumbs: ({ children, ...props }) => React.createElement('nav', props, children),
    Tabs: ({ children, ...props }) => React.createElement('div', props, children),
    Tab: ({ label, ...props }) => React.createElement('button', props, label),

    // List components
    List: ({ children, ...props }) => React.createElement('ul', props, children),
    ListItem: ({ children, ...props }) => React.createElement('li', props, children),
    ListItemButton: ({ children, ...props }) => React.createElement('button', props, children),
    ListItemText: ({ primary, secondary, ...props }) =>
      React.createElement(
        'div',
        props,
        primary && React.createElement('span', null, primary),
        secondary && React.createElement('span', null, secondary),
      ),
    ListItemIcon: ({ children, ...props }) => React.createElement('span', props, children),
    ListItemAvatar: ({ children, ...props }) => React.createElement('span', props, children),
    ListItemSecondaryAction: ({ children, ...props }) =>
      React.createElement('span', props, children),
    ListSubheader: ({ children, ...props }) => React.createElement('li', props, children),

    // Display components
    Chip: ({ label, onDelete, icon, deleteIcon, ...props }) =>
      React.createElement(
        'span',
        props,
        icon,
        label,
        onDelete && React.createElement('button', { onClick: onDelete }, deleteIcon || '×'),
      ),
    Avatar: ({ children, src, alt, ...props }) =>
      src
        ? React.createElement('img', { src, alt, ...props })
        : React.createElement('div', props, children),
    Badge: ({ children, badgeContent, ...props }) =>
      React.createElement(
        'span',
        props,
        children,
        badgeContent && React.createElement('span', null, badgeContent),
      ),
    Tooltip: ({ children, title, ...props }) => children,
    LinearProgress: props => React.createElement('div', { role: 'progressbar', ...props }),
    CircularProgress: props => React.createElement('div', { role: 'progressbar', ...props }),
    Skeleton: props => React.createElement('div', props),

    // Feedback components
    Alert: ({ children, severity, onClose, action, ...props }) =>
      React.createElement(
        'div',
        { role: 'alert', ...props },
        children,
        (onClose || action) &&
          React.createElement(
            'div',
            null,
            action,
            onClose && React.createElement('button', { onClick: onClose }, '×'),
          ),
      ),
    AlertTitle: ({ children, ...props }) => React.createElement('div', props, children),
    Snackbar: ({ open, children, onClose, action, ...props }) =>
      open
        ? React.createElement(
            'div',
            props,
            children,
            (onClose || action) &&
              React.createElement(
                'div',
                null,
                action,
                onClose && React.createElement('button', { onClick: onClose }, '×'),
              ),
          )
        : null,
    Dialog: ({ open, children, onClose, ...props }) =>
      open
        ? React.createElement(
            'div',
            { role: 'dialog', ...props },
            onClose && React.createElement('button', { onClick: onClose }, '×'),
            children,
          )
        : null,
    DialogTitle: ({ children, ...props }) => React.createElement('h2', props, children),
    DialogContent: ({ children, ...props }) => React.createElement('div', props, children),
    DialogContentText: ({ children, ...props }) => React.createElement('p', props, children),
    DialogActions: ({ children, ...props }) => React.createElement('div', props, children),

    // Data display components
    Table: ({ children, ...props }) => React.createElement('table', props, children),
    TableBody: ({ children, ...props }) => React.createElement('tbody', props, children),
    TableCell: ({ children, ...props }) => React.createElement('td', props, children),
    TableContainer: ({ children, ...props }) => React.createElement('div', props, children),
    TableHead: ({ children, ...props }) => React.createElement('thead', props, children),
    TableRow: ({ children, ...props }) => React.createElement('tr', props, children),
    TablePagination: props => React.createElement('div', props),

    // Layout components
    Collapse: ({ children, in: inProp, ...props }) =>
      inProp ? React.createElement('div', props, children) : null,
    Fade: ({ children, in: inProp, ...props }) =>
      inProp ? React.createElement('div', props, children) : null,
    Grow: ({ children, in: inProp, ...props }) =>
      inProp ? React.createElement('div', props, children) : null,
    Slide: ({ children, in: inProp, ...props }) =>
      inProp ? React.createElement('div', props, children) : null,
    Zoom: ({ children, in: inProp, ...props }) =>
      inProp ? React.createElement('div', props, children) : null,

    // Menu components
    Menu: ({ children, open, anchorEl, onClose, ...props }) =>
      open ? React.createElement('div', { role: 'menu', ...props }, children) : null,
    Popover: ({ children, open, anchorEl, onClose, ...props }) =>
      open ? React.createElement('div', props, children) : null,
    Popper: ({ children, open, anchorEl, ...props }) =>
      open ? React.createElement('div', props, children) : null,

    // Other components
    Accordion: ({ children, expanded, ...props }) => React.createElement('div', props, children),
    AccordionSummary: ({ children, ...props }) => React.createElement('div', props, children),
    AccordionDetails: ({ children, ...props }) => React.createElement('div', props, children),
    AccordionActions: ({ children, ...props }) => React.createElement('div', props, children),
    Rating: props => React.createElement('div', props),
    SpeedDial: ({ children, ...props }) => React.createElement('div', props, children),
    SpeedDialAction: props => React.createElement('button', props),
    SpeedDialIcon: () => React.createElement('span'),
    Stepper: ({ children, ...props }) => React.createElement('div', props, children),
    Step: ({ children, ...props }) => React.createElement('div', props, children),
    StepLabel: ({ children, ...props }) => React.createElement('div', props, children),
    StepContent: ({ children, ...props }) => React.createElement('div', props, children),
    MobileStepper: props => React.createElement('div', props),
    Pagination: props => React.createElement('nav', props),
    PaginationItem: props => React.createElement('button', props),
    Autocomplete: ({ renderInput, options, ...props }) =>
      React.createElement('div', null, renderInput({ inputProps: props })),
    ClickAwayListener: ({ children, onClickAway }) => children,
    Modal: ({ children, open, ...props }) =>
      open ? React.createElement('div', props, children) : null,
    SwipeableDrawer: ({ children, open, ...props }) =>
      open ? React.createElement('div', props, children) : null,
    useMediaQuery: () => true,
    useScrollTrigger: () => false,
  };
});

// Mock Material UI icons
vi.mock('@mui/icons-material', () => {
  const createIcon = name => () => name;

  return {
    Add: createIcon('AddIcon'),
    Close: createIcon('CloseIcon'),
    Delete: createIcon('DeleteIcon'),
    Edit: createIcon('EditIcon'),
    PlayArrow: createIcon('PlayArrowIcon'),
    Search: createIcon('SearchIcon'),
    Star: createIcon('StarIcon'),
    StarBorder: createIcon('StarBorderIcon'),
    Check: createIcon('CheckIcon'),
    Clear: createIcon('ClearIcon'),
    LightMode: createIcon('LightModeIcon'),
    DarkMode: createIcon('DarkModeIcon'),
    Tag: createIcon('TagIcon'),
    Sort: createIcon('SortIcon'),
    Refresh: createIcon('RefreshIcon'),
    Folder: createIcon('FolderIcon'),
    FolderOpen: createIcon('FolderOpenIcon'),
    Launch: createIcon('LaunchIcon'),
    MoreVert: createIcon('MoreVertIcon'),
    Menu: createIcon('MenuIcon'),
    Palette: createIcon('PaletteIcon'),
    ChevronLeft: createIcon('ChevronLeftIcon'),
    ChevronRight: createIcon('ChevronRightIcon'),
    ExpandMore: createIcon('ExpandMoreIcon'),
    ExpandLess: createIcon('ExpandLessIcon'),
    Info: createIcon('InfoIcon'),
    Warning: createIcon('WarningIcon'),
    Error: createIcon('ErrorIcon'),
    Success: createIcon('SuccessIcon'),
  };
});

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  convertFileSrc: src => src,
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
  message: vi.fn(),
  ask: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  readBinaryFile: vi.fn(),
  writeBinaryFile: vi.fn(),
  exists: vi.fn(),
  createDir: vi.fn(),
  readDir: vi.fn(),
  removeFile: vi.fn(),
  removeDir: vi.fn(),
  renameFile: vi.fn(),
  copyFile: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-shell', () => ({
  Command: vi.fn(),
  open: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-log', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
}));

vi.mock('@tauri-apps/api/app', () => ({
  getName: vi.fn(() => Promise.resolve('Claude Launcher')),
  getVersion: vi.fn(() => Promise.resolve('0.1.0')),
  getTauriVersion: vi.fn(() => Promise.resolve('2.0.0')),
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    listen: vi.fn(),
    emit: vi.fn(),
    minimize: vi.fn(),
    maximize: vi.fn(),
    close: vi.fn(),
    setTitle: vi.fn(),
    center: vi.fn(),
    setFullscreen: vi.fn(),
    setFocus: vi.fn(),
  })),
  WebviewWindow: vi.fn(),
  WebviewWindowHandle: vi.fn(),
  WindowManager: vi.fn(),
  currentMonitor: vi.fn(),
  primaryMonitor: vi.fn(),
  availableMonitors: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  emit: vi.fn(),
  listen: vi.fn(() => Promise.resolve(() => {})),
  once: vi.fn(() => Promise.resolve(() => {})),
  TauriEvent: {
    WINDOW_RESIZED: 'tauri://window-resized',
    WINDOW_MOVED: 'tauri://window-moved',
    WINDOW_CLOSE_REQUESTED: 'tauri://window-close-requested',
    WINDOW_CREATED: 'tauri://window-created',
    WINDOW_DESTROYED: 'tauri://window-destroyed',
    WINDOW_FOCUS: 'tauri://window-focus',
    WINDOW_BLUR: 'tauri://window-blur',
    WINDOW_SCALE_FACTOR_CHANGED: 'tauri://window-scale-factor-changed',
    WINDOW_THEME_CHANGED: 'tauri://window-theme-changed',
    WINDOW_FILE_DROP: 'tauri://window-file-drop',
    WINDOW_FILE_DROP_HOVER: 'tauri://window-file-drop-hover',
    WINDOW_FILE_DROP_CANCELLED: 'tauri://window-file-drop-cancelled',
    MENU: 'tauri://menu',
    CHECK_UPDATE: 'tauri://check-update',
    UPDATE_AVAILABLE: 'tauri://update-available',
    INSTALL_UPDATE: 'tauri://install-update',
    STATUS_UPDATE: 'tauri://status-update',
    DOWNLOAD_PROGRESS: 'tauri://download-progress',
  },
}));

// Global test utilities
globalThis.mockConsoleError = () => {
  const originalError = console.error;
  vi.beforeEach(() => {
    console.error = vi.fn();
  });
  vi.afterEach(() => {
    console.error = originalError;
  });
};

// Mock the imported mocks library from Tauri
vi.mock('@tauri-apps/api/mocks', () => ({
  mockIPC: vi.fn(),
  mockWindows: vi.fn(),
  clearMocks: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
