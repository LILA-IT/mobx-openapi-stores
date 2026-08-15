/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts', 'src/**/*.behavior.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'cobertura'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.behavior.test.ts',
        'src/**/*.bench.ts',
        'src/**/__tests__/**',
      ],
    },
    benchmark: {
      include: ['src/**/*.bench.ts'],
    },
  },
});
