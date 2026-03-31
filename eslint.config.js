import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importX from 'eslint-plugin-import-x';
import sonarjs from 'eslint-plugin-sonarjs';
import cleanTimer from 'eslint-plugin-clean-timer';

export default tseslint.config(
  // === Base: JS recommended + TS strictTypeChecked ===
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,

  // === Frontend config (src/**/*.ts) ===
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'import-x': importX,
      'sonarjs': sonarjs,
      'clean-timer': cleanTimer,
    },
    rules: {
      // --- P0: Type Safety (MUST) ---
      '@typescript-eslint/no-explicit-any': 'error',
      // no-unsafe-* x5 inherited from strictTypeChecked

      // --- P1: Module Boundaries (MUST) ---
      'import-x/no-restricted-paths': ['error', {
        zones: [
          // Zone 1: shared cannot import engine/ui/ai
          { target: './src/shared/**', from: './src/engine/**', message: 'Shared 层不得导入 Engine 层' },
          { target: './src/shared/**', from: './src/ui/**', message: 'Shared 层不得导入 UI 层' },
          { target: './src/shared/**', from: './src/ai/**', message: 'Shared 层不得导入 AI 层' },
          // Zone 2: engine cannot import ui
          { target: './src/engine/**', from: './src/ui/**', message: 'Engine 层不得导入 UI 层' },
          // Zone 3: ai cannot import ui
          { target: './src/ai/**', from: './src/ui/**', message: 'AI 层不得导入 UI 层' },
        ],
      }],

      // --- P2: Code Quality (SHOULD) ---
      'sonarjs/cognitive-complexity': ['warn', 15],
      'sonarjs/no-identical-functions': 'warn',
      'clean-timer/assign-timer-id': 'warn',

      // --- P3: Maintainability (NICE) ---
      '@typescript-eslint/no-magic-numbers': ['warn', {
        ignore: [0, 1, -1, 2, 100],
        ignoreEnums: true,
        ignoreReadonlyClassProperties: true,
        ignoreArrayIndexes: true,
      }],

      // --- Project-specific relaxations ---
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/no-unnecessary-type-conversion': 'warn',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/restrict-plus-operands': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/unbound-method': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-base-to-string': 'warn',
      '@typescript-eslint/prefer-promise-reject-errors': 'warn',
    },
  },

  // === Backend config (server/**/*.ts) ===
  {
    files: ['server/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'import-x': importX,
    },
    rules: {
      // --- P0: Type Safety ---
      '@typescript-eslint/no-explicit-any': 'error',

      // --- P1: Module Boundaries ---
      'import-x/no-restricted-paths': ['error', {
        zones: [
          // Zone 4: server cannot import ui/engine/ai
          { target: './server/**', from: './src/ui/**', message: 'Server 不得导入 UI 层' },
          { target: './server/**', from: './src/engine/**', message: 'Server 不得导入 Engine 层' },
          { target: './server/**', from: './src/ai/**', message: 'Server 不得导入 AI 层' },
        ],
      }],

      // --- Project-specific relaxations ---
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/no-unnecessary-type-conversion': 'warn',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/restrict-plus-operands': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/unbound-method': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-base-to-string': 'warn',
      '@typescript-eslint/prefer-promise-reject-errors': 'warn',
    },
  },

  // === Global ignores ===
  {
    ignores: ['dist/**', 'node_modules/**', 'scripts/**', '*.js'],
  },
);
