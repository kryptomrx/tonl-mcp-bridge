import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/examples/**',
      '**/*.example.ts',
      '**/*.d.ts',
      '**/*.config.ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'examples/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.example.ts',
        '**/mockData.ts'
      ]
    }
  }
});