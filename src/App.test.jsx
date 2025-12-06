import { vi, describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';
import { renderWithTheme, createMockProject } from './test/testUtils.jsx';
import App from './App';

// Note: Tauri modules are mocked globally in src/test/setup.js
// Use mockIPC() for IPC customization, vi.mocked() for plugin overrides

describe('App Component', () => {
  let mockProjects;
  let mockSettings;

  beforeEach(() => {
    // Note: vi.clearAllMocks() is handled by vitest config (mockReset: true)
    // Tauri's clearMocks() is separate and still needed for IPC mock registry
    clearMocks();

    // Don't use fake timers by default - let tests opt in
    // vi.useFakeTimers();

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
        case 'get_groups':
          return [];
        case 'get_setting':
          return mockSettings[args?.key] || null;
        case 'set_setting':
          mockSettings[args.key] = args.value;
          return null;
        case 'check_claude_installed':
          return { installed: true };
        case 'add_project': {
          const newProject = createMockProject({
            id: mockProjects.length + 1,
            path: args.path,
            name: args.path.split('/').pop(),
          });
          mockProjects.push(newProject);
          return newProject;
        }
        case 'update_project': {
          const projectIndex = mockProjects.findIndex(p => p.id === args.id);
          if (projectIndex !== -1) {
            mockProjects[projectIndex] = {
              ...mockProjects[projectIndex],
              ...args.updates,
            };
          }
          return null;
        }
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

  // Note: afterEach cleanup is handled by vitest config (mockReset: true, clearMocks: true, restoreMocks: true)

  describe('Initialization Flow', () => {
    it('should initialize database, load projects, settings, and check Claude installation', async () => {
      const commandCalls = [];

      mockIPC((cmd, args) => {
        commandCalls.push({ cmd, args });

        switch (cmd) {
          case 'init_database':
            return null;
          case 'get_projects':
            return mockProjects;
          case 'get_recent_projects':
            return mockProjects.slice(0, 5);
          case 'get_groups':
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

      // Wait for initialization to complete
      await waitFor(() => {
        // Check that all initialization commands were called
        expect(commandCalls.some(c => c.cmd === 'init_database')).toBe(true);
        expect(commandCalls.some(c => c.cmd === 'get_projects')).toBe(true);
        expect(commandCalls.some(c => c.cmd === 'get_recent_projects')).toBe(true);
        expect(
          commandCalls.some(c => c.cmd === 'get_setting' && c.args?.key === 'sort_preference'),
        ).toBe(true);
        expect(
          commandCalls.some(c => c.cmd === 'get_setting' && c.args?.key === 'theme_preference'),
        ).toBe(true);
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
      const projectsPromise = new Promise(resolve => {
        resolveProjects = resolve;
      });

      mockIPC(cmd => {
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
          case 'get_groups':
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
      await waitFor(
        () => {
          expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    });

    it('should show warning if Claude is not installed', async () => {
      mockIPC(cmd => {
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
          case 'get_groups':
            return [];
          case 'get_setting':
            return null;
          default:
            return null;
        }
      });

      renderWithTheme(<App />);

      await waitFor(
        () => {
          expect(
            screen.getByText('Claude Code is not installed or not in PATH'),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    });
  });

  describe('Search Functionality', () => {
    it('should filter projects based on search query with debouncing', async () => {
      const user = userEvent.setup();

      renderWithTheme(<App />);

      // Wait for projects to load (use getAllByText - projects appear in both Recent and All sections)
      await waitFor(() => {
        const project1Elements = screen.getAllByText('Test Project 1');
        expect(project1Elements.length).toBeGreaterThan(0);
      });

      const searchInput = screen.getByPlaceholderText('Search projects...');

      // Type search query
      await act(async () => {
        await user.type(searchInput, 'Project 2');
      });

      // Projects should still all be visible immediately (before debounce)
      expect(screen.getAllByText('Test Project 1').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Test Project 2').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Test Project 3').length).toBeGreaterThan(0);

      // Wait for filtering
      await waitFor(() => {
        expect(screen.getAllByText('Test Project 2').length).toBeGreaterThan(0);
        expect(screen.queryAllByText('Test Project 1').length).toBe(0);
        expect(screen.queryAllByText('Test Project 3').length).toBe(0);
      });
    });

    it('should search across multiple fields', async () => {
      const user = userEvent.setup();

      // Create project with unique tag
      mockProjects = [
        createMockProject({ id: 1, name: 'Alpha', tags: ['unique-tag'] }),
        createMockProject({ id: 2, name: 'Beta', tags: ['common'] }),
      ];

      renderWithTheme(<App />);

      // Wait for projects to load (use getAllByText - projects appear in both Recent and All sections)
      await waitFor(() => {
        expect(screen.getAllByText('Alpha').length).toBeGreaterThan(0);
      });

      const searchInput = screen.getByPlaceholderText('Search projects...');

      await act(async () => {
        await user.type(searchInput, 'unique-tag');
      });

      // Wait for filtering
      await waitFor(() => {
        expect(screen.getAllByText('Alpha').length).toBeGreaterThan(0);
        expect(screen.queryAllByText('Beta').length).toBe(0);
      });
    });
  });

  describe('Tag Filtering', () => {
    it('should filter projects by selected tags', async () => {
      const user = userEvent.setup();

      // Set up projects with different tags
      mockProjects = [
        createMockProject({ id: 1, name: 'Frontend Project', tags: ['react', 'frontend'] }),
        createMockProject({ id: 2, name: 'Backend Project', tags: ['node', 'backend'] }),
        createMockProject({
          id: 3,
          name: 'Fullstack Project',
          tags: ['react', 'node', 'fullstack'],
        }),
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
        const alphaIndices = projectNames
          .map((name, index) => (name === 'Alpha' ? index : -1))
          .filter(i => i >= 0);
        const betaIndices = projectNames
          .map((name, index) => (name === 'Beta' ? index : -1))
          .filter(i => i >= 0);
        const zebraIndices = projectNames
          .map((name, index) => (name === 'Zebra' ? index : -1))
          .filter(i => i >= 0);

        // Check that at least one instance of each project follows alphabetical order
        // (this accounts for projects appearing in both recent and main sections)
        const hasCorrectOrder = alphaIndices.some(alphaIdx =>
          betaIndices.some(betaIdx =>
            zebraIndices.some(zebraIdx => alphaIdx < betaIdx && betaIdx < zebraIdx),
          ),
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
        const newestIndices = projectNames
          .map((name, index) => (name === 'Newest' ? index : -1))
          .filter(i => i >= 0);
        const middleIndices = projectNames
          .map((name, index) => (name === 'Middle' ? index : -1))
          .filter(i => i >= 0);
        const oldIndices = projectNames
          .map((name, index) => (name === 'Old' ? index : -1))
          .filter(i => i >= 0);

        // Check that at least one instance of each project follows recent order
        // (this accounts for projects appearing in both recent and main sections)
        const hasCorrectOrder = newestIndices.some(newestIdx =>
          middleIndices.some(middleIdx =>
            oldIndices.some(oldIdx => newestIdx < middleIdx && middleIdx < oldIdx),
          ),
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
          case 'get_groups':
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
        expect(screen.getAllByText('Test Project 1').length).toBeGreaterThan(0);
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
          case 'get_groups':
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
        expect(screen.getAllByText('Test Project 1').length).toBeGreaterThan(0);
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
      mockIPC(cmd => {
        if (cmd === 'get_projects') {
          throw new Error('Database error');
        }
        // Return defaults
        switch (cmd) {
          case 'init_database':
            return null;
          case 'get_recent_projects':
            return [];
          case 'get_groups':
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
        expect(
          screen.getByText(/Failed to load projects: Error: Database error/),
        ).toBeInTheDocument();
      });
    });

    it('should show warning for duplicate projects', async () => {
      const user = userEvent.setup();
      const { open } = await import('@tauri-apps/plugin-dialog');

      renderWithTheme(<App />);

      await waitFor(() => {
        expect(screen.getAllByText('Test Project 1').length).toBeGreaterThan(0);
      });

      // Override mock for add_project
      mockIPC((cmd, _args) => {
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
      await act(async () => {
        await user.click(addButton);
      });

      await waitFor(() => {
        expect(screen.getByText('This project already exists')).toBeInTheDocument();
      });
    });
  });

  // Keyboard Navigation functionality removed per user request

  describe('Drag and Drop Areas', () => {
    it('should show drop overlay on drag over', async () => {
      renderWithTheme(<App />);

      await waitFor(() => {
        const testProject1Elements = screen.getAllByText('Test Project 1');
        expect(testProject1Elements.length).toBeGreaterThan(0);
      });

      // Emit Tauri drag-enter event
      await act(async () => {
        globalThis.emitTauriEvent('tauri://drag-enter', {});
      });

      expect(screen.getByText('Drop folder here')).toBeInTheDocument();

      // Emit Tauri drag-leave event
      await act(async () => {
        globalThis.emitTauriEvent('tauri://drag-leave', {});
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
        expect(screen.getAllByText('Test Project 1').length).toBeGreaterThan(0);
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
        expect(screen.getAllByText('Test Project 1').length).toBeGreaterThan(0);
      });

      // Mock slow dialog
      open.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('/path'), 100)),
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
        expect(screen.getAllByText('Test Project 1').length).toBeGreaterThan(0);
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
        expect(screen.getAllByText('Test Project 1').length).toBeGreaterThan(0);
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

  describe('Close Functionality', () => {
    beforeEach(() => {
      // Ensure proper initialization for close functionality tests
      mockProjects = [
        createMockProject({ id: 1, name: 'Test Project 1' }),
      ];
    });

    it('should close window when X button is clicked', async () => {
      const user = userEvent.setup();
      const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const mockClose = vi.fn();
      getCurrentWebviewWindow.mockReturnValue({ close: mockClose });

      renderWithTheme(<App />);

      // Wait for app to fully load
      await waitFor(() => {
        expect(screen.getByText('Claude Launcher')).toBeInTheDocument();
      });

      // Wait for projects to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });

      // Find and click the close button
      const closeButton = screen.getByRole('button', { name: 'Close application' });
      await act(async () => {
        await user.click(closeButton);
      });

      expect(mockClose).toHaveBeenCalled();
    });

    it('should show global context menu on right click', async () => {
      const user = userEvent.setup();

      renderWithTheme(<App />);

      // Wait for app to fully load
      await waitFor(() => {
        expect(screen.getByText('Claude Launcher')).toBeInTheDocument();
      });

      // Wait for projects to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });

      // Right-click on the main container
      const appContainer = document.querySelector('body > div > div');
      await act(async () => {
        await user.pointer({
          keys: '[MouseRight]',
          target: appContainer,
        });
      });

      // Check that context menu appears with Close option
      await waitFor(() => {
        expect(screen.getByText('Close')).toBeInTheDocument();
      });
    });

    it('should close window when context menu Close is clicked', async () => {
      const user = userEvent.setup();
      const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const mockClose = vi.fn();
      getCurrentWebviewWindow.mockReturnValue({ close: mockClose });

      renderWithTheme(<App />);

      // Wait for app to fully load
      await waitFor(() => {
        expect(screen.getByText('Claude Launcher')).toBeInTheDocument();
      });

      // Wait for projects to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });

      // Right-click to open context menu
      const appContainer = document.querySelector('body > div > div');
      await act(async () => {
        await user.pointer({
          keys: '[MouseRight]',
          target: appContainer,
        });
      });

      // Click Close in the context menu
      const closeMenuItem = await screen.findByText('Close');
      await act(async () => {
        await user.click(closeMenuItem);
      });

      expect(mockClose).toHaveBeenCalled();
    });

    it('should handle close window errors gracefully', async () => {
      const user = userEvent.setup();
      const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const mockClose = vi.fn().mockRejectedValue(new Error('Failed to close'));
      getCurrentWebviewWindow.mockReturnValue({ close: mockClose });

      renderWithTheme(<App />);

      // Wait for app to fully load
      await waitFor(() => {
        expect(screen.getByText('Claude Launcher')).toBeInTheDocument();
      });

      // Wait for projects to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });

      // Click the close button
      const closeButton = screen.getByRole('button', { name: 'Close application' });
      await act(async () => {
        await user.click(closeButton);
      });

      // Should show error snackbar
      await waitFor(() => {
        expect(screen.getByText('Failed to close window')).toBeInTheDocument();
      });
    });
  });
});
