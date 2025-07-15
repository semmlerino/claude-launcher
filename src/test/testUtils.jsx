import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { mockIPC } from '@tauri-apps/api/mocks';

// Custom render function that includes theme provider
export function renderWithTheme(ui, options = {}) {
  // Create theme lazily to avoid initialization issues
  const defaultTheme = createTheme({
    palette: {
      mode: 'light',
    },
  });
  
  const { theme = defaultTheme, ...renderOptions } = options;
  
  function Wrapper({ children }) {
    return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
  }
  
  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Mock data generators
export const createMockProject = (overrides = {}) => ({
  id: 1,
  path: '/path/to/project',
  name: 'Test Project',
  tags: ['test', 'mock'],
  notes: 'Test project notes',
  pinned: false,
  last_used: '2024-01-01T00:00:00Z',
  background_color: null,
  ...overrides,
});

export const createMockProjects = (count = 3) => {
  return Array.from({ length: count }, (_, i) => 
    createMockProject({ 
      id: i + 1, 
      name: `Test Project ${i + 1}`,
      path: `/path/to/project${i + 1}`,
    })
  );
};

// Common Tauri command mocks
export const setupCommonMocks = () => {
  const mocks = {
    projects: createMockProjects(5),
    settings: {
      theme_preference: 'light',
      sort_preference: 'recent',
    },
    claudeInstalled: true,
  };

  mockIPC((cmd, args) => {
    switch (cmd) {
      case 'init_database':
        return null;
      case 'get_projects':
        return mocks.projects;
      case 'get_recent_projects':
        return mocks.projects.slice(0, args?.limit || 5);
      case 'add_project':
        const newProject = createMockProject({
          id: mocks.projects.length + 1,
          path: args.path,
          name: args.path.split('/').pop(),
        });
        mocks.projects.push(newProject);
        return newProject;
      case 'update_project':
        const projectIndex = mocks.projects.findIndex(p => p.id === args.id);
        if (projectIndex !== -1) {
          mocks.projects[projectIndex] = { 
            ...mocks.projects[projectIndex], 
            ...args.updates 
          };
        }
        return null;
      case 'delete_project':
        mocks.projects = mocks.projects.filter(p => p.id !== args.id);
        return null;
      case 'launch_project':
        return { message: 'Project launched successfully' };
      case 'get_setting':
        return mocks.settings[args.key] || null;
      case 'set_setting':
        mocks.settings[args.key] = args.value;
        return null;
      case 'check_claude_installed':
        return { installed: mocks.claudeInstalled };
      default:
        console.warn(`Unmocked Tauri command: ${cmd}`);
        return null;
    }
  });

  return mocks;
};

// Wait for async updates in tests
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};