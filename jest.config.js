module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 60000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: [
    "**/tests/**/*.test.ts",
    "**/tests/**/*_test.ts"
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts'
  ]
};
