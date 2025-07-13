import React, { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { info, error as logError, warn, debug } from '@tauri-apps/plugin-log';
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
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Refresh as RefreshIcon,
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

function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [darkMode, setDarkMode] = useState(prefersDarkMode);
  const [projects, setProjects] = useState([]);
  const [recentProjects, setRecentProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, projectId: null });
  const [dragOver, setDragOver] = useState(false);
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

  // Initialize the app
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await invoke('init_database');
        await loadProjects();
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

  // Filter projects based on search query
  useEffect(() => {
    if (!searchQuery) {
      setFilteredProjects(projects);
    } else {
      const filtered = matchSorter(projects, searchQuery, {
        keys: ['name', 'tags', 'notes', 'path']
      });
      setFilteredProjects(filtered);
    }
  }, [searchQuery, projects]);

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
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    // Filter for directories
    for (const file of files) {
      if (file.type === '' || file.type === 'directory') {
        // In a real implementation, we'd need to get the full path
        // For now, we'll show a message
        showSnackbar('Drag and drop is not fully supported yet. Please use the Add button.', 'info');
        break;
      }
    }
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
              onKeyNavigation={true}
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