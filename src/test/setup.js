import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { randomFillSync } from 'crypto';

// Clean up DOM after each test
afterEach(() => {
  cleanup();
});

// Polyfill crypto for jsdom
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
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'mock-masonry', ...props }, children);
  }
}));

// Mock console methods that might be noisy in tests
global.console = {
  ...console,
  // Keep error and warn for debugging test failures
  error: console.error,
  warn: console.warn,
  // Silence info and debug logs unless debugging
  info: vi.fn(),
  debug: vi.fn(),
  log: vi.fn(),
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));