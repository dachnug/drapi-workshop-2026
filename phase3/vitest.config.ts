import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'html', 'lcov', 'cobertura', 'json-summary'],
      include: ['src/**/*.ts', 'vite.config.ts'],
      exclude: ['test/**/*.test.ts'],
      thresholds: {
        statements: 90,
        lines: 90,
        functions: 100,
        branches: 75
      }
    }
  }
});
