import { describe, it, expect } from 'vitest';
import { getProtectedResourceMetadata } from './protectedResourceMetadata.js';
import * as TH from './serverTestHelpers.js';
import { getResource } from './getResource.js';

describe('getResource', () => {
  it('should use config resource if set', async () => {
    const config = TH.config({resource: 'https://config-version.com/mcp'});
    const resource = getResource(config, new URL(`https://example.com/.well-known/oauth-protected-resource/mcp`));
    expect(resource).toMatchObject(new URL('https://config-version.com/mcp'));
  });

  it('should parse request url if config resource not set', async () => {
    const config = TH.config({resource: null});
    const resource = getResource(config, new URL(`https://example.com/.well-known/oauth-protected-resource/mcp`));
    expect(resource).toMatchObject(new URL('https://example.com/mcp'));
  });

  it('should return resource for an http request', async () => {
    const config = TH.config({mountPath: '/mcp'});
    const resource = getResource(config, new URL(`https://example.com/.well-known/oauth-protected-resource/mcp`));
    expect(resource).toMatchObject(new URL('http://example.com/mcp'));
  });

  it('should strip trailing slash from url for an http request', async () => {
    const config = TH.config({mountPath: '/mcp'});
    const resource = getResource(config, new URL(`https://example.com/.well-known/oauth-protected-resource/mcp/`));
    expect(resource).toMatchObject(new URL('http://example.com/mcp'));
  });

  it('should strip query string from url for an http request', async () => {
    const config = TH.config({mountPath: '/mcp'});
    const resource = getResource(config, new URL(`https://example.com/.well-known/oauth-protected-resource/mcp?query=string`));
    expect(resource).toMatchObject(new URL('http://example.com/mcp'));
  });
});