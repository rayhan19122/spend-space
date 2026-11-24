import js from '@eslint/js'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'

export default [
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': reactHooks, 'react-refresh': reactRefresh, 'jsx-a11y': jsxA11y },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      // Lets no-unused-vars see JSX, so unused imports are reported.
      'react/jsx-uses-vars': 'error',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Only the service layer may talk to Supabase.
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['**/lib/supabase*'], message: 'Use a service in src/services instead.' }],
      }],
    },
  },
  {
    files: ['src/services/**', 'src/lib/**', 'src/context/AuthContext.jsx', 'src/main.jsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    // A context's provider and its hook belong together; this only affects hot reload in development.
    files: ['src/context/**'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['public/**', 'tests/e2e/**'],
    languageOptions: { globals: globals.browser, sourceType: 'script' },
    rules: { 'no-unused-vars': ['error', { caughtErrors: 'none' }] },
  },
  {
    files: ['tests/**', 'scripts/**', '*.config.js'], ignores: ['tests/e2e/**'],
    languageOptions: { globals: globals.node, ecmaVersion: 'latest', sourceType: 'module' },
  },
]
