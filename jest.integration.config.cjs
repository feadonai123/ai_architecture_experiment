/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test/integration'],
  testTimeout: 30000,
  maxWorkers: 1,
  setupFiles: ['<rootDir>/test/helpers/load-env.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/helpers/setup.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
};
