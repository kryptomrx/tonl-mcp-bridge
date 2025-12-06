/**
 * Jest Configuration for Streaming Tests
 */

export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  testMatch: [
    '**/tests/streams/**/*.test.ts'
  ],
  collectCoverageFrom: [
    'src/core/streams/**/*.ts',
    'src/mcp/server.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testTimeout: 30000, // 30s for large data tests
  maxWorkers: '50%', // Use half CPU cores
};
