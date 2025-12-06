import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import vitest from '@vitest/eslint-plugin';

// Shared configuration for both main and test code
const sharedReactConfig = {
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
};

const jsxParserOptions = {
  ecmaFeatures: {
    jsx: true,
  },
};

export default [
  // Base JavaScript rules
  js.configs.recommended,

  // Linter hygiene - report unused eslint-disable comments
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'warn',
    },
  },

  // Main source files with React
  {
    files: ['src/**/*.{js,jsx}'],
    ignores: ['src/**/*.test.{js,jsx}', 'src/**/*.spec.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: jsxParserOptions,
    },
    ...sharedReactConfig,
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
      // Disabled - this is a JS-only project without PropTypes or TypeScript
      'react/prop-types': 'off',

      // ===== React Safety Rules =====
      'react/jsx-key': 'error',
      'react/no-unknown-property': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/self-closing-comp': 'warn',

      // ===== Code Quality Rules =====
      'no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      // Prefer const/let over var
      'no-var': 'error',
      'prefer-const': 'error',
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

  // Test files with Vitest plugin and relaxed rules
  {
    files: ['src/**/*.test.{js,jsx}', 'src/**/*.spec.{js,jsx}'],
    plugins: {
      ...sharedReactConfig.plugins,
      vitest,
    },
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...vitest.environments.env.globals,
      },
      parserOptions: jsxParserOptions,
    },
    settings: sharedReactConfig.settings,
    rules: {
      // Vitest recommended rules
      ...vitest.configs.recommended.rules,

      // React JSX support - enables recognition of JSX usage for no-unused-vars
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',

      // Allow underscore-prefixed unused variables in tests
      'no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],

      // React Hooks still critical in tests
      'react-hooks/rules-of-hooks': 'error',
      // Same level as main code - exhaustive-deps helps catch missing test cleanup
      'react-hooks/exhaustive-deps': 'warn',
      // Allow console in tests for debugging
      'no-console': 'off',
    },
  },

  // Configuration files that need linting
  {
    files: ['vite.config.js', 'vitest.config.js', 'wdio.conf.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      // Config files often have one-time patterns that don't need strict rules
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
      // ESLint's own config doesn't need linting
      'eslint.config.js',
    ],
  },
];
