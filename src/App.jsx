import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { info, error as logError, warn, debug } from '@tauri-apps/plugin-log';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Fab,
  Snackbar,
  Alert,
  Box,
  IconButton,
  TextField,
  InputAdornment,
  useMediaQuery,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Menu,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  Sort as SortIcon,
  Close as CloseIcon,
  Settings as SettingsIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  FolderSpecial as GroupIcon,
  Folder as FolderIcon,
} from '@mui/icons-material';
import ProjectGrid from './components/ProjectGrid';
import SettingsDialog from './components/SettingsDialog';
import GroupManager from './components/GroupManager';
import './App.css';

// Simple fuzzy search implementation
const matchSorter = (items, searchText, options) => {
  if (!searchText) return items;

  const searchLower = searchText.toLowerCase();
  const keys = options.keys || [];

  return items.filter(item => {
    return keys.some(key => {
      const value = item[key];
      if (Array.isArray(value)) {
        return value.some(v => String(v).toLowerCase().includes(searchLower));
      }
      return String(value || '')
        .toLowerCase()
        .includes(searchLower);
    });
  });
};

// Project sorting function
const sortProjects = (projects, sortBy) => {
  // Handle undefined/null projects
  if (!projects || !Array.isArray(projects)) {
    return [];
  }

  switch (sortBy) {
    case 'name':
      return [...projects].sort((a, b) => a.name.localeCompare(b.name));
    case 'recent':
      return [...projects].sort((a, b) => {
        // Handle null last_used values
        if (!a.last_used && !b.last_used) return 0;
        if (!a.last_used) return 1; // null goes to end
        if (!b.last_used) return -1; // null goes to end
        return new Date(b.last_used) - new Date(a.last_used); // recent first
      });
    default:
      return projects;
  }
};

