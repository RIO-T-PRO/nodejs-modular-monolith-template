import js from '@eslint/js';
import type { Linter } from 'eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

/* ------------------------------ Layout ------------------------------ */

const scope = '@template';

interface Module {
  dir: string; // folder under src/modules/
  name: string; // "name" in that package.json
}

// Add a module here when you create it. `name` must match its package.json exactly.
const modules: Module[] = [
  { dir: 'user', name: `${scope}/user-module` },
  { dir: 'refresh_token', name: `${scope}/refresh-token-module` }, // adjust to your real package name
];

const packageSrc = (dir: string) => `src/${dir}/src/**/*.ts`; // shared, app
const moduleSrc = (m: Module) => `src/modules/${m.dir}/src/**/*.ts`;

// The bare package name and any subpath
const pkgGlobs = (name: string) => [name, `${name}/**`];
const otherModules = (self: Module) => modules.filter((m) => m.dir !== self.dir);

const appPkg = `${scope}/app`;
const sharedPkg = `${scope}/shared`;

/* ------------------------------ Helpers ------------------------------ */

// Rule options are replaced, not merged, across config objects, so each file
// scope gets exactly one no-restricted-imports entry, built here.
const forbidImports = (files: string[], group: string[], message: string): Linter.Config => ({
  files,
  rules: { 'no-restricted-imports': ['error', { patterns: [{ group, message }] }] },
});

export default defineConfig(
  globalIgnores(['**/dist', '**/node_modules', '**/coverage', '**/generated']),

  /* ---------- Baseline: type-aware linting for all package code ---------- */
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'warn',
    },
  },

  /* ---------- Tests: supertest/JSON bodies are `any` ---------- */
  {
    files: ['**/*.test.ts', 'tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },

  /* ---------- Tooling files that belong to no tsconfig ---------- */
  {
    files: ['*.{js,ts}', '**/*.config.{js,ts}'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  /* ---------- Boundaries ---------- */

  // A module may not import another module or the app; talk via events in shared
  ...modules.map((self) =>
    forbidImports(
      [moduleSrc(self)],
      [...otherModules(self).flatMap((m) => pkgGlobs(m.name)), ...pkgGlobs(appPkg)],
      `Modules communicate through events in ${sharedPkg}, not direct imports.`,
    ),
  ),

  // shared depends on nothing
  forbidImports(
    [packageSrc('shared')],
    [...modules.flatMap((m) => pkgGlobs(m.name)), ...pkgGlobs(appPkg)],
    'shared must not depend on modules or the app.',
  ),

  // The composition root may import modules, but only through their entry point
  forbidImports(
    [packageSrc('app')],
    modules.map((m) => `${m.name}/**`),
    'Import modules through their entry point only (package `exports`), never deep paths.',
  ),

  /* ---------- Response envelope guardrail ---------- */
  // Handlers return data / ApiResponse and let ApiResponse.handler send it.
  // The contract test is the real guarantee; this just catches the obvious cases.
  {
    files: modules.map((m) => `src/modules/${m.dir}/src/**/http/**/*.ts`),
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.property.name=/^(json|jsonp|send|sendStatus)$/]',
          message:
            'Return data or an ApiResponse from ApiResponse.handler(...) instead of calling res.json/send directly.',
        },
      ],
    },
  },

  // Must stay last: turns off rules that conflict with Prettier
  eslintConfigPrettier,
);
