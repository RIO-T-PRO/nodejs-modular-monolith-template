import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginPrettier from 'eslint-plugin-prettier';

export default defineConfig(
  {
    ignores: ['**/dist', '**/node_modules', 'coverage', '**/generated'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Root-level configuration files (eslint.config.js, vitest.config.ts)
    // are excluded from referenced project subfolders, so they use syntax-only linting.
    files: ['*.ts', '*.js'],
    plugins: {
      prettier: eslintPluginPrettier,
    },
    rules: {
      'prettier/prettier': 'warn',
    },
  },
  {
    // Internal application source files
    files: ['src/**/*.ts'],
    plugins: {
      prettier: eslintPluginPrettier,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'prettier/prettier': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'warn',
      // Monolithic Architecture Boundary Rule: Inter-module dependency safety.
      // Enforces that 'app' can only communicate with 'shared-kernel' or sibling modules
      // via public facades rather than internal directory leaks.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/src/shared-kernel/src/domain/**',
                '**/src/shared-kernel/src/infrastructure/**',
                '**/src/app/src/domain/**',
                '**/src/app/src/infrastructure/**',
              ],
              message:
                "Deep cross-module imports are forbidden. You must import exclusively via the module's entry point facade.",
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
);