function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [darkMode, setDarkMode] = useState(prefersDarkMode);
  const [projects, setProjects] = useState([]);
  const [recentProjects, setRecentProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [activeTags, setActiveTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, projectId: null });
  const [dragOver, setDragOver] = useState(false);
  // selectedProjectIndex removed - keyboard navigation not needed
  const [sortOption, setSortOption] = useState('recent');
  const [loadingOperations, setLoadingOperations] = useState({
    add: false,
    launch: null, // stores projectId when launching
    delete: null, // stores projectId when deleting
    update: null, // stores projectId when updating
    pin: null, // stores projectId when pinning/unpinning
  });
  const initializingRef = useRef(false);
  const [globalContextMenu, setGlobalContextMenu] = useState(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [groupManagerOpen, setGroupManagerOpen] = useState(false);
  const [groups, setGroups] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [cardScale, setCardScale] = useState(1.0);

  // Create theme based on dark mode preference
  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
          primary: {
            main: '#1976d2',
          },
          secondary: {
            main: '#dc004e',
          },
          background: {
            default: darkMode ? '#121212' : '#f5f5f5',
          },
        },
        shape: {
          borderRadius: 12,
        },
      }),
    [darkMode],
  );

  // Show snackbar message - define early since other functions use it
  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  // Load sort preference
  const loadSortPreference = useCallback(async () => {
    try {
      const savedSort = await invoke('get_setting', { key: 'sort_preference' });
      if (savedSort && (savedSort === 'name' || savedSort === 'recent')) {
        setSortOption(savedSort);
      }
    } catch (_error) {
      // Use default if loading fails
      info('Using default sort preference');
    }
  }, []);

  // Load theme preference
  const loadThemePreference = useCallback(async () => {
    try {
      const savedTheme = await invoke('get_setting', { key: 'theme_preference' });
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setDarkMode(savedTheme === 'dark');
      }
    } catch (_error) {
      // Use system preference if loading fails
      info('Using system theme preference');
    }
  }, []);

  // Load card scale preference
  const loadCardScale = useCallback(async () => {
    try {
      const savedScale = await invoke('get_setting', { key: 'card_scale' });
      if (savedScale) {
        const scale = parseFloat(savedScale);
        if (scale >= 0.7 && scale <= 1.5) {
          setCardScale(scale);
        }
      }
    } catch (_error) {
      // Use default if loading fails
      info('Using default card scale');
    }
  }, []);

  // Load projects from backend
  const loadProjects = useCallback(async () => {
    try {
      info('Loading projects...');
      const [allProjects, recent] = await Promise.all([
        invoke('get_projects'),
        invoke('get_recent_projects', { limit: 5 }),
      ]);
      // Ensure we always set an array, not undefined
      setProjects(allProjects || []);
      setRecentProjects(recent || []);
      info(`Loaded ${(allProjects || []).length} projects`);
    } catch (error) {
      logError(`Failed to load projects: ${error}`);
      showSnackbar(`Failed to load projects: ${error}`, 'error');
    }
  }, [showSnackbar]);

  // Load groups from backend
  const loadGroups = useCallback(async () => {
    try {
      const groupsData = await invoke('get_groups');
      setGroups(groupsData || []);
    } catch (error) {
      logError(`Failed to load groups: ${error}`);
    }
  }, []);

  // Check if Claude Code is installed
  const checkClaudeInstalled = useCallback(async () => {
    try {
      const result = await invoke('check_claude_installed');
      if (!result.installed) {
        showSnackbar('Claude Code is not installed or not in PATH', 'warning');
      }
    } catch (error) {
      logError(`Failed to check Claude installation: ${error}`);
    }
  }, [showSnackbar]);

  // Add project by path - defined before file drop listener that uses it
  const addProjectByPath = useCallback(
    async path => {
      setLoadingOperations(prev => ({ ...prev, add: true }));
      try {
        const newProject = await invoke('add_project', { path });
        await loadProjects();
        showSnackbar(`Added project: ${newProject.name}`, 'success');
      } catch (error) {
        const errorMessage = String(error);
        if (errorMessage.includes('already exists')) {
          showSnackbar('This project already exists', 'warning');
        } else {
          showSnackbar(`Failed to add project: ${errorMessage}`, 'error');
        }
      } finally {
        setLoadingOperations(prev => ({ ...prev, add: false }));
      }
    },
    [loadProjects, showSnackbar],
  );

  // Export projects to JSON file
  const handleExportProjects = useCallback(async () => {
    if (projects.length === 0) {
      showSnackbar('No projects to export', 'warning');
      return;
    }

    setIsExporting(true);
    try {
      const filePath = await save({
        title: 'Export Projects',
        defaultPath: `claude-launcher-projects-${new Date().toISOString().split('T')[0]}.json`,
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
      });

      if (filePath) {
        const result = await invoke('export_projects', { filePath });
        if (result.success) {
          showSnackbar(`Exported ${result.count} projects successfully`, 'success');
          info(`Exported ${result.count} projects to ${filePath}`);
        }
      }
    } catch (error) {
      logError(`Export failed: ${error}`);
      showSnackbar(`Export failed: ${error}`, 'error');
    } finally {
      setIsExporting(false);
    }
  }, [projects.length, showSnackbar]);

  // Import projects from JSON file
  const handleImportProjects = useCallback(async () => {
    setIsImporting(true);
    try {
      const filePath = await open({
        title: 'Import Projects',
        multiple: false,
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
      });

      if (filePath) {
        const result = await invoke('import_projects', { filePath });

        // Reload projects after import
        await loadProjects();

        // Build summary message
        const messages = [];
        if (result.imported > 0) messages.push(`${result.imported} imported`);
        if (result.skipped > 0) messages.push(`${result.skipped} skipped (already exist)`);
        if (result.failed > 0) messages.push(`${result.failed} failed`);

        const summary = messages.join(', ');
        const severity = result.failed > 0 ? 'warning' : 'success';

        showSnackbar(`Import complete: ${summary}`, severity);
        info(`Import result: ${JSON.stringify(result)}`);

        // Log detailed errors if any
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach(err => logError(err));
        }
      }
    } catch (error) {
      logError(`Import failed: ${error}`);
      showSnackbar(`Import failed: ${error}`, 'error');
    } finally {
      setIsImporting(false);
    }
  }, [loadProjects, showSnackbar]);

  // Initialize the app - runs only once on mount
  useEffect(() => {
    let isCancelled = false;

    const init = async () => {
      // Prevent multiple simultaneous initializations
      if (initializingRef.current) {
        info('Initialization already in progress, skipping...');
        return;
      }

      initializingRef.current = true;

      try {
        setLoading(true);
        info('Starting application initialization...');

        // Initialize database
        await invoke('init_database');
        if (isCancelled) return;

        // Load all data in parallel
        await Promise.all([
          loadProjects(),
          loadGroups(),
          loadSortPreference(),
          loadThemePreference(),
          loadCardScale(),
          checkClaudeInstalled(),
        ]);

        if (isCancelled) return;

        info('Application initialized successfully');
      } catch (error) {
        if (isCancelled) return;
        logError(`Failed to initialize: ${error}`);
        showSnackbar(`Failed to initialize: ${error}`, 'error');

        // Reset initialization flag on error to allow retry
        initializingRef.current = false;
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - init only on mount, functions are stable via useCallback

  // Set up file drop listener
  useEffect(() => {
    let unlistenDrop;
    let unlistenEnter;
    let unlistenLeave;
    let isMounted = true;

    const setupListener = async () => {
      try {
        debug('Setting up Tauri drag-drop listeners...');

        // Listen for drag enter to show overlay
        const enterListener = await listen('tauri://drag-enter', () => {
          if (!isMounted) return;
          debug('Tauri drag-enter event received');
          setDragOver(true);
        });

        // Listen for drag leave to hide overlay
        const leaveListener = await listen('tauri://drag-leave', () => {
          if (!isMounted) return;
          debug('Tauri drag-leave event received');
          setDragOver(false);
        });

        // Listen for drop
        const dropListener = await listen('tauri://drag-drop', async event => {
          if (!isMounted) return;
          debug('Tauri drag-drop event received');
          setDragOver(false);
          const paths = event.payload.paths || [];

          for (const path of paths) {
            await addProjectByPath(path);
          }
        });

        // Only assign unlisteners if component is still mounted
        if (isMounted) {
          unlistenEnter = enterListener;
          unlistenLeave = leaveListener;
          unlistenDrop = dropListener;
          debug('Tauri drag-drop listeners set up successfully');
        } else {
          // Component unmounted during setup, clean up immediately
          enterListener();
          leaveListener();
          dropListener();
        }
      } catch (error) {
        if (isMounted) {
          logError(`Failed to setup drag-drop listener: ${error}`);
        }
      }
    };

    setupListener();

    return () => {
      isMounted = false;
      if (unlistenDrop) unlistenDrop();
      if (unlistenEnter) unlistenEnter();
      if (unlistenLeave) unlistenLeave();
    };
  }, [addProjectByPath]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Memoize filtered and sorted projects
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects;

    // Apply tag filter first
    if (activeTags.length > 0) {
      filtered = filtered.filter(project => activeTags.every(tag => project.tags.includes(tag)));
    }

    // Apply search filter
    if (debouncedSearchQuery) {
      filtered = matchSorter(filtered, debouncedSearchQuery, {
        keys: ['name', 'tags', 'notes', 'path'],
      });
    }

    // Apply sorting
    filtered = sortProjects(filtered, sortOption);

    return filtered;
  }, [debouncedSearchQuery, projects, activeTags, sortOption]);

  // Memoize all unique tags from projects
  const allTags = useMemo(() => {
    const tagSet = new Set();
    projects.forEach(project => {
      project.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [projects]);

  // Handle tag filtering
  const handleTagClick = useCallback(
    tag => {
      if (activeTags.includes(tag)) {
        setActiveTags(activeTags.filter(t => t !== tag));
      } else {
        setActiveTags([...activeTags, tag]);
      }
    },
    [activeTags],
  );

  // Clear all tag filters
  const clearTagFilters = () => {
    setActiveTags([]);
  };

  // Handle sort option change
  const handleSortChange = async newSortOption => {
    setSortOption(newSortOption);
    try {
      await invoke('set_setting', {
        key: 'sort_preference',
        value: newSortOption,
      });
    } catch (error) {
      logError(`Failed to save sort preference: ${error}`);
    }
  };

  // Add a new project
  const handleAddProject = useCallback(async () => {
    setLoadingOperations(prev => ({ ...prev, add: true }));
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (selected) {
        await addProjectByPath(selected);
      }
    } catch (error) {
      showSnackbar(`Failed to add project: ${error}`, 'error');
    } finally {
      setLoadingOperations(prev => ({ ...prev, add: false }));
    }
  }, [addProjectByPath, showSnackbar]);

  // Helper function to update a project in the state
  // Optimized to avoid unnecessary re-renders
  const updateProjectInState = useCallback((projectId, updates) => {
    setProjects(prevProjects => {
      // Find the project index for more efficient updates
      const projectIndex = prevProjects.findIndex(p => p.id === projectId);
      if (projectIndex === -1) return prevProjects;

      // Only update if there are actual changes
      const currentProject = prevProjects[projectIndex];
      const hasChanges = Object.keys(updates).some(key => currentProject[key] !== updates[key]);

      if (!hasChanges) return prevProjects;

      // Create new array with updated project
      const newProjects = [...prevProjects];
      newProjects[projectIndex] = { ...currentProject, ...updates };
      return newProjects;
    });
  }, []);

  // Update project
  const handleUpdateProject = useCallback(
    async (projectId, updates) => {
      // Store original values for rollback
      const originalProject = projects.find(p => p.id === projectId);
      if (!originalProject) return;

      setLoadingOperations(prev => ({ ...prev, update: projectId }));

      // Optimistic update - immediately update the UI
      updateProjectInState(projectId, updates);

      try {
        await invoke('update_project', { id: projectId, updates });
        showSnackbar('Project updated', 'success');
      } catch (error) {
        // Revert to original values on error (including all fields)
        updateProjectInState(projectId, {
          name: originalProject.name,
          tags: originalProject.tags,
          notes: originalProject.notes,
          background_color: originalProject.background_color,
          continue_flag: originalProject.continue_flag,
          icon: originalProject.icon,
          icon_size: originalProject.icon_size,
        });
        showSnackbar(`Failed to update project: ${error}`, 'error');
        // Reload from backend to ensure consistency
        await loadProjects();
      } finally {
        setLoadingOperations(prev => ({ ...prev, update: null }));
      }
    },
    [projects, updateProjectInState, showSnackbar, loadProjects],
  );

  // Launch project
  const handleLaunchProject = useCallback(
    async (projectId, continueFlag) => {
      setLoadingOperations(prev => ({ ...prev, launch: projectId }));
      try {
        const result = await invoke('launch_project', {
          id: projectId,
          continueFlag,
        });
        showSnackbar(result.message || 'Project launched', 'success');
        // Update last_used locally instead of reloading all projects
        const now = new Date().toISOString();
        updateProjectInState(projectId, { last_used: now });
      } catch (error) {
        showSnackbar(`Failed to launch project: ${error}`, 'error');
      } finally {
        setLoadingOperations(prev => ({ ...prev, launch: null }));
      }
    },
    [showSnackbar, updateProjectInState],
  );

  // Delete project
  const handleDeleteProject = async projectId => {
    setDeleteDialog({ open: true, projectId });
  };

  const confirmDelete = useCallback(async () => {
    if (!deleteDialog.projectId) {
      warn('No project ID provided for deletion');
      return;
    }

    debug(`Deleting project with ID: ${deleteDialog.projectId}`);
    setLoadingOperations(prev => ({ ...prev, delete: deleteDialog.projectId }));

    try {
      await invoke('delete_project', { id: deleteDialog.projectId });
      await loadProjects();
      showSnackbar('Project deleted', 'success');
    } catch (error) {
      logError(`Delete project error: ${error}`);
      showSnackbar(`Failed to delete project: ${error}`, 'error');
    } finally {
      setLoadingOperations(prev => ({ ...prev, delete: null }));
      setDeleteDialog({ open: false, projectId: null });
    }
  }, [deleteDialog.projectId, loadProjects, showSnackbar]);

  // Pin/unpin project
  const handlePinProject = useCallback(
    async (projectId, pinned) => {
      setLoadingOperations(prev => ({ ...prev, pin: projectId }));

      // Optimistic update - immediately update the UI
      updateProjectInState(projectId, { pinned });
      showSnackbar(pinned ? 'Project pinned' : 'Project unpinned', 'success');

      try {
        await invoke('update_project', {
          id: projectId,
          updates: { pinned },
        });
      } catch (error) {
        // Revert on error
        updateProjectInState(projectId, { pinned: !pinned });
        showSnackbar(`Failed to update project: ${error}`, 'error');
        // Reload from backend to ensure consistency
        await loadProjects();
      } finally {
        setLoadingOperations(prev => ({ ...prev, pin: null }));
      }
    },
    [updateProjectInState, showSnackbar, loadProjects],
  );

  // Group management handlers
  const handleCreateGroup = useCallback(async (name, color) => {
    const newGroup = await invoke('create_group', { name, color });
    setGroups(prev => [...prev, newGroup]);
    return newGroup;
  }, []);

  const handleUpdateGroup = useCallback(async (groupId, updates) => {
    const updatedGroup = await invoke('update_group', { id: groupId, updates });
    setGroups(prev => prev.map(g => g.id === groupId ? updatedGroup : g));
    return updatedGroup;
  }, []);

  const handleDeleteGroup = useCallback(async (groupId) => {
    await invoke('delete_group', { id: groupId });
    setGroups(prev => prev.filter(g => g.id !== groupId));
    // Also clear group_id from projects that were in this group
    setProjects(prev => prev.map(p =>
      p.group_id === groupId ? { ...p, group_id: null } : p
    ));
  }, []);

  const handleReorderGroups = useCallback(async (groupIds) => {
    const reorderedGroups = await invoke('reorder_groups', { groupIds });
    setGroups(reorderedGroups);
    return reorderedGroups;
  }, []);

  const handleMoveToGroup = useCallback(async (projectId, groupId) => {
    // Optimistic update
    const originalProject = projects.find(p => p.id === projectId);
    if (!originalProject) return;

    updateProjectInState(projectId, { group_id: groupId || null });

    try {
      await invoke('move_project_to_group', {
        projectId,
        groupId: groupId || null
      });
      showSnackbar(groupId ? 'Project moved to group' : 'Project removed from group', 'success');
    } catch (error) {
      // Revert on error
      updateProjectInState(projectId, { group_id: originalProject.group_id });
      showSnackbar(`Failed to move project: ${error}`, 'error');
    }
  }, [projects, updateProjectInState, showSnackbar]);

  const handleToggleGroupCollapse = useCallback(async (groupId) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const newCollapsed = !group.collapsed;
    // Optimistic update
    setGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, collapsed: newCollapsed } : g
    ));

    try {
      await invoke('update_group', {
        id: groupId,
        updates: { collapsed: newCollapsed }
      });
    } catch (error) {
      // Revert on error
      setGroups(prev => prev.map(g =>
        g.id === groupId ? { ...g, collapsed: !newCollapsed } : g
      ));
      logError(`Failed to toggle group collapse: ${error}`);
    }
  }, [groups]);

  // Keyboard navigation functionality removed per user request

  // Close window function
  const handleCloseWindow = useCallback(async () => {
    try {
      const window = getCurrentWebviewWindow();
      await window.close();
    } catch (error) {
      logError(`Failed to close window: ${error}`);
      showSnackbar('Failed to close window', 'error');
    }
  }, [showSnackbar]);

  // Global context menu handler
  const handleGlobalContextMenu = useCallback((event) => {
    // Don't show global menu if right-clicking on project cards or other interactive elements
    if (event.target.closest('.project-card') || event.target.closest('[role="menu"]')) {
      return;
    }
    event.preventDefault();
    setGlobalContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
    });
  }, []);

  const handleCloseGlobalContextMenu = useCallback(() => {
    setGlobalContextMenu(null);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onContextMenu={handleGlobalContextMenu}
      >
        {/* App Bar */}
        <AppBar position="static" elevation={0} data-tauri-drag-region>
          <Toolbar data-tauri-drag-region>
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ flexGrow: 1, cursor: 'default' }} 
              data-tauri-drag-region
            >
              Claude Launcher
            </Typography>

            {/* Search Bar */}
            <TextField
              size="small"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              sx={{
                mr: 2,
                width: 300,
                backgroundColor: 'background.paper',
                borderRadius: 1,
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            {/* Sort Dropdown */}
            <FormControl
              size="small"
              sx={{
                mr: 2,
                minWidth: 140,
                backgroundColor: 'background.paper',
                borderRadius: 1,
              }}
            >
              <InputLabel>Sort by</InputLabel>
              <Select
                value={sortOption}
                label="Sort by"
                onChange={e => handleSortChange(e.target.value)}
                startAdornment={<SortIcon sx={{ mr: 1, color: 'text.secondary' }} />}
              >
                <MenuItem value="recent">Recently Used</MenuItem>
                <MenuItem value="name">Name (A-Z)</MenuItem>
              </Select>
            </FormControl>

            {/* Refresh Button */}
            <IconButton color="inherit" onClick={loadProjects} aria-label="Refresh projects">
              <RefreshIcon />
            </IconButton>

            {/* Export Button */}
            <Tooltip title="Export projects to file">
              <span>
                <IconButton
                  color="inherit"
                  onClick={handleExportProjects}
                  disabled={isExporting || projects.length === 0}
                  aria-label="Export projects"
                  sx={{ ml: 1 }}
                >
                  {isExporting ? <CircularProgress size={24} color="inherit" /> : <ExportIcon />}
                </IconButton>
              </span>
            </Tooltip>

            {/* Import Button */}
            <Tooltip title="Import projects from file">
              <span>
                <IconButton
                  color="inherit"
                  onClick={handleImportProjects}
                  disabled={isImporting}
                  aria-label="Import projects"
                  sx={{ ml: 1 }}
                >
                  {isImporting ? <CircularProgress size={24} color="inherit" /> : <ImportIcon />}
                </IconButton>
              </span>
            </Tooltip>

            {/* Theme Toggle */}
            <IconButton
              color="inherit"
              onClick={async () => {
                const newTheme = !darkMode;
                setDarkMode(newTheme);
                try {
                  await invoke('set_setting', {
                    key: 'theme_preference',
                    value: newTheme ? 'dark' : 'light',
                  });
                } catch (error) {
                  logError(`Failed to save theme preference: ${error}`);
                }
              }}
              aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
              sx={{ ml: 1 }}
            >
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>

            {/* Manage Groups Button */}
            <Tooltip title="Manage groups">
              <IconButton
                color="inherit"
                onClick={() => setGroupManagerOpen(true)}
                aria-label="Manage groups"
                sx={{ ml: 1 }}
              >
                <GroupIcon />
              </IconButton>
            </Tooltip>

            {/* Settings Button */}
            <IconButton
              color="inherit"
              onClick={() => setSettingsDialogOpen(true)}
              aria-label="Open settings"
              sx={{ ml: 1 }}
            >
              <SettingsIcon />
            </IconButton>

            {/* Close Button */}
            <IconButton
              color="inherit"
              onClick={handleCloseWindow}
              aria-label="Close application"
              sx={{ ml: 1 }}
            >
              <CloseIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <Container
          maxWidth="lg"
          sx={{
            flexGrow: 1,
            py: 4,
            position: 'relative',
          }}
        >
          {/* Tag Filter Section */}
          {!loading && allTags.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ mr: 2 }}>
                  Filter by Tags:
                </Typography>
                {activeTags.length > 0 && (
                  <Button
                    size="small"
                    startIcon={<ClearIcon />}
                    onClick={clearTagFilters}
                    sx={{ ml: 1 }}
                  >
                    Clear Filters
                  </Button>
                )}
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {allTags.map(tag => (
                  <Chip
                    key={tag}
                    label={tag}
                    variant={activeTags.includes(tag) ? 'filled' : 'outlined'}
                    color={activeTags.includes(tag) ? 'primary' : 'default'}
                    clickable
                    onClick={() => handleTagClick(tag)}
                    sx={{ mb: 1 }}
                  />
                ))}
              </Box>
              {activeTags.length > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Showing {filteredAndSortedProjects.length} project(s) with tags: {activeTags.join(', ')}
                </Typography>
              )}
            </Box>
          )}

          {loading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '50vh',
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <ProjectGrid
              projects={filteredAndSortedProjects}
              recentProjects={searchQuery || activeTags.length > 0 ? [] : recentProjects}
              groups={searchQuery || activeTags.length > 0 ? [] : groups}
              onUpdateProject={handleUpdateProject}
              onLaunchProject={handleLaunchProject}
              onDeleteProject={handleDeleteProject}
              onPinProject={handlePinProject}
              onTagClick={handleTagClick}
              onToggleGroupCollapse={handleToggleGroupCollapse}
              onMoveToGroup={handleMoveToGroup}
              loadingOperations={loadingOperations}
              cardScale={cardScale}
            />
          )}

        </Container>

        {/* Floating Action Button */}
        <Fab
          color="primary"
          aria-label="add"
          sx={{
            position: 'fixed',
            bottom: 32,
            right: 32,
          }}
          onClick={handleAddProject}
          disabled={loadingOperations.add}
        >
          {loadingOperations.add ? <CircularProgress size={24} color="inherit" /> : <AddIcon />}
        </Fab>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, projectId: null })}
        >
          <DialogTitle>Delete Project?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this project? This will only remove it from the
              launcher, not delete any files.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, projectId: null })}>
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              color="error"
              variant="contained"
              disabled={loadingOperations.delete === deleteDialog.projectId}
              startIcon={
                loadingOperations.delete === deleteDialog.projectId ? (
                  <CircularProgress size={16} color="inherit" />
                ) : null
              }
            >
              {loadingOperations.delete === deleteDialog.projectId ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        {/* Global Context Menu */}
        <Menu
          open={globalContextMenu !== null}
          onClose={handleCloseGlobalContextMenu}
          anchorReference="anchorPosition"
          anchorPosition={
            globalContextMenu !== null
              ? { top: globalContextMenu.mouseY, left: globalContextMenu.mouseX }
              : undefined
          }
        >
          <MenuItem onClick={() => { handleCloseGlobalContextMenu(); handleCloseWindow(); }}>
            <ListItemIcon>
              <CloseIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Close</ListItemText>
          </MenuItem>
        </Menu>

        {/* Drag Over Overlay - Frosted Glass Effect */}
        {dragOver && (
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 9999,
            }}
          >
            <Paper
              elevation={8}
              sx={{
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                border: '3px dashed',
                borderColor: 'primary.main',
                borderRadius: 3,
                backgroundColor: theme =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(30, 30, 30, 0.95)'
                    : 'rgba(255, 255, 255, 0.95)',
              }}
            >
              <FolderIcon sx={{ fontSize: 64, color: 'primary.main' }} />
              <Typography variant="h5" fontWeight="bold">
                Drop folder here
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add project to Claude Launcher
              </Typography>
            </Paper>
          </Box>
        )}

        {/* Settings Dialog */}
        <SettingsDialog
          open={settingsDialogOpen}
          onClose={() => setSettingsDialogOpen(false)}
          showSnackbar={showSnackbar}
          cardScale={cardScale}
          onCardScaleChange={setCardScale}
        />

        {/* Group Manager Dialog */}
        <GroupManager
          open={groupManagerOpen}
          onClose={() => setGroupManagerOpen(false)}
          groups={groups}
          onCreateGroup={handleCreateGroup}
          onUpdateGroup={handleUpdateGroup}
          onDeleteGroup={handleDeleteGroup}
          onReorderGroups={handleReorderGroups}
          showSnackbar={showSnackbar}
        />
      </Box>
    </ThemeProvider>
  );
}

export default App;
