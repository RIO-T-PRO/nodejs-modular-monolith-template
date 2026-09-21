import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['src/app', 'src/shared', 'src/modules/*', 'tests/integration', 'tests/e2e'],
    coverage: {
      provider: 'v8',
      include: ['src/app/src/**/*.ts', 'src/shared/src/**/*.ts', 'src/modules/*/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/generated/**', '**/*.d.ts'],
    },
  },
});
