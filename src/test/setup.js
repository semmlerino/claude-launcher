import '@testing-library/jest-dom';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { randomFillSync } from 'crypto';
import * as React from 'react';

// Clean up DOM after each test
afterEach(() => {
  cleanup();
});

// Polyfill crypto for happy-dom (may not be strictly necessary - kept for compatibility)
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
      breakpoints: {
        up: () => '@media (min-width:0px)',
        down: () => '@media (max-width:960px)',
        between: () => '@media (min-width:600px) and (max-width:960px)',
        only: () => '@media (min-width:600px) and (max-width:960px)',
        values: { xs: 0, sm: 600, md: 960, lg: 1280, xl: 1920 },
      },
      shadows: Array(25).fill('0px 0px 0px rgba(0, 0, 0, 0.2)'),
      spacing: (factor) => `${8 * factor}px`,
    }),
    styled: () => props => props.children || null,
    GlobalStyles: () => null,
    CssBaseline: () => null,

    // Basic components - render children (with forwardRef support)
    Box: React.forwardRef(({ children, component, ...props }, ref) => {
      // Filter out MUI-specific props that aren't valid HTML attributes
      const { sx, alignItems, justifyContent, flexDirection, gap, display, ...htmlProps } = props;
      // Apply display style from sx if present (for style assertion tests)
      const style = {};
      if (sx && sx.display) {
        style.display = sx.display;
      } else if (display) {
        style.display = display;
      }
      return React.createElement(component || 'div', { ref, style: Object.keys(style).length ? style : undefined, ...htmlProps }, children);
    }),
    Container: React.forwardRef(({ children, maxWidth, ...props }, ref) => {
      const { sx, ...htmlProps } = props;
      return React.createElement('div', { ref, ...htmlProps }, children);
    }),
    Stack: ({ children, ...props }) => {
      const { sx, spacing, direction, divider, ...htmlProps } = props;
      return React.createElement('div', htmlProps, children);
    },
    Grid: ({ children, ...props }) => {
      const { sx, container, item, xs, sm, md, lg, xl, spacing, ...htmlProps } = props;
      return React.createElement('div', htmlProps, children);
    },
    Paper: ({ children, elevation, ...props }) => {
      const { sx, ...htmlProps } = props;
      return React.createElement('div', htmlProps, children);
    },
    Card: ({ children, ...props }) => {
      const { sx, ...htmlProps } = props;
      return React.createElement('div', htmlProps, children);
    },
    CardContent: ({ children, ...props }) => {
      const { sx, ...htmlProps } = props;
      return React.createElement('div', htmlProps, children);
    },
    CardActions: ({ children, ...props }) => {
      const { sx, ...htmlProps } = props;
      return React.createElement('div', htmlProps, children);
    },
    CardActionArea: ({ children, ...props }) => {
      const { sx, ...htmlProps } = props;
      return React.createElement('div', htmlProps, children);
    },
    Divider: props => {
      const { sx, ...htmlProps } = props;
      return React.createElement('hr', htmlProps);
    },
    Backdrop: ({ children, ...props }) => {
      const { sx, open, ...htmlProps } = props;
      return React.createElement('div', htmlProps, children);
    },

    // Text components - render children
    Typography: ({ variant, component, children, ...props }) => {
      const { sx, color, align, gutterBottom, noWrap, ...htmlProps } = props;
      const tag = component || (variant && variant.startsWith('h') ? variant : 'p');
      return React.createElement(tag, htmlProps, children);
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
      id,
      ...props
    }) => {
      const { sx, variant, fullWidth, size, ...htmlProps } = props;
      // Generate a deterministic id if not provided to associate with label
      const fieldId = id || `textfield-${(label || 'unnamed').toString().replace(/\s+/g, '-').toLowerCase()}`;
      const inputProps = {
        ...htmlProps,
        id: fieldId,
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
        label && React.createElement('label', { htmlFor: fieldId }, label),
        input,
        helperText && React.createElement('span', null, helperText),
      );
    },
    Select: ({ children, value, onChange, ...props }) => {
      const { sx, startAdornment, endAdornment, variant, fullWidth, size, ...htmlProps } = props;
      return React.createElement(
        'select',
        { ...htmlProps, value, onChange: onChange ? e => onChange(e) : undefined },
        children,
      );
    },
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
    Switch: ({ checked, onChange, ...props }) =>
      React.createElement('input', { ...props, type: 'checkbox', checked, onChange }),
    FormControlLabel: ({ control, label, ...props }) =>
      React.createElement('label', props, control, label),
    FormGroup: ({ children, ...props }) => React.createElement('div', props, children),

    // Button components - render startIcon (may contain loading spinner) and text
    Button: ({ children, startIcon, endIcon, ...props }) => {
      const { sx, variant, color, size, fullWidth, disableElevation, ...htmlProps } = props;
      // Filter children to only include text content, not icon elements
      const filteredChildren = React.Children.toArray(children).filter(child => {
        // Keep strings and numbers, skip React elements (which are icons)
        return typeof child === 'string' || typeof child === 'number';
      });
      // Include startIcon (may be CircularProgress for loading states)
      return React.createElement('button', htmlProps, startIcon, filteredChildren, endIcon);
    },
    IconButton: ({ children, ...props }) => {
      const { sx, color, size, edge, ...htmlProps } = props;
      return React.createElement('button', htmlProps, children);
    },
    ButtonGroup: ({ children, ...props }) => {
      const { sx, variant, color, size, orientation, ...htmlProps } = props;
      return React.createElement('div', htmlProps, children);
    },
    ToggleButton: ({ children, ...props }) => {
      const { sx, value, selected, ...htmlProps } = props;
      return React.createElement('button', htmlProps, children);
    },
    ToggleButtonGroup: ({ children, ...props }) => {
      const { sx, value, exclusive, onChange, ...htmlProps } = props;
      return React.createElement('div', htmlProps, children);
    },
    Fab: ({ children, ...props }) => {
      const { sx, variant, color, size, ...htmlProps } = props;
      return React.createElement('button', htmlProps, children);
    },

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
    ListItemText: ({ primary, secondary, children, ...props }) =>
      React.createElement(
        'div',
        props,
        // Handle children as primary content (common MUI pattern)
        children && React.createElement('span', null, children),
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
    Tooltip: ({ children, _title, ..._props }) => children,
    LinearProgress: props => React.createElement('div', { role: 'progressbar', ...props }),
    CircularProgress: props => React.createElement('div', { role: 'progressbar', ...props }),
    Skeleton: props => React.createElement('div', props),

    // Feedback components
    Alert: ({ children, _severity, onClose, action, ...props }) =>
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
    Dialog: ({ open, children, onClose, ...props }) => {
      const { sx, maxWidth, fullWidth, fullScreen, ...htmlProps } = props;
      return open
        ? React.createElement(
            'div',
            { role: 'dialog', ...htmlProps },
            onClose && React.createElement('button', { onClick: onClose }, '×'),
            children,
          )
        : null;
    },
    DialogTitle: ({ children, ...props }) => {
      const { sx, ...htmlProps } = props;
      return React.createElement('h2', htmlProps, children);
    },
    DialogContent: ({ children, ...props }) => {
      const { sx, dividers, ...htmlProps } = props;
      return React.createElement('div', htmlProps, children);
    },
    DialogContentText: ({ children, ...props }) => {
      const { sx, ...htmlProps } = props;
      return React.createElement('p', htmlProps, children);
    },
    DialogActions: ({ children, ...props }) => {
      const { sx, ...htmlProps } = props;
      return React.createElement('div', htmlProps, children);
    },

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
    ClickAwayListener: ({ children, _onClickAway }) => children,
    Modal: ({ children, open, ...props }) =>
      open ? React.createElement('div', props, children) : null,
    SwipeableDrawer: ({ children, open, ...props }) =>
      open ? React.createElement('div', props, children) : null,
    useMediaQuery: () => true,
    useScrollTrigger: () => false,
  };
});

