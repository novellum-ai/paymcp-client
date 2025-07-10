// Expo/React Native-specific tests for platform abstraction
// Only include tests relevant to cross-platform or Expo/React Native logic

import { describe, it, expect } from '@jest/globals';
import { SqliteOAuthDb } from './oAuthDb';

describe('SqliteOAuthDb (Expo)', () => {
  it('can be imported and instantiated without error', () => {
    expect(() => {
      new SqliteOAuthDb();
    }).not.toThrow();
  });

  it('platform detection should work in test environment', () => {
    // Even though we're in a test environment, we can verify the platform
    // detection logic exists and is being used
    const { getIsReactNative } = require('./platform/index');
    expect(typeof getIsReactNative).toBe('function');
    
    // In jest-expo environment, this might return false, but the function should exist
    expect(() => getIsReactNative()).not.toThrow();
  });
}); 