import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';
import { renderWithTheme, createMockProject } from './test/testUtils.jsx';
import App from './App';

// Note: Tauri modules are mocked globally in src/test/setup.js

describe('App Search Tests - Debug', () => {
  let mockProjects;

  beforeEach(() => {
    vi.clearAllMocks();
    clearMocks();

    mockProjects = [
      createMockProject({ id: 1, name: 'Test Project 1' }),
      createMockProject({ id: 2, name: 'Test Project 2' }),
      createMockProject({ id: 3, name: 'Test Project 3' }),
    ];

    mockIPC((cmd, args) => {
      switch (cmd) {
        case 'init_database':
          return null;
        case 'get_projects':
          return mockProjects;
        case 'get_recent_projects':
          return mockProjects.slice(0, args?.limit || 5);
        case 'get_setting':
          return null;
        case 'check_claude_installed':
          return { installed: true };
        default:
          return null;
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should render and show search input', async () => {
    renderWithTheme(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('Test Project 1').length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByPlaceholderText('Search projects...');
    expect(searchInput).toBeInTheDocument();
  });

  it('should update search input value', async () => {
    const user = userEvent.setup();
    renderWithTheme(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('Test Project 1').length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByPlaceholderText('Search projects...');

    await act(async () => {
      await user.type(searchInput, 'Project 2');
    });

    expect(searchInput.value).toBe('Project 2');
  });

  // Skip: Fake timer switching mid-test is fragile and pollutes subsequent tests.
  // Search/debounce functionality is already tested in App.test.jsx
  it.skip('should filter projects with fake timers - step by step', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    const { container } = renderWithTheme(<App />);

    // Wait for initial render with real timers temporarily
    vi.useRealTimers();
    await waitFor(() => {
      expect(screen.getAllByText('Test Project 1').length).toBeGreaterThan(0);
    });
    vi.useFakeTimers();

    const searchInput = screen.getByPlaceholderText('Search projects...');

    // Type search query
    await act(async () => {
      await user.type(searchInput, 'Project 2');
    });

    // Verify all projects are still visible before debounce
    expect(screen.getAllByText('Test Project 1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Test Project 2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Test Project 3').length).toBeGreaterThan(0);

    // Advance time for debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Switch back to real timers for waitFor
    vi.useRealTimers();

    // Wait for filtering to apply
    await waitFor(() => {
      expect(screen.getAllByText('Test Project 2').length).toBeGreaterThan(0);
      expect(screen.queryAllByText('Test Project 1').length).toBe(0);
      expect(screen.queryAllByText('Test Project 3').length).toBe(0);
    });
  });

  it('should filter projects without fake timers - wait for debounce', async () => {
    const user = userEvent.setup();

    renderWithTheme(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('Test Project 1').length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByPlaceholderText('Search projects...');

    // Type search query
    await act(async () => {
      await user.type(searchInput, 'Project 2');
    });

    // Just wait for the debounce naturally (300ms)
    await waitFor(
      () => {
        expect(screen.getAllByText('Test Project 2').length).toBeGreaterThan(0);
        expect(screen.queryAllByText('Test Project 1').length).toBe(0);
        expect(screen.queryAllByText('Test Project 3').length).toBe(0);
      },
      { timeout: 1000 },
    );
  });
});