// Mock Material UI icons - return a span that doesn't clutter text but is identifiable
vi.mock('@mui/icons-material', () => {
  // Create icon mock that returns a span without text content
  const createIcon = name => (props) => React.createElement('span', {
    'data-icon': name,
    ...props,
    sx: undefined, // Remove sx prop since it's MUI-specific
  });

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
    Notes: createIcon('NotesIcon'),
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
    // New icons for icon picker functionality
    Apps: createIcon('AppsIcon'),
    Code: createIcon('CodeIcon'),
    Terminal: createIcon('TerminalIcon'),
    // Additional icons for custom icon functionality
    CloudUpload: createIcon('CloudUploadIcon'),
    Image: createIcon('ImageIcon'),
    Storage: createIcon('StorageIcon'),
    Api: createIcon('ApiIcon'),
    DataObject: createIcon('DataObjectIcon'),
    IntegrationInstructions: createIcon('IntegrationInstructionsIcon'),
    BugReport: createIcon('BugReportIcon'),
    Science: createIcon('ScienceIcon'),
    Web: createIcon('WebIcon'),
    PhoneAndroid: createIcon('PhoneAndroidIcon'),
    Computer: createIcon('ComputerIcon'),
    SportsEsports: createIcon('SportsEsportsIcon'),
    SmartToy: createIcon('SmartToyIcon'),
    CloudQueue: createIcon('CloudQueueIcon'),
    Dashboard: createIcon('DashboardIcon'),
    Analytics: createIcon('AnalyticsIcon'),
    Build: createIcon('BuildIcon'),
    Settings: createIcon('SettingsIcon'),
    FileDownload: createIcon('FileDownloadIcon'),
    FileUpload: createIcon('FileUploadIcon'),
    Engineering: createIcon('EngineeringIcon'),
    Construction: createIcon('ConstructionIcon'),
    Handyman: createIcon('HandymanIcon'),
    Architecture: createIcon('ArchitectureIcon'),
    DesignServices: createIcon('DesignServicesIcon'),
    AutoFixHigh: createIcon('AutoFixHighIcon'),
    Favorite: createIcon('FavoriteIcon'),
    Bolt: createIcon('BoltIcon'),
    Rocket: createIcon('RocketIcon'),
    Lightbulb: createIcon('LightbulbIcon'),
    Flag: createIcon('FlagIcon'),
    Bookmark: createIcon('BookmarkIcon'),
    Label: createIcon('LabelIcon'),
    Business: createIcon('BusinessIcon'),
    TrendingUp: createIcon('TrendingUpIcon'),
    Assessment: createIcon('AssessmentIcon'),
    BarChart: createIcon('BarChartIcon'),
    PieChart: createIcon('PieChartIcon'),
    ShowChart: createIcon('ShowChartIcon'),
    Timeline: createIcon('TimelineIcon'),
    Work: createIcon('WorkIcon'),
  };
});

