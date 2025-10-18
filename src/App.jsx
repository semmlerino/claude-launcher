import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
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
} from '@mui/icons-material';
import ProjectGrid from './components/ProjectGrid';
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
  const [filteredProjects, setFilteredProjects] = useState([]);
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
  const [isInitialized, setIsInitialized] = useState(false);
  const initializingRef = useRef(false);
  const dropZoneRef = useRef(null);

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
    } catch (error) {
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
    } catch (error) {
      // Use system preference if loading fails
      info('Using system theme preference');
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

  // Initialize the app
  useEffect(() => {
    const init = async () => {
      // Prevent multiple simultaneous initializations
      if (initializingRef.current || isInitialized) {
        info('Initialization already in progress or completed, skipping...');
        return;
      }

      initializingRef.current = true;

      try {
        setLoading(true);
        info('Starting application initialization...');

        // Initialize database
        await invoke('init_database');

        // Load all data in parallel
        await Promise.all([
          loadProjects(),
          loadSortPreference(),
          loadThemePreference(),
          checkClaudeInstalled(),
        ]);

        setIsInitialized(true);
        info('Application initialized successfully');
      } catch (error) {
        logError(`Failed to initialize: ${error}`);
        showSnackbar(`Failed to initialize: ${error}`, 'error');

        // Reset initialization flag on error to allow retry
        initializingRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [loadProjects, loadSortPreference, loadThemePreference, checkClaudeInstalled, showSnackbar]);

  // Set up file drop listener
  useEffect(() => {
    let unlisten;

    const setupListener = async () => {
      console.log('Setting up Tauri drag-drop listener...');
      info('Setting up Tauri drag-drop listener...');

      unlisten = await listen('tauri://drag-drop', async event => {
        console.log('Tauri drag-drop event received!', event);
        info('Tauri drag-drop event received', event);
        const paths = event.payload.paths || [];
        console.log('Dropped paths:', paths);

        for (const path of paths) {
          await addProjectByPath(path);
        }
      });

      console.log('Tauri drag-drop listener set up successfully');
      info('Tauri drag-drop listener set up successfully');
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
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

  // Update filtered projects when memoized value changes
  useEffect(() => {
    setFilteredProjects(filteredAndSortedProjects);
    // selectedProjectIndex reset removed - keyboard navigation not needed
  }, [filteredAndSortedProjects]);

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

  // Handle drag and drop
  const handleDragOver = e => {
    console.log('HTML dragOver event fired');
    info('HTML dragOver event fired');
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = e => {
    console.log('HTML dragLeave event fired');
    info('HTML dragLeave event fired');
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = async e => {
    console.log('HTML drop event fired', e);
    info('HTML drop event fired');
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    // The actual file handling is done by the Tauri drag-drop event listener
    // This handler just prevents the browser's default behavior
  };

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
      showSnackbar('Project updated', 'success');

      try {
        await invoke('update_project', { id: projectId, updates });
      } catch (error) {
        // Revert to original values on error
        updateProjectInState(projectId, {
          name: originalProject.name,
          tags: originalProject.tags,
          notes: originalProject.notes,
          background_color: originalProject.background_color,
          continue_flag: originalProject.continue_flag,
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
      console.error('No project ID provided for deletion');
      return;
    }

    console.log('Deleting project with ID:', deleteDialog.projectId);
    setLoadingOperations(prev => ({ ...prev, delete: deleteDialog.projectId }));

    try {
      await invoke('delete_project', { id: deleteDialog.projectId });
      await loadProjects();
      showSnackbar('Project deleted', 'success');
    } catch (error) {
      console.error('Delete project error:', error);
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        ref={dropZoneRef}
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
                  Showing {filteredProjects.length} project(s) with tags: {activeTags.join(', ')}
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
              projects={filteredProjects}
              recentProjects={searchQuery || activeTags.length > 0 ? [] : recentProjects}
              onUpdateProject={handleUpdateProject}
              onLaunchProject={handleLaunchProject}
              onDeleteProject={handleDeleteProject}
              onPinProject={handlePinProject}
              onTagClick={handleTagClick}
              loadingOperations={loadingOperations}
            />
          )}

          {/* Drag Over Overlay */}
          {dragOver && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 2,
                border: '3px dashed',
                borderColor: 'primary.main',
                pointerEvents: 'none',
              }}
            >
              <Typography variant="h4" color="primary">
                Drop folder here
              </Typography>
            </Box>
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
      </Box>
    </ThemeProvider>
  );
}

export default App;
