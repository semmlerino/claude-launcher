import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  // Base JavaScript rules
  js.configs.recommended,

  // Main source files with React (excludes test files via pattern)
  {
    files: ['src/**/*.{js,jsx}', '!src/**/*.test.{js,jsx}', '!src/**/*.spec.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      // Explicit version instead of 'detect' - matches package.json react: ^18.3.1
      react: {
        version: '18',
      },
    },
    rules: {
      // ===== React Hooks Rules (Critical) =====
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // ===== React Best Practices (React 17+ with automatic JSX transform) =====
      // Enable jsx-uses-vars to detect JSX component usage for no-unused-vars
      'react/jsx-uses-vars': 'error',
      // No longer needed with automatic JSX transform (React 17+)
      'react/jsx-uses-react': 'off',
      // Not needed - automatic JSX transform doesn't require React in scope
      'react/react-in-jsx-scope': 'off',
      // Disabled since we're not using PropTypes - using TypeScript/inference instead
      'react/prop-types': 'off',

      // ===== Code Quality Rules =====
      'no-unused-vars': [
        'warn',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      // Prefer const/let over var
      'no-var': 'error',
      'prefer-const': 'warn',
      // Use === except for null/undefined checks
      'eqeqeq': ['error', 'always', { null: 'ignore' }],

      // ===== Logging Rules =====
      // Allow warn/error/info/debug in development; discourage console.log
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'debug'] }],

      // ===== Formatting Rules =====
      // NOTE: These are disabled when using Prettier to avoid conflicts.
      // If eslint-config-prettier is not installed, uncomment the rules below.
      // Prettier will handle formatting, so ESLint focuses on code quality.
      // 'semi': ['error', 'always'],
      // 'quotes': ['error', 'single', { avoidEscape: true }],
      // 'comma-dangle': ['error', 'always-multiline'],
      // 'no-multiple-empty-lines': ['error', { max: 1 }],
      // 'eol-last': ['error', 'always'],
    },
  },

  // Test files with relaxed rules
  {
    files: ['src/**/*.test.{js,jsx}', 'src/**/*.spec.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: {
        version: '18',
      },
    },
    rules: {
      // React Hooks still critical in tests
      'react-hooks/rules-of-hooks': 'error',
      // More lenient exhaustive-deps in tests (mock setup may not trigger all deps)
      'react-hooks/exhaustive-deps': 'warn',
      // Allow console in tests for debugging
      'no-console': 'off',
    },
  },

  // Ignore patterns - be specific
  {
    ignores: [
      'dist/',
      'node_modules/',
      'src-tauri/',
      '.github/',
      'coverage/',
      'build/',
      // Specific config files instead of wildcard
      'vite.config.js',
      'vitest.config.js',
      'wdio.conf.js',
      'eslint.config.js',
    ],
  },
];