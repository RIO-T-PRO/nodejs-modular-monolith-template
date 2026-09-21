import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'unit:shared',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    clearMocks: true, // reset call history between tests
  },
});
