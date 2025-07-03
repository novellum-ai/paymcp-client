module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/**/*.expo.test.ts', '**/__tests__/**/*.expo.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.expo.ts'],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(oauth4webapi|@solana|fetch-mock|@react-native|react-native-url-polyfill|expo-modules-core|expo|@expo|@unimodules|@babel|@react-native|react-native|@react-navigation)/)'
  ],
}; 