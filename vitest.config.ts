import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['src/*', 'tests/integration', 'tests/e2e'],
    coverage: {
      provider: 'v8',
      include: ['src/*/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/generated/**', '**/*.d.ts'],
    },
  },
});
