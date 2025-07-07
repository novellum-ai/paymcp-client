// Expo/React Native-specific tests for platform abstraction
// Only include tests relevant to cross-platform or Expo/React Native logic

import { describe, it, expect } from '@jest/globals';
import { SqliteOAuthDb } from '../oAuthDb';

describe('SqliteOAuthDb (Expo minimal smoke test)', () => {
  it('can be imported and instantiated without error', () => {
    expect(() => {
      new SqliteOAuthDb({
        encrypt: (s) => s,
        decrypt: (s) => s,
      });
    }).not.toThrow();
  });
}); 