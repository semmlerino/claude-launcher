import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.js'],
    // Timeout configurations (use per-test timeout for known slow tests)
    testTimeout: 10000,    // 10 seconds per test
    hookTimeout: 10000,    // 10 seconds for hooks
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.config.js',
        '**/mockData.js',
        '**/index.js',
        '**/main.jsx',
      ],
    },
    // Mock Tauri API by default
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@test': path.resolve(__dirname, './src/test'),
    },
  },
});