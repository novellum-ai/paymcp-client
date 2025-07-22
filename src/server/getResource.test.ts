import { describe, it, expect } from 'vitest';
import { getProtectedResourceMetadata } from './protectedResourceMetadata.js';
import * as TH from './testHelpers.js';
import { getResource } from './getResource.js';

describe('getResource', () => {
  it('should use config resource if set', async () => {
    const req = TH.incomingMessage({
      url: 'https://example.com/.well-known/oauth-protected-resource/mcp'
    });
    const config = TH.config({resource: 'https://config-version.com/mcp'});
    const resource = getResource(config, req);
    expect(resource).toBe('https://config-version.com/mcp');
  });

  it('should parse request url if config resource not set', async () => {
    const req = TH.incomingMessage({
      url: 'https://example.com/.well-known/oauth-protected-resource/mcp'
    });
    const config = TH.config({resource: null});
    const resource = getResource(config, req);
    expect(resource).toBe('https://example.com/mcp');
  });

  it('should return resource for an http request', async () => {
    const req = TH.incomingMessage({
      url: 'http://example.com/.well-known/oauth-protected-resource/mcp'
    });
    const config = TH.config({mountPath: '/mcp'});
    const resource = getResource(config, req);
    expect(resource).toBe('http://example.com/mcp');
  });

  it('should strip trailing slash from url for an http request', async () => {
    const req = TH.incomingMessage({
      url: 'http://example.com/.well-known/oauth-protected-resource/mcp/'
    });
    const config = TH.config({mountPath: '/mcp'});
    const resource = getResource(config, req);
    expect(resource).toBe('http://example.com/mcp');
  });

  it('should strip query string from url for an http request', async () => {
    const req = TH.incomingMessage({
      url: 'http://example.com/.well-known/oauth-protected-resource/mcp?query=string'
    });
    const config = TH.config({mountPath: '/mcp'});
    const resource = getResource(config, req);
    expect(resource).toBe('http://example.com/mcp');
  });
});