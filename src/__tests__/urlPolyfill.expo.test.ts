// Expo/React Native-specific tests for platform abstraction
// Only include tests relevant to cross-platform or Expo/React Native logic

import { describe, it, expect } from '@jest/globals';

describe('URL polyfill (Expo)', () => {
  it('should provide a working global URL constructor', () => {
    expect(() => {
      const url = new URL('https://example.com/path?foo=bar');
      expect(url.hostname).toBe('example.com');
      expect(url.pathname).toBe('/path');
      expect(url.searchParams.get('foo')).toBe('bar');
    }).not.toThrow();
  });
}); 