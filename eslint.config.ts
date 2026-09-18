import js from '@eslint/js';
import type { Linter } from 'eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

/* ------------------------------ Layout ------------------------------ */

// Must match the "name" scope in every package.json (e.g. "@templae/shared")
const scope = '@templae';

const src = (name: string) => `src/${name}/src/**/*.ts`;

// Must match both the folder name (src/<name>) and the package name (@templae/<name>)
const modules = ['user', 'refresh_token'] as const;

// Package name patterns: the bare package and any subpath
const pkg = (m: string) => [`${scope}/${m}`, `${scope}/${m}/**`];
const deepOf = (m: string) => `${scope}/${m}/**`;

const otherModules = (self: string) => modules.filter((m) => m !== self);

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
    files: ['**/*.spec.ts', 'tests/**/*.ts'],
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

  // A module may not import another module; talk via events in @templae/shared
  ...modules.map((self) =>
    forbidImports(
      [src(self)],
      otherModules(self).flatMap(pkg),
      `Modules communicate through events in ${scope}/shared, not direct imports.`,
    ),
  ),

  // shared depends on nothing
  forbidImports([src('shared')], modules.flatMap(pkg), 'shared must not depend on modules.'),

  // The composition root may import modules, but only through their public entry point
  forbidImports(
    [src('app')],
    modules.map(deepOf),
    'Import modules through their entry point only (package `exports`), never deep paths.',
  ),

  /* ---------- Response envelope guardrail ---------- */
  // Handlers return data / ApiResponse and let ApiResponse.handler send it.
  // The contract test is the real guarantee; this just catches the obvious cases.
  {
    files: modules.map((m) => `src/${m}/src/**/http/**/*.ts`),
    ignores: ['**/*.spec.ts'],
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
