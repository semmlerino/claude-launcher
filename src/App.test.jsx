import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';
import { renderWithTheme, createMockProject, createMockProjects } from './test/testUtils.jsx';
import App from './App';

// Mock Tauri modules
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-log', () => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

vi.mock('@tauri-apps/api/webviewWindow', () => ({
  getCurrentWebviewWindow: vi.fn(() => ({})),
}));


describe('App Component', () => {
  let mockProjects;
  let mockSettings;

  beforeEach(() => {
    vi.clearAllMocks();
    clearMocks();

    // Set up test data
    mockProjects = [
      createMockProject({ id: 1, name: 'Test Project 1' }),
      createMockProject({ id: 2, name: 'Test Project 2' }),
      createMockProject({ id: 3, name: 'Test Project 3' }),
    ];

    mockSettings = {
      theme_preference: 'light',
      sort_preference: 'recent',
    };

    // Set up default IPC mocks - synchronously return values
    mockIPC((cmd, args) => {
      switch (cmd) {
        case 'init_database':
          return null;
        case 'get_projects':
          return mockProjects;
        case 'get_recent_projects':
          return mockProjects.slice(0, args?.limit || 5);
        case 'get_setting':
          return mockSettings[args?.key] || null;
        case 'set_setting':
          mockSettings[args.key] = args.value;
          return null;
        case 'check_claude_installed':
          return { installed: true };
        case 'add_project':
          const newProject = createMockProject({
            id: mockProjects.length + 1,
            path: args.path,
            name: args.path.split('/').pop(),
          });
          mockProjects.push(newProject);
          return newProject;
        case 'update_project':
          const projectIndex = mockProjects.findIndex(p => p.id === args.id);
          if (projectIndex !== -1) {
            mockProjects[projectIndex] = { 
              ...mockProjects[projectIndex], 
              ...args.updates 
            };
          }
          return null;
        case 'delete_project':
          mockProjects = mockProjects.filter(p => p.id !== args.id);
          return null;
        case 'launch_project':
          return { message: 'Project launched successfully' };
        default:
          console.warn(`Unmocked command: ${cmd}`);
          return null;
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization Flow', () => {
    it('should initialize database, load projects, settings, and check Claude installation', async () => {
      let commandCalls = [];
      
      mockIPC((cmd, args) => {
        commandCalls.push({ cmd, args });
        
        switch (cmd) {
          case 'init_database':
            return null;
          case 'get_projects':
            return mockProjects;
          case 'get_recent_projects':
            return mockProjects.slice(0, 5);
          case 'get_setting':
            return mockSettings[args?.key];
          case 'check_claude_installed':
            return { installed: true };
          default:
            return null;
        }
      });

      renderWithTheme(<App />);

      // Wait for initialization to complete
      await waitFor(() => {
        // Check that all initialization commands were called
        expect(commandCalls.some(c => c.cmd === 'init_database')).toBe(true);
        expect(commandCalls.some(c => c.cmd === 'get_projects')).toBe(true);
        expect(commandCalls.some(c => c.cmd === 'get_recent_projects')).toBe(true);
        expect(commandCalls.some(c => c.cmd === 'get_setting' && c.args?.key === 'sort_preference')).toBe(true);
        expect(commandCalls.some(c => c.cmd === 'get_setting' && c.args?.key === 'theme_preference')).toBe(true);
        expect(commandCalls.some(c => c.cmd === 'check_claude_installed')).toBe(true);
      });

      // Should display projects after loading
      await waitFor(() => {
        const project1Elements = screen.getAllByText('Test Project 1');
        expect(project1Elements.length).toBeGreaterThan(0);
      });
    });

    it('should show loading spinner during initialization', async () => {
      // Set up a delayed response for get_projects to ensure we see loading state
      let resolveProjects;
      const projectsPromise = new Promise(resolve => { resolveProjects = resolve; });
      
      mockIPC((cmd) => {
        if (cmd === 'get_projects') {
          // Return a promise that we control
          return projectsPromise;
        }
        // Return defaults for other commands
        switch (cmd) {
          case 'init_database':
            return null;
          case 'get_recent_projects':
            return [];
          case 'get_setting':
            return null;
          case 'check_claude_installed':
            return { installed: true };
          default:
            return null;
        }
      });
      
      renderWithTheme(<App />);
      
      // Check for loading state
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      
      // Resolve the promise to complete loading
      act(() => {
        resolveProjects(mockProjects);
      });
      
      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should show warning if Claude is not installed', async () => {
      mockIPC((cmd) => {
        if (cmd === 'check_claude_installed') {
          return { installed: false };
        }
        // Return defaults for other commands
        switch (cmd) {
          case 'init_database':
            return null;
          case 'get_projects':
            return [];
          case 'get_recent_projects':
            return [];
          case 'get_setting':
            return null;
          default:
            return null;
        }
      });

      renderWithTheme(<App />);

      await waitFor(() => {
        expect(screen.getByText('Claude Code is not installed or not in PATH')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Search Functionality', () => {
    it('should filter projects based on search query with debouncing', async () => {
      const user = userEvent.setup();
      renderWithTheme(<App />);

      // Wait for projects to load
      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search projects...');
      
      // Type search query
      await act(async () => {
        await user.type(searchInput, 'Project 2');
      });

      // Projects should still all be visible immediately (before debounce)
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      expect(screen.getByText('Test Project 2')).toBeInTheDocument();
      expect(screen.getByText('Test Project 3')).toBeInTheDocument();

      // Wait for debounce (300ms) and filtering
      await waitFor(() => {
        expect(screen.getByText('Test Project 2')).toBeInTheDocument();
        expect(screen.queryByText('Test Project 1')).not.toBeInTheDocument();
        expect(screen.queryByText('Test Project 3')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should search across multiple fields', async () => {
      const user = userEvent.setup();
      
      // Create project with unique tag
      mockProjects = [
        createMockProject({ id: 1, name: 'Alpha', tags: ['unique-tag'] }),
        createMockProject({ id: 2, name: 'Beta', tags: ['common'] }),
      ];
      
      renderWithTheme(<App />);

      await waitFor(() => {
        expect(screen.getByText('Alpha')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search projects...');
      
      await act(async () => {
        await user.type(searchInput, 'unique-tag');
      });

      // Wait for debounce and filtering
      await waitFor(() => {
        expect(screen.getByText('Alpha')).toBeInTheDocument();
        expect(screen.queryByText('Beta')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Tag Filtering', () => {
    it('should filter projects by selected tags', async () => {
      const user = userEvent.setup();
      
      // Set up projects with different tags
      mockProjects = [
        createMockProject({ id: 1, name: 'Frontend Project', tags: ['react', 'frontend'] }),
        createMockProject({ id: 2, name: 'Backend Project', tags: ['node', 'backend'] }),
        createMockProject({ id: 3, name: 'Fullstack Project', tags: ['react', 'node', 'fullstack'] }),
      ];

      renderWithTheme(<App />);

      await waitFor(() => {
        const frontendElements = screen.getAllByText('Frontend Project');
        expect(frontendElements.length).toBeGreaterThan(0);
      });

      // Click on 'react' tag - find it in the filter section
      const reactTags = screen.getAllByText('react');
      // The first occurrence should be in the filter section
      await act(async () => {
        await user.click(reactTags[0]);
      });

      // Should only show projects with 'react' tag
      await waitFor(() => {
        const frontendElements = screen.getAllByText('Frontend Project');
        expect(frontendElements.length).toBeGreaterThan(0);
        expect(screen.queryByText('Backend Project')).not.toBeInTheDocument();
        const fullstackElements = screen.getAllByText('Fullstack Project');
        expect(fullstackElements.length).toBeGreaterThan(0);
      });

      // Should show filter status
      expect(screen.getByText(/Showing 2 project\(s\) with tags: react/)).toBeInTheDocument();
    });

    it('should support multiple tag filters with AND logic', async () => {
      const user = userEvent.setup();
      
      mockProjects = [
        createMockProject({ id: 1, name: 'Project A', tags: ['react', 'frontend'] }),
        createMockProject({ id: 2, name: 'Project B', tags: ['react'] }),
        createMockProject({ id: 3, name: 'Project C', tags: ['frontend'] }),
      ];

      renderWithTheme(<App />);

      await waitFor(() => {
        const projectAElements = screen.getAllByText('Project A');
        expect(projectAElements.length).toBeGreaterThan(0);
      });

      // Select both tags
      const reactTags = screen.getAllByText('react');
      const frontendTags = screen.getAllByText('frontend');
      // Click the tag chips in the filter section
      await act(async () => {
        await user.click(reactTags[0]);
      });
      
      // Wait for first tag to be applied
      await waitFor(() => {
        expect(screen.getByText(/with tags: react/)).toBeInTheDocument();
      });
      
      await act(async () => {
        await user.click(frontendTags[0]);
      });

      // Only Project A has both tags
      await waitFor(() => {
        const projectAElements = screen.getAllByText('Project A');
        expect(projectAElements.length).toBeGreaterThan(0);
        expect(screen.queryByText('Project B')).not.toBeInTheDocument();
        expect(screen.queryByText('Project C')).not.toBeInTheDocument();
      });
      
      // Should show both tags in the filter status
      expect(screen.getByText(/with tags: react, frontend/)).toBeInTheDocument();
    });

    it('should clear tag filters', async () => {
      const user = userEvent.setup();
      
      mockProjects = [
        createMockProject({ id: 1, name: 'Tagged', tags: ['special'] }),
        createMockProject({ id: 2, name: 'Untagged', tags: [] }),
      ];

      renderWithTheme(<App />);

      await waitFor(() => {
        const taggedElements = screen.getAllByText('Tagged');
        expect(taggedElements.length).toBeGreaterThan(0);
      });

      // Apply filter - click the tag chip
      const specialTag = screen.getAllByText('special')[0];
      await act(async () => {
        await user.click(specialTag);
      });
      
      await waitFor(() => {
        expect(screen.queryByText('Untagged')).not.toBeInTheDocument();
      });

      // Clear filters
      await act(async () => {
        await user.click(screen.getByRole('button', { name: /clear filters/i }));
      });

      await waitFor(() => {
        const taggedElements = screen.getAllByText('Tagged');
        expect(taggedElements.length).toBeGreaterThan(0);
        const untaggedElements = screen.getAllByText('Untagged');
        expect(untaggedElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Sort Functionality', () => {
    it('should sort projects by name (A-Z)', async () => {
      const user = userEvent.setup();
      
      mockProjects = [
        createMockProject({ id: 1, name: 'Zebra', last_used: '2024-01-01T00:00:00Z' }),
        createMockProject({ id: 2, name: 'Alpha', last_used: '2024-01-03T00:00:00Z' }),
        createMockProject({ id: 3, name: 'Beta', last_used: '2024-01-02T00:00:00Z' }),
      ];

      renderWithTheme(<App />);

      await waitFor(() => {
        const zebraElements = screen.getAllByText('Zebra');
        expect(zebraElements.length).toBeGreaterThan(0);
      });

      // Change sort to name - find the select element directly
      const sortSelect = screen.getByRole('combobox');
      await act(async () => {
        await user.selectOptions(sortSelect, 'name');
      });

      // Verify alphabetical order - get all h2 elements
      await waitFor(() => {
        const projectNames = screen.getAllByRole('heading').map(h => h.textContent);
        
        // Find all instances of project names
        const alphaIndices = projectNames.map((name, index) => name === 'Alpha' ? index : -1).filter(i => i >= 0);
        const betaIndices = projectNames.map((name, index) => name === 'Beta' ? index : -1).filter(i => i >= 0);
        const zebraIndices = projectNames.map((name, index) => name === 'Zebra' ? index : -1).filter(i => i >= 0);
        
        // Check that at least one instance of each project follows alphabetical order
        // (this accounts for projects appearing in both recent and main sections)
        const hasCorrectOrder = alphaIndices.some(alphaIdx => 
          betaIndices.some(betaIdx => 
            zebraIndices.some(zebraIdx => 
              alphaIdx < betaIdx && betaIdx < zebraIdx
            )
          )
        );
        
        expect(hasCorrectOrder).toBe(true);
      });
    });

    it('should sort projects by recently used', async () => {
      mockProjects = [
        createMockProject({ id: 1, name: 'Old', last_used: '2024-01-01T00:00:00Z' }),
        createMockProject({ id: 2, name: 'Newest', last_used: '2024-01-03T00:00:00Z' }),
        createMockProject({ id: 3, name: 'Middle', last_used: '2024-01-02T00:00:00Z' }),
      ];

      renderWithTheme(<App />);

      await waitFor(() => {
        const newestElements = screen.getAllByText('Newest');
        expect(newestElements.length).toBeGreaterThan(0);
      });

      // Default sort should be recent - verify order
      await waitFor(() => {
        const projectNames = screen.getAllByRole('heading').map(h => h.textContent);
        
        // Find all instances of project names
        const newestIndices = projectNames.map((name, index) => name === 'Newest' ? index : -1).filter(i => i >= 0);
        const middleIndices = projectNames.map((name, index) => name === 'Middle' ? index : -1).filter(i => i >= 0);
        const oldIndices = projectNames.map((name, index) => name === 'Old' ? index : -1).filter(i => i >= 0);
        
        // Check that at least one instance of each project follows recent order
        // (this accounts for projects appearing in both recent and main sections)
        const hasCorrectOrder = newestIndices.some(newestIdx => 
          middleIndices.some(middleIdx => 
            oldIndices.some(oldIdx => 
              newestIdx < middleIdx && middleIdx < oldIdx
            )
          )
        );
        
        expect(hasCorrectOrder).toBe(true);
      });
    });

    it('should persist sort preference', async () => {
      const user = userEvent.setup();
      let savedSort = null;

      mockIPC((cmd, args) => {
        if (cmd === 'set_setting' && args.key === 'sort_preference') {
          savedSort = args.value;
          return null;
        }
        // Use default mocks
        switch (cmd) {
          case 'init_database':
            return null;
          case 'get_projects':
            return mockProjects;
          case 'get_recent_projects':
            return [];
          case 'get_setting':
            return null;
          case 'check_claude_installed':
            return { installed: true };
          default:
            return null;
        }
      });

      renderWithTheme(<App />);

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });

      // Change sort
      const sortSelect = screen.getByRole('combobox');
      await act(async () => {
        await user.selectOptions(sortSelect, 'name');
      });

      await waitFor(() => {
        expect(savedSort).toBe('name');
      });
    });
  });

  describe('Theme Toggle', () => {
    it('should toggle between light and dark themes', async () => {
      const user = userEvent.setup();
      let savedTheme = null;

      mockIPC((cmd, args) => {
        if (cmd === 'set_setting' && args.key === 'theme_preference') {
          savedTheme = args.value;
          return null;
        }
        // Use defaults for other commands
        switch (cmd) {
          case 'init_database':
            return null;
          case 'get_projects':
            return mockProjects;
          case 'get_recent_projects':
            return [];
          case 'get_setting':
            return mockSettings[args?.key];
          case 'check_claude_installed':
            return { installed: true };
          default:
            return null;
        }
      });

      renderWithTheme(<App />);

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });

      // Click theme toggle button
      const themeButton = screen.getByRole('button', { name: 'Switch to dark theme' });
      await act(async () => {
        await user.click(themeButton);
      });

      await waitFor(() => {
        expect(savedTheme).toBe('dark');
      });
    });
  });

  describe('Error Handling with Snackbar', () => {
    it('should show error when project loading fails', async () => {
      mockIPC((cmd) => {
        if (cmd === 'get_projects') {
          throw new Error('Database error');
        }
        // Return defaults
        switch (cmd) {
          case 'init_database':
            return null;
          case 'get_recent_projects':
            return [];
          case 'get_setting':
            return null;
          case 'check_claude_installed':
            return { installed: true };
          default:
            return null;
        }
      });

      renderWithTheme(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load projects: Error: Database error/)).toBeInTheDocument();
      });
    });

    it('should show warning for duplicate projects', async () => {
      const user = userEvent.setup();
      const { open } = await import('@tauri-apps/plugin-dialog');
      
      renderWithTheme(<App />);

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });

      // Override mock for add_project
      mockIPC((cmd, args) => {
        if (cmd === 'add_project') {
          throw new Error('Project already exists');
        }
        // Keep existing projects
        if (cmd === 'get_projects') {
          return mockProjects;
        }
        return null;
      });

      // Mock dialog
      open.mockResolvedValueOnce('/existing/path');

      // Click add button
      const addButton = screen.getByLabelText('add');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('This project already exists')).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should launch selected project with Enter key', async () => {
      const user = userEvent.setup();
      let launchedId = null;

      mockIPC((cmd, args) => {
        if (cmd === 'launch_project') {
          launchedId = args.id;
          return { message: 'Launched' };
        }
        // Use defaults
        switch (cmd) {
          case 'init_database':
            return null;
          case 'get_projects':
            return mockProjects;
          case 'get_recent_projects':
            return [];
          case 'get_setting':
            return null;
          case 'check_claude_installed':
            return { installed: true };
          default:
            return null;
        }
      });

      renderWithTheme(<App />);

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });

      // Navigate to second project and launch
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(launchedId).toBe(2);
    });

    it('should launch with continue flag on Shift+Enter', async () => {
      const user = userEvent.setup();
      let continueFlag = null;

      mockIPC((cmd, args) => {
        if (cmd === 'launch_project') {
          continueFlag = args.continueFlag;
          return { message: 'Launched' };
        }
        // Use defaults
        switch (cmd) {
          case 'init_database':
            return null;
          case 'get_projects':
            return mockProjects;
          case 'get_recent_projects':
            return [];
          case 'get_setting':
            return null;
          case 'check_claude_installed':
            return { installed: true };
          default:
            return null;
        }
      });

      renderWithTheme(<App />);

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });

      await user.keyboard('{Shift>}{Enter}{/Shift}');

      expect(continueFlag).toBe(true);
    });
  });

  describe('Drag and Drop Areas', () => {
    it('should show drop overlay on drag over', async () => {
      renderWithTheme(<App />);

      await waitFor(() => {
        const testProject1Elements = screen.getAllByText('Test Project 1');
        expect(testProject1Elements.length).toBeGreaterThan(0);
      });

      // Find the main app container
      const appContainer = document.querySelector('body > div > div');
      
      // Fire drag over event
      await act(async () => {
        const dragOverEvent = new Event('dragover', { bubbles: true });
        dragOverEvent.preventDefault = vi.fn();
        appContainer.dispatchEvent(dragOverEvent);
      });

      expect(screen.getByText('Drop folder here')).toBeInTheDocument();

      // Fire drag leave event
      await act(async () => {
        const dragLeaveEvent = new Event('dragleave', { bubbles: true });
        dragLeaveEvent.preventDefault = vi.fn();
        appContainer.dispatchEvent(dragLeaveEvent);
      });

      expect(screen.queryByText('Drop folder here')).not.toBeInTheDocument();
    });
  });

  describe('Add Project Functionality', () => {
    it('should add project through file dialog', async () => {
      const user = userEvent.setup();
      const { open } = await import('@tauri-apps/plugin-dialog');
      
      renderWithTheme(<App />);

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });

      // Mock dialog
      open.mockResolvedValueOnce('/new/project/path');

      // Click add button
      const addButton = screen.getByRole('button', { name: 'add' });
      await act(async () => {
        await user.click(addButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Added project: path/)).toBeInTheDocument();
      });
    });

    it('should show loading state while adding', async () => {
      const user = userEvent.setup();
      const { open } = await import('@tauri-apps/plugin-dialog');
      
      renderWithTheme(<App />);

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });

      // Mock slow dialog
      open.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('/path'), 100))
      );

      const addButton = screen.getByRole('button', { name: 'add' });
      await act(async () => {
        await user.click(addButton);
      });

      // Should show loading in button
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });
  });

  describe('Delete Dialog Flow', () => {
    it('should show confirmation dialog before deleting', async () => {
      const user = userEvent.setup();
      
      renderWithTheme(<App />);

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });

      // Find delete button for first project
      const deleteButtons = screen.getAllByRole('button', { name: 'Delete project' });
      
      await act(async () => {
        await user.click(deleteButtons[0]);
      });

      expect(screen.getByText('Delete Project?')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete this project/)).toBeInTheDocument();
    });

    it('should delete project on confirmation', async () => {
      const user = userEvent.setup();
      
      renderWithTheme(<App />);

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });

      // Click delete on first project
      const deleteButtons = screen.getAllByRole('button', { name: 'Delete project' });
      
      await act(async () => {
        await user.click(deleteButtons[0]);
      });
      
      // Confirm deletion
      await act(async () => {
        await user.click(screen.getByRole('button', { name: 'Delete' }));
      });

      await waitFor(() => {
        expect(screen.queryByText('Test Project 1')).not.toBeInTheDocument();
        expect(screen.getByText('Project deleted')).toBeInTheDocument();
      });
    });

    it('should cancel deletion', async () => {
      const user = userEvent.setup();
      
      renderWithTheme(<App />);

      await waitFor(() => {
        const testProject1Elements = screen.getAllByText('Test Project 1');
        expect(testProject1Elements.length).toBeGreaterThan(0);
      });

      // Click delete then cancel
      const deleteButtons = screen.getAllByRole('button', { name: 'Delete project' });
      
      await act(async () => {
        await user.click(deleteButtons[0]);
      });
      
      await act(async () => {
        await user.click(screen.getByRole('button', { name: 'Cancel' }));
      });

      // Project should still exist
      const testProject1Elements = screen.getAllByText('Test Project 1');
      expect(testProject1Elements.length).toBeGreaterThan(0);
      expect(screen.queryByText('Delete Project?')).not.toBeInTheDocument();
    });
  });
});