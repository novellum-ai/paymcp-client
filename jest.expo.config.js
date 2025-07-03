module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.expo.ts'],
  // Mock Node.js modules that don't exist in React Native
  moduleNameMapping: {
    '^crypto$': 'react-native-crypto',
  },
  // Ensure we're testing in React Native environment
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
}; 