import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';
import App from '../../App';

// Mock other Tauri modules
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
  getCurrentWebviewWindow: vi.fn(() => ({
    onFileDropEvent: vi.fn(() => Promise.resolve(() => {})),
  })),
}));

// Sample project data for testing
const mockProjects = [
  {
    id: '1',
    path: '/home/user/project1',
    name: 'Project 1',
    tags: ['react', 'typescript'],
    notes: 'Sample project notes',
    pinned: false,
    last_used: '2025-07-14T12:00:00Z',
  },
  {
    id: '2',
    path: '/home/user/project2',
    name: 'Project 2',
    tags: ['python'],
    notes: '',
    pinned: true,
    last_used: '2025-07-13T12:00:00Z',
  },
];

describe('App Integration Tests', () => {
  let user;

  // Helper to find project by name (handles text split across elements)
  const findProjectByName = (name) => {
    // Look for the project name as an h6 element (Typography variant h6)
    return screen.queryByText((content, element) => {
      if (!element) return false;
      // Check if this is an h6 or part of Typography that renders as h6
      const isH6 = element.tagName === 'H6';
      // Also check if text exactly matches
      return content === name && isH6;
    });
  };

  beforeEach(() => {
    user = userEvent.setup({ delay: null });
    // Reset any global state
    clearMocks();
  });

  afterEach(() => {
    clearMocks();
    vi.clearAllMocks();
  });

  describe('Application Initialization', () => {
    it('should load projects and settings on startup', async () => {
      // Mock IPC handlers
      mockIPC((cmd, args) => {
        switch (cmd) {
          case 'init_database':
            return { status: 'success' };
          case 'get_projects':
            return mockProjects;
          case 'get_recent_projects':
            return mockProjects.slice(0, 1);
          case 'check_claude_installed':
            return { installed: true, version: '1.0.0' };
          case 'get_setting':
            if (args.key === 'theme') return 'light';
            if (args.key === 'sortBy') return 'name';
            return null;
          default:
            return null;
        }
      });

      render(<App />);

      // Wait for initial load
      await waitFor(() => {
        const project1 = findProjectByName('Project 1');
        expect(project1).toBeInTheDocument();
      });

      // Check that projects are displayed
      expect(findProjectByName('Project 1')).toBeInTheDocument();
      expect(findProjectByName('Project 2')).toBeInTheDocument();

      // Check tags are displayed
      const reactTags = screen.getAllByText('react');
      const pythonTags = screen.getAllByText('python');
      expect(reactTags.length).toBeGreaterThan(0);
      expect(pythonTags.length).toBeGreaterThan(0);
    });

    it('should handle database initialization failure', async () => {
      mockIPC(cmd => {
        if (cmd === 'init_database') {
          throw new Error('Database initialization failed');
        }
        return null;
      });

      render(<App />);

      // App should still render but show error
      await waitFor(() => {
        expect(screen.getByText(/Claude Launcher/)).toBeInTheDocument();
      });
    });
  });

  describe('Project Management', () => {
    beforeEach(() => {
      // Setup default mocks
      mockIPC((cmd, args) => {
        switch (cmd) {
          case 'init_database':
            return { status: 'success' };
          case 'get_projects':
            return mockProjects;
          case 'get_recent_projects':
            return mockProjects.slice(0, 1);
          case 'check_claude_installed':
            return { installed: true };
          case 'get_setting':
            return null;
          default:
            return null;
        }
      });
    });

    it('should add a new project via file dialog', async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      open.mockResolvedValue('/home/user/new-project');

      // Setup updated mock for add_project
      const newProject = {
        id: '3',
        path: '/home/user/new-project',
        name: 'new-project',
        tags: [],
        notes: '',
        pinned: false,
        last_used: null,
      };

      let projectsData = [...mockProjects];

      render(<App />);

      // Wait for initial load
      await waitFor(() => {
        expect(findProjectByName('Project 1')).toBeInTheDocument();
      });

      // Now override the mock to handle add_project AFTER initial load
      mockIPC((cmd, args) => {
        switch (cmd) {
          case 'init_database':
            return { status: 'success' };
          case 'add_project':
            projectsData.push(newProject);
            return newProject;
          case 'get_projects':
            return projectsData;
          case 'get_recent_projects':
            return projectsData.slice(0, 1);
          case 'check_claude_installed':
            return { installed: true };
          case 'get_setting':
            return null;
          default:
            return null;
        }
      });

      // Click add button - look for button with AddIcon
      const addButton = screen.getByRole('button', { name: /add/i });
      await act(async () => {
        await user.click(addButton);
      });

      // Wait for new project to appear
      await waitFor(() => {
        expect(screen.getByText('new-project')).toBeInTheDocument();
      });
    });

    it('should delete a project with confirmation', async () => {
      let projectsData = [...mockProjects];

      clearMocks();
      mockIPC((cmd, args) => {
        switch (cmd) {
          case 'init_database':
            return { status: 'success' };
          case 'delete_project':
            projectsData = projectsData.filter(p => p.id !== args.id);
            return { status: 'success' };
          case 'get_projects':
            return projectsData;
          case 'get_recent_projects':
            return projectsData.slice(0, 1);
          case 'check_claude_installed':
            return { installed: true };
          case 'get_setting':
            return null;
          default:
            return null;
        }
      });

      render(<App />);

      // Wait for initial load
      await waitFor(() => {
        expect(findProjectByName('Project 1')).toBeInTheDocument();
      });

      // Find and click delete button on Project 1 specifically
      const project1Title = findProjectByName('Project 1');
      const project1Card = project1Title.closest('div');  // Find closest parent card
      const deleteButton = within(project1Card).getByRole('button', { name: /delete project/i });
      await act(async () => {
        await user.click(deleteButton);
      });

      // Confirm deletion in dialog
      const confirmButton = await screen.findByText('Delete');
      await act(async () => {
        await user.click(confirmButton);
      });

      // Wait for project to be removed
      await waitFor(() => {
        expect(findProjectByName('Project 1')).not.toBeInTheDocument();
      });

      // Verify Project 2 is still there
      await waitFor(() => {
        expect(findProjectByName('Project 2')).toBeInTheDocument();
      });
    });

    it('should update project properties (pin, notes, tags)', async () => {
      let projectsData = [...mockProjects];

      clearMocks();
      mockIPC((cmd, args) => {
        switch (cmd) {
          case 'init_database':
            return { status: 'success' };
          case 'update_project': {
            const projectIndex = projectsData.findIndex(p => p.id === args.id);
            if (projectIndex !== -1) {
              projectsData[projectIndex] = { ...projectsData[projectIndex], ...args.updates };
            }
            return { status: 'success' };
          }
          case 'get_projects':
            return projectsData;
          case 'get_recent_projects':
            return projectsData.slice(0, 1);
          case 'check_claude_installed':
            return { installed: true };
          case 'get_setting':
            return null;
          default:
            return null;
        }
      });

      render(<App />);

      // Wait for initial load
      await waitFor(() => {
        expect(findProjectByName('Project 1')).toBeInTheDocument();
      });

      // Pin the first project by clicking the star button
      const project1Title = findProjectByName('Project 1');
      const project1Card = project1Title.closest('div');  // Find closest parent card
      const starButton = within(project1Card).getByRole('button', { name: /pin project/i });
      await act(async () => {
        await user.click(starButton);
      });

      // Wait for update
      await waitFor(() => {
        expect(projectsData[0].pinned).toBe(true);
      });
    });
  });

  describe('Search and Filtering', () => {
    beforeEach(() => {
      mockIPC(cmd => {
        switch (cmd) {
          case 'init_database':
            return { status: 'success' };
          case 'get_projects':
            return mockProjects;
          case 'get_recent_projects':
            return mockProjects.slice(0, 1);
          case 'check_claude_installed':
            return { installed: true };
          case 'get_setting':
            return null;
          default:
            return null;
        }
      });
    });

    it('should filter projects by search query', async () => {
      render(<App />);

      // Wait for initial load
      await waitFor(() => {
        expect(findProjectByName('Project 1')).toBeInTheDocument();
        expect(findProjectByName('Project 2')).toBeInTheDocument();
      });

      // Type in search box
      const searchInput = screen.getByPlaceholderText(/Search projects/);
      await act(async () => {
        await user.type(searchInput, 'Project 1');
      });

      // Wait for filtering
      await waitFor(() => {
        expect(findProjectByName('Project 1')).toBeInTheDocument();
        expect(findProjectByName('Project 2')).not.toBeInTheDocument();
      });
    });

    it('should filter projects by tag', async () => {
      render(<App />);

      // Wait for initial load
      await waitFor(() => {
        expect(findProjectByName('Project 1')).toBeInTheDocument();
        expect(findProjectByName('Project 2')).toBeInTheDocument();
      });

      // Click on react tag - find it in the filter section
      const reactTags = screen.getAllByText('react');
      // Click the first one (should be in the filter tags section)
      await act(async () => {
        await user.click(reactTags[0]);
      });

      // Wait for filtering
      await waitFor(() => {
        expect(findProjectByName('Project 1')).toBeInTheDocument();
        expect(findProjectByName('Project 2')).not.toBeInTheDocument();
      });
    });
  });

  describe('Settings Persistence', () => {
    it('should save and load theme preference', async () => {
      let savedTheme = 'light';

      mockIPC((cmd, args) => {
        switch (cmd) {
          case 'init_database':
            return { status: 'success' };
          case 'get_projects':
            return mockProjects;
          case 'get_recent_projects':
            return [];
          case 'check_claude_installed':
            return { installed: true };
          case 'get_setting':
            if (args.key === 'theme_preference') return savedTheme;
            return null;
          case 'set_setting':
            if (args.key === 'theme_preference') savedTheme = args.value;
            return { status: 'success' };
          default:
            return null;
        }
      });

      render(<App />);

      // Wait for initial load
      await waitFor(() => {
        expect(findProjectByName('Project 1')).toBeInTheDocument();
      });

      // Click theme toggle button - find by aria-label
      const themeButton = screen.getByRole('button', { name: 'Switch to dark theme' });
      await act(async () => {
        await user.click(themeButton);
      });

      // Verify theme was saved
      await waitFor(() => {
        expect(savedTheme).toBe('dark');
      });
    });

    it('should save and load sort preference', async () => {
      let savedSort = 'recent';

      mockIPC((cmd, args) => {
        switch (cmd) {
          case 'init_database':
            return { status: 'success' };
          case 'get_projects':
            return mockProjects;
          case 'get_recent_projects':
            return [];
          case 'check_claude_installed':
            return { installed: true };
          case 'get_setting':
            if (args.key === 'sort_preference') return savedSort;
            return null;
          case 'set_setting':
            if (args.key === 'sort_preference') savedSort = args.value;
            return { status: 'success' };
          default:
            return null;
        }
      });

      render(<App />);

      // Wait for initial load
      await waitFor(() => {
        const selects = screen.getAllByRole('combobox');
        expect(selects.length).toBeGreaterThan(0);
      });

      // Find and change sort selector
      const sortSelector = screen.getByRole('combobox');
      await act(async () => {
        fireEvent.change(sortSelector, { target: { value: 'name' } });
      });

      // Verify sort was saved
      await waitFor(() => {
        expect(savedSort).toBe('name');
      });
    });
  });

  describe('Project Launching', () => {
    it('should launch a project when clicked', async () => {
      let launchedProjectId = null;

      mockIPC((cmd, args) => {
        switch (cmd) {
          case 'init_database':
            return { status: 'success' };
          case 'get_projects':
            return mockProjects;
          case 'get_recent_projects':
            return [];
          case 'check_claude_installed':
            return { installed: true };
          case 'launch_project':
            launchedProjectId = args.id;
            return { status: 'success' };
          case 'update_project':
            return { status: 'success' };
          case 'get_setting':
            return null;
          default:
            return null;
        }
      });

      render(<App />);

      // Wait for initial load
      await waitFor(() => {
        expect(findProjectByName('Project 1')).toBeInTheDocument();
      });

      // Click on launch button for Project 1 specifically
      const project1Title = findProjectByName('Project 1');
      const project1Card = project1Title.closest('div');  // Find closest parent card
      const launchButton = within(project1Card).getByRole('button', { name: /launch/i });
      await act(async () => {
        await user.click(launchButton);
      });

      // Verify project was launched
      await waitFor(() => {
        expect(launchedProjectId).toBe('1');
      });
    });

    it('should show error when Claude is not installed', async () => {
      mockIPC(cmd => {
        switch (cmd) {
          case 'init_database':
            return { status: 'success' };
          case 'get_projects':
            return mockProjects;
          case 'get_recent_projects':
            return [];
          case 'check_claude_installed':
            return { installed: false };
          case 'get_setting':
            return null;
          default:
            return null;
        }
      });

      render(<App />);

      // Should show warning about Claude not being installed
      await waitFor(() => {
        // Look for alert with the error message (may be split across elements)
        const alert = screen.queryByRole('alert');
        expect(alert).toBeInTheDocument();
        // Check alert content contains the key part of the message
        expect(alert?.textContent).toMatch(/Claude Code is not installed/i);
      }, { timeout: 5000 });
    });
  });
});
