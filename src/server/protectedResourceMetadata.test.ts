import { describe, it, expect } from 'vitest';
import { getProtectedResourceMetadata } from './protectedResourceMetadata.js';
import * as TH from './testHelpers.js';

describe('getProtectedResourceMetadata', () => {
  it('should return protected resource metadata', async () => {
    const req = TH.incomingMessage({
      url: 'https://example.com/.well-known/oauth-protected-resource'
    });
    const config = TH.config();
    const metadata = getProtectedResourceMetadata(config, 'https://example.com', req);
    expect(metadata).toMatchObject({
      resource: 'https://example.com',
      resource_name: 'A PayMcp Server',
      authorization_servers: ['https://auth.paymcp.com'],
      bearer_methods_supported: ['header'],
      scopes_supported: ['read', 'write'],
    });
  });

  it('should use payeeName as the resource_name', async () => {
    const req = TH.incomingMessage({
      url: 'https://example.com/.well-known/oauth-protected-resource'
    });
    const config = TH.config({payeeName: 'test-payee'});
    const metadata = getProtectedResourceMetadata(config, 'https://example.com', req);
    expect(metadata).toMatchObject({
      resource: 'https://example.com',
      resource_name: 'test-payee',
      authorization_servers: ['https://auth.paymcp.com'],
      bearer_methods_supported: ['header'],
      scopes_supported: ['read', 'write'],
    });
  });

  it('should return protected resource metadata for an http request', async () => {
    const req = TH.incomingMessage({
      url: 'http://example.com/.well-known/oauth-protected-resource/mcp'
    });
    const config = TH.config({mountPath: '/mcp'});
    const metadata = getProtectedResourceMetadata(config, 'https://example.com', req);
    expect(metadata).toMatchObject({
      resource: 'http://example.com/mcp',
      resource_name: 'A PayMcp Server',
      authorization_servers: ['https://auth.paymcp.com'],
      bearer_methods_supported: ['header'],
      scopes_supported: ['read', 'write'],
    });
  });

  it('should return null for a request that does not match the mountPath', async () => {
    const req = TH.incomingMessage({
      url: 'https://example.com/.well-known/oauth-protected-resource/some/sub/path'
    });
    const config = TH.config();
    const metadata = getProtectedResourceMetadata(config, 'https://example.com', req);
    expect(metadata).toBeNull();
  });

  it('should return null for a request that does not match the PRM path', async () => {
    const req = TH.incomingMessage({
      url: 'https://example.com/some/random/path'
    });
    const config = TH.config();
    const metadata = getProtectedResourceMetadata(config, 'https://example.com', req);
    expect(metadata).toBeNull();
  });

  it('should return null for a request to the root', async () => {
    const req = TH.incomingMessage({
      url: 'https://example.com'
    });
    const config = TH.config();
    const metadata = getProtectedResourceMetadata(config, 'https://example.com', req);
    expect(metadata).toBeNull();
  });

  it('should return PRM metadata for a url with a trailing slash', async () => {
    const req = TH.incomingMessage({
      url: 'https://example.com/.well-known/oauth-protected-resource/'
    });
    const config = TH.config();
    const metadata = getProtectedResourceMetadata(config, 'https://example.com', req);
    expect(metadata).toMatchObject({
      resource: 'https://example.com',
      resource_name: 'A PayMcp Server',
      authorization_servers: ['https://auth.paymcp.com'],
      bearer_methods_supported: ['header'],
      scopes_supported: ['read', 'write'],
    });
  });

  it('should return PRM metadata for a url without a trailing slash', async () => {
    const req = TH.incomingMessage({
      url: 'https://example.com/.well-known/oauth-protected-resource'
    });
    const config = TH.config();
    const metadata = getProtectedResourceMetadata(config, 'https://example.com', req);
    expect(metadata).toMatchObject({
      resource: 'https://example.com',
      resource_name: 'A PayMcp Server',
      authorization_servers: ['https://auth.paymcp.com'],
      bearer_methods_supported: ['header'],
      scopes_supported: ['read', 'write'],
    });
  });

  it('should return PRM metadata for a non-root mountPath with a trailing slash', async () => {
    const req = TH.incomingMessage({
      url: 'https://example.com/.well-known/oauth-protected-resource/mcp'
    });
    const config = TH.config({mountPath: '/mcp/'});
    const metadata = getProtectedResourceMetadata(config, 'https://example.com', req);
    expect(metadata).toMatchObject({
      resource: 'https://example.com/mcp',
      resource_name: 'A PayMcp Server',
      authorization_servers: ['https://auth.paymcp.com'],
      bearer_methods_supported: ['header'],
      scopes_supported: ['read', 'write'],
    });
  });

  it('should return PRM metadata for a non-root mountPath without a trailing slash', async () => {
    const req = TH.incomingMessage({
      url: 'https://example.com/.well-known/oauth-protected-resource/mcp'
    });
    const config = TH.config({mountPath: '/mcp'});
    const metadata = getProtectedResourceMetadata(config, 'https://example.com', req);
    expect(metadata).toMatchObject({
      resource: 'https://example.com/mcp',
      resource_name: 'A PayMcp Server',
      authorization_servers: ['https://auth.paymcp.com'],
      bearer_methods_supported: ['header'],
      scopes_supported: ['read', 'write'],
    });
  });

  it('should return PRM metadata for a non-root path with a query string', async () => {
    const req = TH.incomingMessage({
      url: 'https://example.com/.well-known/oauth-protected-resource/mcp?query=string'
    });
    const config = TH.config({mountPath: '/mcp'});
    const metadata = getProtectedResourceMetadata(config, 'https://example.com', req);
    expect(metadata).toMatchObject({
      resource: 'https://example.com/mcp',
      resource_name: 'A PayMcp Server',
      authorization_servers: ['https://auth.paymcp.com'],
      bearer_methods_supported: ['header'],
      scopes_supported: ['read', 'write'],
    });
  });

  it('should return PRM metadata for the message path', async () => {
    const req = TH.incomingMessage({
      url: 'https://example.com/.well-known/oauth-protected-resource/mcp/message'
    });
    const config = TH.config({mountPath: '/mcp'});
    const metadata = getProtectedResourceMetadata(config, 'https://example.com', req);
    expect(metadata).toMatchObject({
      resource: 'https://example.com/mcp/message',
      resource_name: 'A PayMcp Server',
      authorization_servers: ['https://auth.paymcp.com'],
      bearer_methods_supported: ['header'],
      scopes_supported: ['read', 'write'],
    });
  });
});