// Mock Tauri API - invoke is configured by mockIPC
// Use globalThis to share the handler across module scopes
globalThis.__tauriIpcHandler = null;

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn((cmd, args) => {
    if (globalThis.__tauriIpcHandler) {
      return Promise.resolve(globalThis.__tauriIpcHandler(cmd, args));
    }
    console.warn(`Unmocked Tauri command: ${cmd}`);
    return Promise.resolve(null);
  }),
  convertFileSrc: src => `http://asset.localhost/${src}`,
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

vi.mock('@tauri-apps/api/webviewWindow', () => ({
  getCurrentWebviewWindow: vi.fn(() => ({
    close: vi.fn(),
    onFileDropEvent: vi.fn(() => Promise.resolve(() => {})),
  })),
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
// mockIPC sets the handler, clearMocks resets it
vi.mock('@tauri-apps/api/mocks', () => ({
  mockIPC: vi.fn((handler) => {
    globalThis.__tauriIpcHandler = handler;
  }),
  mockWindows: vi.fn(),
  clearMocks: vi.fn(() => {
    globalThis.__tauriIpcHandler = null;
  }),
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

// Re-establish mock implementations before each test
// This is necessary because vitest's mockReset: true clears implementations
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';

beforeEach(() => {
  // Re-establish invoke implementation
  vi.mocked(invoke).mockImplementation((cmd, args) => {
    if (globalThis.__tauriIpcHandler) {
      return Promise.resolve(globalThis.__tauriIpcHandler(cmd, args));
    }
    console.warn(`Unmocked Tauri command: ${cmd}`);
    return Promise.resolve(null);
  });

  // Re-establish mockIPC and clearMocks implementations
  vi.mocked(mockIPC).mockImplementation((handler) => {
    globalThis.__tauriIpcHandler = handler;
  });
  vi.mocked(clearMocks).mockImplementation(() => {
    globalThis.__tauriIpcHandler = null;
  });

  // Re-establish event listener mock
  vi.mocked(listen).mockImplementation(() => Promise.resolve(() => {}));

  // Re-establish webview window mock
  vi.mocked(getCurrentWebviewWindow).mockReturnValue({
    close: vi.fn(),
    onFileDropEvent: vi.fn(() => Promise.resolve(() => {})),
  });
});
