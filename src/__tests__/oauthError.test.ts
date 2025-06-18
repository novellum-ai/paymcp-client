import { OAuthAuthenticationRequiredError } from '../oAuth.js';
import { describe, it, expect } from 'vitest';

describe('OAuthAuthenticationRequiredError', () => {
  it('should return the same idempotencyKey for the same url, resource server url, and token', () => {
    const url = 'https://foo.com/mcp';
    const resourceServerUrl = 'https://example.com';
    const token = 'test-token';
    const error1 = new OAuthAuthenticationRequiredError(url, resourceServerUrl, token);
    const error2 = new OAuthAuthenticationRequiredError(url, resourceServerUrl, token);
    expect(error1.idempotencyKey).toBe(error2.idempotencyKey);
  });

  it('should return the same idempotencyKey as long as the url base is the same', () => {
    const url1 = 'https://foo.com/mcp?a=b';
    const url2 = 'https://foo.com/mcp?y=z';
    const resourceServerUrl = 'https://example.com';
    const token = 'test-token';
    const error1 = new OAuthAuthenticationRequiredError(url1, resourceServerUrl, token);
    const error2 = new OAuthAuthenticationRequiredError(url2, resourceServerUrl, token);
    expect(error1.idempotencyKey).toBe(error2.idempotencyKey);
  });

  it('should return an idempotencyKey for undefined/null tokens', () => {
    const url = 'https://foo.com/mcp';
    const resourceServerUrl = 'https://example.com';
    const error = new OAuthAuthenticationRequiredError(url, resourceServerUrl, undefined);
    expect(error.idempotencyKey.length).toBeGreaterThan(10);
  });

  it('should return different idempotencyKeys for different tokens', () => {
    const url = 'https://foo.com/mcp';
    const resourceServerUrl = 'https://example.com';
    const token1 = 'test-token';
    const token2 = 'test-token2';
    const error1 = new OAuthAuthenticationRequiredError(url, resourceServerUrl, token1);
    const error2 = new OAuthAuthenticationRequiredError(url, resourceServerUrl, token2);
    const error3 = new OAuthAuthenticationRequiredError(url, resourceServerUrl, undefined);
    expect(error1.idempotencyKey).not.toBe(error2.idempotencyKey);
    expect(error1.idempotencyKey).not.toBe(error3.idempotencyKey);
    expect(error2.idempotencyKey).not.toBe(error3.idempotencyKey);
  });
});