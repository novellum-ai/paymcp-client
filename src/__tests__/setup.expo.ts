// Expo test setup - simulates React Native environment
import { jest } from '@jest/globals';

// Mock React Native globals
global.navigator = {
  product: 'ReactNative',
} as any;

// Polyfill TextEncoder for Jest environment
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock Expo modules
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({
    execAsync: jest.fn(),
    prepareAsync: jest.fn(),
    closeAsync: jest.fn(),
  })),
}));

jest.mock('expo-crypto', () => ({
  digest: jest.fn(),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA256',
  },
}));

jest.mock('react-native-url-polyfill', () => ({
  URL: global.URL,
}));

// Set up test environment
process.env.NODE_ENV = 'test'; 