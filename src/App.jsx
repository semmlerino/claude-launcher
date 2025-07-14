import React, { useState, useEffect, useCallback, useRef } from 'react';
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
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  Sort as SortIcon,
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
      return String(value || '').toLowerCase().includes(searchLower);
    });
  });
};

// Project sorting function
const sortProjects = (projects, sortBy) => {
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
  const [activeTags, setActiveTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, projectId: null });
  const [dragOver, setDragOver] = useState(false);
  const [selectedProjectIndex, setSelectedProjectIndex] = useState(0);
  const [sortOption, setSortOption] = useState('recent');
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
    [darkMode]
  );

  // Load sort preference
  const loadSortPreference = async () => {
    try {
      const savedSort = await invoke('get_setting', { key: 'sort_preference' });
      if (savedSort && (savedSort === 'name' || savedSort === 'recent')) {
        setSortOption(savedSort);
      }
    } catch (error) {
      // Use default if loading fails
      info('Using default sort preference');
    }
  };

  // Initialize the app
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await invoke('init_database');
        await loadProjects();
        await loadSortPreference();
        await checkClaudeInstalled();
      } catch (error) {
        logError(`Failed to initialize: ${error}`);
        showSnackbar(`Failed to initialize: ${error}`, 'error');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Set up file drop listener
  useEffect(() => {
    let unlisten;
    
    const setupListener = async () => {
      console.log('Setting up Tauri drag-drop listener...');
      info('Setting up Tauri drag-drop listener...');
      
      unlisten = await listen('tauri://drag-drop', async (event) => {
        console.log('Tauri drag-drop event received!', event);
        info('Tauri drag-drop event received', event);
        const paths = event.payload.paths || [];
        console.log('Dropped paths:', paths);
        
        for (const path of paths) {
          try {
            // Add the project directly - the backend will verify it's a valid directory
            console.log(`Adding dropped path: ${path}`);
            info(`Adding dropped path: ${path}`);
            await invoke('add_project', {
              path,
              name: path.split(/[\\/]/).pop() || 'Unnamed Project',
              tags: [],
              notes: '',
              pinned: false,
            });
            showSnackbar('Project added successfully!', 'success');
          } catch (error) {
            console.error(`Failed to add dropped project: ${error}`);
            logError(`Failed to add dropped project: ${error}`);
            showSnackbar(`Failed to add project: ${error}`, 'error');
          }
        }
        
        // Reload projects to show the new additions
        await loadProjects();
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
  }, []);

  // Load projects from backend
  const loadProjects = async () => {
    try {
      info('Loading projects...');
      const [allProjects, recent] = await Promise.all([
        invoke('get_projects'),
        invoke('get_recent_projects', { limit: 5 })
      ]);
      setProjects(allProjects);
      setRecentProjects(recent);
      setFilteredProjects(allProjects);
      info(`Loaded ${allProjects.length} projects`);
    } catch (error) {
      logError(`Failed to load projects: ${error}`);
      showSnackbar(`Failed to load projects: ${error}`, 'error');
    }
  };

  // Check if Claude Code is installed
  const checkClaudeInstalled = async () => {
    try {
      const result = await invoke('check_claude_installed');
      if (!result.installed) {
        showSnackbar('Claude Code is not installed or not in PATH', 'warning');
      }
    } catch (error) {
      logError(`Failed to check Claude installation: ${error}`);
    }
  };

  // Filter and sort projects based on search query, active tags, and sort option
  useEffect(() => {
    let filtered = projects;
    
    // Apply tag filter first
    if (activeTags.length > 0) {
      filtered = filtered.filter(project => 
        activeTags.every(tag => project.tags.includes(tag))
      );
    }
    
    // Apply search filter
    if (searchQuery) {
      filtered = matchSorter(filtered, searchQuery, {
        keys: ['name', 'tags', 'notes', 'path']
      });
    }
    
    // Apply sorting
    filtered = sortProjects(filtered, sortOption);
    
    setFilteredProjects(filtered);
    // Reset selection when filter or sort changes
    setSelectedProjectIndex(0);
  }, [searchQuery, projects, activeTags, sortOption]);

  // Get all unique tags from projects
  const getAllTags = useCallback(() => {
    const allTags = new Set();
    projects.forEach(project => {
      project.tags.forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags).sort();
  }, [projects]);

  // Handle tag filtering
  const handleTagClick = (tag) => {
    if (activeTags.includes(tag)) {
      setActiveTags(activeTags.filter(t => t !== tag));
    } else {
      setActiveTags([...activeTags, tag]);
    }
  };

  // Clear all tag filters
  const clearTagFilters = () => {
    setActiveTags([]);
  };

  // Handle sort option change
  const handleSortChange = async (newSortOption) => {
    setSortOption(newSortOption);
    try {
      await invoke('set_setting', { 
        key: 'sort_preference', 
        value: newSortOption 
      });
    } catch (error) {
      logError(`Failed to save sort preference: ${error}`);
    }
  };

  // Show snackbar message
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // Add a new project
  const handleAddProject = async () => {
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
    }
  };

  // Add project by path
  const addProjectByPath = async (path) => {
    try {
      const newProject = await invoke('add_project', { path });
      await loadProjects();
      showSnackbar(`Added project: ${newProject.name}`, 'success');
    } catch (error) {
      if (error.includes('already exists')) {
        showSnackbar('This project already exists', 'warning');
      } else {
        showSnackbar(`Failed to add project: ${error}`, 'error');
      }
    }
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    console.log('HTML dragOver event fired');
    info('HTML dragOver event fired');
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    console.log('HTML dragLeave event fired');
    info('HTML dragLeave event fired');
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = async (e) => {
    console.log('HTML drop event fired', e);
    info('HTML drop event fired');
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    // The actual file handling is done by the Tauri drag-drop event listener
    // This handler just prevents the browser's default behavior
  };

  // Update project
  const handleUpdateProject = async (projectId, updates) => {
    try {
      await invoke('update_project', { id: projectId, updates });
      await loadProjects();
      showSnackbar('Project updated', 'success');
    } catch (error) {
      showSnackbar(`Failed to update project: ${error}`, 'error');
    }
  };

  // Launch project
  const handleLaunchProject = async (projectId, continueFlag) => {
    try {
      const result = await invoke('launch_project', { 
        id: projectId, 
        continueFlag 
      });
      showSnackbar(result.message || 'Project launched', 'success');
      // Reload to update last_used
      await loadProjects();
    } catch (error) {
      showSnackbar(`Failed to launch project: ${error}`, 'error');
    }
  };

  // Delete project
  const handleDeleteProject = async (projectId) => {
    setDeleteDialog({ open: true, projectId });
  };

  const confirmDelete = async () => {
    try {
      await invoke('delete_project', { id: deleteDialog.projectId });
      await loadProjects();
      showSnackbar('Project deleted', 'success');
    } catch (error) {
      showSnackbar(`Failed to delete project: ${error}`, 'error');
    } finally {
      setDeleteDialog({ open: false, projectId: null });
    }
  };

  // Pin/unpin project
  const handlePinProject = async (projectId, pinned) => {
    try {
      await invoke('update_project', { 
        id: projectId, 
        updates: { pinned } 
      });
      await loadProjects();
    } catch (error) {
      showSnackbar(`Failed to update project: ${error}`, 'error');
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (filteredProjects.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedProjectIndex(prev => 
            prev < filteredProjects.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedProjectIndex(prev => 
            prev > 0 ? prev - 1 : filteredProjects.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredProjects[selectedProjectIndex]) {
            const selectedProject = filteredProjects[selectedProjectIndex];
            handleLaunchProject(selectedProject.id, e.shiftKey);
          }
          break;
        case 'Escape':
          setSelectedProjectIndex(0);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredProjects, selectedProjectIndex, handleLaunchProject]);

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
        <AppBar position="static" elevation={0}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Claude Launcher
            </Typography>
            
            {/* Search Bar */}
            <TextField
              size="small"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                onChange={(e) => handleSortChange(e.target.value)}
                startAdornment={<SortIcon sx={{ mr: 1, color: 'text.secondary' }} />}
              >
                <MenuItem value="recent">Recently Used</MenuItem>
                <MenuItem value="name">Name (A-Z)</MenuItem>
              </Select>
            </FormControl>

            {/* Refresh Button */}
            <IconButton color="inherit" onClick={loadProjects}>
              <RefreshIcon />
            </IconButton>

            {/* Theme Toggle */}
            <IconButton
              color="inherit"
              onClick={() => setDarkMode(!darkMode)}
              sx={{ ml: 1 }}
            >
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
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
          {!loading && getAllTags().length > 0 && (
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
                {getAllTags().map((tag) => (
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
              recentProjects={searchQuery ? [] : recentProjects}
              onUpdateProject={handleUpdateProject}
              onLaunchProject={handleLaunchProject}
              onDeleteProject={handleDeleteProject}
              onPinProject={handlePinProject}
              selectedProjectIndex={selectedProjectIndex}
              onTagClick={handleTagClick}
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
        >
          <AddIcon />
        </Fab>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, projectId: null })}
        >
          <DialogTitle>Delete Project?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this project? This will only remove it from the launcher, not delete any files.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, projectId: null })}>
              Cancel
            </Button>
            <Button onClick={confirmDelete} color="error" variant="contained">
              Delete
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