import { describe, it, expect } from 'vitest';
import { requireOAuthUser } from './auth.js';
import httpMocks from 'node-mocks-http';
import { SqliteOAuthDb } from './oAuthDb.js';
import { OAuthClient } from './oAuth.js';
import { mockAuthorizationServer, mockResourceServer } from './testHelpers';
import fetchMock from 'fetch-mock';

describe('requireOAuthAuthUser', () => {
  it('should return undefined when no authorization header is present', async () => {
    const { req, res } = httpMocks.createMocks();
    const f = fetchMock.createInstance();
    mockAuthorizationServer(f, 'https://paymcp.com');
    const db = new SqliteOAuthDb({db: ':memory:'});
    const client = new OAuthClient({userId: "bdj", db, callbackUrl: 'https://paymcp.com/callback', fetchFn: f.fetchHandler, isPublic: false});

    const fn = requireOAuthUser('https://paymcp.com', client);
    const user = await fn(req, res);
    expect(user).toBeUndefined();
    expect(res.statusCode).toEqual(401);
    expect(res._getData().toString()).toContain("No token provided");
  });

  it('should return a Protected Resource Metadata URL in the WWW-Authenticate header', async () => {
    const req = httpMocks.createRequest({
      host: 'example.com',
      protocol: 'https'
    });
    const res = httpMocks.createResponse();
    const f = fetchMock.createInstance();
    mockAuthorizationServer(f, 'https://paymcp.com');
    const db = new SqliteOAuthDb({db: ':memory:'});
    const client = new OAuthClient({userId: "bdj", db, callbackUrl: 'https://paymcp.com/callback', fetchFn: f.fetchHandler, isPublic: false});

    const fn = requireOAuthUser('https://paymcp.com', client);
    const user = await fn(req, res);
    expect(user).toBeUndefined();
    expect(res.statusCode).toEqual(401);
    expect(res._getData().toString()).toContain("No token provided");
    expect(res._getHeaders()['www-authenticate']).toEqual('Bearer resource_metadata="https://example.com/.well-known/oauth-protected-resource"');
  });

  it('should use the same protocol as the request for the Protected Resource Metadata URL', async () => {
    const req = httpMocks.createRequest({
      host: 'example.com',
      protocol: 'http'
    });
    const res = httpMocks.createResponse();
    const f = fetchMock.createInstance();
    mockAuthorizationServer(f, 'https://paymcp.com');
    const db = new SqliteOAuthDb({db: ':memory:'});
    const client = new OAuthClient({userId: "bdj", db, callbackUrl: 'https://paymcp.com/callback', fetchFn: f.fetchHandler, isPublic: false});

    const fn = requireOAuthUser('https://paymcp.com', client);
    const user = await fn(req, res);
    expect(user).toBeUndefined();
    expect(res.statusCode).toEqual(401);
    expect(res._getData().toString()).toContain("No token provided");
    // Intended to be http just like the req
    expect(res._getHeaders()['www-authenticate']).toEqual('Bearer resource_metadata="http://example.com/.well-known/oauth-protected-resource"');
  });

  it('should set Protected Resource Metadata URL to path matching the request path', async () => {
    const req = httpMocks.createRequest({ 
      path: '/mypath',
      host: 'example.com',
      protocol: 'https'
    });
    const res = httpMocks.createResponse();
    const f = fetchMock.createInstance();
    mockAuthorizationServer(f, 'https://paymcp.com');
    const db = new SqliteOAuthDb({db: ':memory:'});
    const client = new OAuthClient({userId: "bdj", db, callbackUrl: 'https://paymcp.com/callback', fetchFn: f.fetchHandler, isPublic: false});

    const fn = requireOAuthUser('https://paymcp.com', client);
    const user = await fn(req, res);
    expect(user).toBeUndefined();
    expect(res.statusCode).toEqual(401);
    expect(res._getData().toString()).toContain("No token provided");
    expect(res._getHeaders()['www-authenticate']).toEqual('Bearer resource_metadata="https://example.com/.well-known/oauth-protected-resource/mypath"');
  });

  it('should support query params in the authorization server url', async () => {
    const req = httpMocks.createRequest({ headers: { authorization: `Bearer test-access-token` } });
    const res = httpMocks.createResponse();
    const f = fetchMock.createInstance();
    mockAuthorizationServer(f, 'https://paymcp.com', 'payMcp=1');
    const db = new SqliteOAuthDb({db: ':memory:'});
    const client = new OAuthClient({userId: "bdj", db, callbackUrl: 'https://paymcp.com/callback', fetchFn: f.fetchHandler, isPublic: false});

    const fn = requireOAuthUser('https://paymcp.com?payMcp=1', client);
    const user = await fn(req, res);
    expect(user).toBeUndefined();
    const bareMetadataCall = f.callHistory.lastCall('https://paymcp.com/.well-known/oauth-authorization-server');
    expect(bareMetadataCall).not.toBeDefined();
    const metadataCall = f.callHistory.lastCall('https://paymcp.com/.well-known/oauth-authorization-server?payMcp=1');
    expect(metadataCall).toBeDefined();
  });

  it('should return undefined when authorization header does not start with Bearer', async () => {
    const req = httpMocks.createRequest({ headers: { authorization: 'Basic token123' } });
    const res = httpMocks.createResponse();
    const f = fetchMock.createInstance();
    mockAuthorizationServer(f, 'https://paymcp.com');
    const db = new SqliteOAuthDb({db: ':memory:'});
    const client = new OAuthClient({userId: "bdj", db, callbackUrl: 'https://paymcp.com/callback', fetchFn: f.fetchHandler, isPublic: false});

    const fn = requireOAuthUser('https://paymcp.com', client);
    const user = await fn(req, res);
    expect(user).toBeUndefined();
    expect(res.statusCode).toEqual(401);
    expect(res._getData().toString()).toContain("No token provided");
  });

  it('should return undefined when token is invalid', async () => {
    const req = httpMocks.createRequest({ headers: { authorization: 'Bearer invalid-token' } });
    const res = httpMocks.createResponse();
    const f = fetchMock.createInstance();
    mockResourceServer(f, 'https://example.com', '/mcp');
    mockAuthorizationServer(f, 'https://paymcp.com')
      .modifyRoute('https://paymcp.com/introspect', {method: 'post', response: {body: {active: false}}});
    const db = new SqliteOAuthDb({db: ':memory:'});
    const client = new OAuthClient({userId: "bdj", db, callbackUrl: 'https://paymcp.com/callback', fetchFn: f.fetchHandler, isPublic: false});

    const fn = requireOAuthUser('https://paymcp.com', client);
    const user = await fn(req, res);
    expect(user).toBeUndefined();
    expect(res.statusCode).toEqual(401);
  });

  it('should return user ID when token is valid', async () => {
    const req = httpMocks.createRequest({ headers: { authorization: `Bearer test-access-token` } });
    const res = httpMocks.createResponse();
    const f = fetchMock.createInstance();
    mockResourceServer(f, 'https://example.com', '/mcp');
    mockAuthorizationServer(f, 'https://paymcp.com')
      .modifyRoute('https://paymcp.com/introspect', {method: 'post', response: {body: {active: true, sub: 'test-user'}}});
    const db = new SqliteOAuthDb({db: ':memory:'});
    const client = new OAuthClient({userId: "bdj", db, callbackUrl: 'https://paymcp.com/callback', fetchFn: f.fetchHandler, isPublic: false});

    const fn = requireOAuthUser('https://paymcp.com', client);
    const user = await fn(req, res);
    expect(user).toBe('test-user');
    expect(res.statusCode).toEqual(200);
  });

  it('should use stored credentials to call token endpoint on authorization server', async () => {
    const req = httpMocks.createRequest({ headers: { authorization: `Bearer test-access-token` } });
    const res = httpMocks.createResponse();
    const f = fetchMock.createInstance();
    mockResourceServer(f, 'https://example.com', '/mcp');
    mockAuthorizationServer(f, 'https://paymcp.com');
    const db = new SqliteOAuthDb({db: ':memory:'});
    const creds = {
      clientId: 'testClientId',
      clientSecret: 'testClientSecret',
      redirectUri: 'https://paymcp.com/callback'
    };
    db.saveClientCredentials('https://paymcp.com', creds);
    const client = new OAuthClient({userId: "bdj", db, callbackUrl: 'https://paymcp.com/callback', fetchFn: f.fetchHandler, isPublic: false});

    const encodedCreds = Buffer.from(`${encodeURIComponent(creds.clientId)}:${encodeURIComponent(creds.clientSecret)}`).toString('base64');
    const fn = requireOAuthUser('https://paymcp.com', client);
    const user = await fn(req, res);
    expect(res.statusCode).toEqual(200);
    expect(user).toBe('testUser');
    const introspectCall = f.callHistory.lastCall('https://paymcp.com/introspect');
    expect(introspectCall).toBeDefined();
    expect((introspectCall?.args[1] as any).headers['authorization']).toEqual(`Basic ${encodedCreds}`);
  });

  it('should register client on authorization server if no credentials are stored', async () => {
    const req = httpMocks.createRequest({ headers: { authorization: `Bearer test-access-token` } });
    const res = httpMocks.createResponse();
    const f = fetchMock.createInstance();
    mockResourceServer(f, 'https://example.com', '/mcp');
    mockAuthorizationServer(f, 'https://paymcp.com');
    const db = new SqliteOAuthDb({db: ':memory:'});
    const client = new OAuthClient({userId: "bdj", db, callbackUrl: 'https://paymcp.com/callback', fetchFn: f.fetchHandler, isPublic: false});

    const fn = requireOAuthUser('https://paymcp.com', client);
    const user = await fn(req, res);
    expect(res.statusCode).toEqual(200);
    expect(user).toBe('testUser');
    const registerCall = f.callHistory.lastCall('https://paymcp.com/register');
    expect(registerCall).toBeDefined();
  });

  it('should re-register client on authorization server if token call responds with 401', async () => {
    const req = httpMocks.createRequest({ headers: { authorization: `Bearer test-access-token` } });
    const res = httpMocks.createResponse();
    const f = fetchMock.createInstance();
    mockResourceServer(f, 'https://example.com', '/mcp');
    mockAuthorizationServer(f, 'https://paymcp.com')
      .modifyRoute('https://paymcp.com/introspect', {method: 'post', response: {status: 401, body: {}}})
      .postOnce('https://paymcp.com/introspect', { 
        active: true,
        sub: 'testUser'
      });
    const db = new SqliteOAuthDb({db: ':memory:'});
    const creds = {
      clientId: 'oldClientId',
      clientSecret: 'oldClientSecret',
      redirectUri: 'https://paymcp.com/mcp/callback'
    };
    db.saveClientCredentials('https://paymcp.com', creds);
    const client = new OAuthClient({userId: "bdj", db, callbackUrl: 'https://paymcp.com/callback', fetchFn: f.fetchHandler, isPublic: false});

    const fn = requireOAuthUser('https://paymcp.com', client);
    const user = await fn(req, res);
    expect(res.statusCode).toEqual(200);
    expect(user).toBe('testUser');

    // The first introspect call should have failed
    const introspectCalls = f.callHistory.calls('https://paymcp.com/introspect');
    expect(introspectCalls[0]).toBeDefined();
    const firstIntrospectHeader = (introspectCalls[0].args[1] as any).headers['authorization'];
    const decodedCreds = Buffer.from(firstIntrospectHeader.split(' ')[1], 'base64').toString('utf-8').split(':');
    expect(decodedCreds[0]).toEqual(creds.clientId);
    expect(decodedCreds[1]).toEqual(creds.clientSecret);

    // Then we should have registered a new client
    const registerCall = f.callHistory.lastCall('https://paymcp.com/register');
    expect(registerCall).toBeDefined();

    // And we should have updated the saved credentials
    const savedCreds = await db.getClientCredentials('https://paymcp.com');
    expect(savedCreds).toBeDefined();
    expect(savedCreds?.clientId).not.toEqual(creds.clientId);
    expect(savedCreds?.clientSecret).not.toEqual(creds.clientSecret);
    const encodedNewCreds = Buffer.from(`${encodeURIComponent(savedCreds!.clientId)}:${encodeURIComponent(savedCreds!.clientSecret)}`).toString('base64');

    // And the second introspect call should have happened with the new credentials
    expect(introspectCalls[1]).toBeDefined();
    expect((introspectCalls[1].args[1] as any).headers['authorization']).toEqual(`Basic ${encodedNewCreds}`);
  });

  it('should pass charge parameter in introspection call when opPrices is provided', async () => {
    const req = httpMocks.createRequest({ 
      method: 'POST',
      headers: { authorization: `Bearer test-access-token` },
      path: '/mcp/message',
      body: {
        method: 'tools/call',
        params: {
          name: 'my_tool'
        }
      }
    });
    const res = httpMocks.createResponse();
    const f = fetchMock.createInstance();
    mockResourceServer(f, 'https://example.com', '/mcp');
    mockAuthorizationServer(f, 'https://paymcp.com')
      .modifyRoute('https://paymcp.com/introspect', {method: 'post', response: {body: {active: true, sub: 'test-user'}}});
    const db = new SqliteOAuthDb({db: ':memory:'});
    const client = new OAuthClient({userId: "bdj", db, callbackUrl: 'https://paymcp.com/callback', fetchFn: f.fetchHandler, isPublic: false});

    const opPrices = { 'tools/call': 0.01 };
    const fn = requireOAuthUser('https://paymcp.com', client, opPrices);
    const user = await fn(req, res);
    
    expect(user).toBe('test-user');
    expect(res.statusCode).toEqual(200);
    
    const introspectCall = f.callHistory.lastCall('https://paymcp.com/introspect');
    expect(introspectCall).toBeDefined();
    
    // Check that the charge parameter was included in the request body
    const requestBody = (introspectCall?.args[1] as any).body;
    const params = new URLSearchParams(requestBody);
    expect(params.get('charge')).toBe('0.01');
  });

  it('should only match tools/call prefix as special case', async () => {
    const req = httpMocks.createRequest({ 
      method: 'POST',
      headers: { authorization: `Bearer test-access-token` },
      path: '/mcp/message',
      body: {
        method: 'tools/call',
        params: {
          name: 'my_tool'
        }
      }
    });
    const res = httpMocks.createResponse();
    const f = fetchMock.createInstance();
    mockResourceServer(f, 'https://example.com', '/mcp');
    mockAuthorizationServer(f, 'https://paymcp.com')
      .modifyRoute('https://paymcp.com/introspect', {method: 'post', response: {body: {active: true, sub: 'test-user'}}});
    const db = new SqliteOAuthDb({db: ':memory:'});
    const client = new OAuthClient({userId: "bdj", db, callbackUrl: 'https://paymcp.com/callback', fetchFn: f.fetchHandler, isPublic: false});

    // 'tools/call:my' should not match 'tools/call:my_tool', only 'tools/call' should
    const opPrices = { 
      'tools/call': 0.01,
      'tools/call:my': 0.02 
    };
    const fn = requireOAuthUser('https://paymcp.com', client, opPrices);
    
    // Should use 'tools/call' price, ignoring 'tools/call:my'
    const user = await fn(req, res);
    expect(user).toBe('test-user');
    expect(res.statusCode).toEqual(200);
    
    const introspectCall = f.callHistory.lastCall('https://paymcp.com/introspect');
    expect(introspectCall).toBeDefined();
    
    const requestBody = (introspectCall?.args[1] as any).body;
    const params = new URLSearchParams(requestBody);
    expect(params.get('charge')).toBe('0.01');
  });

  it('should use exact match when multiple price keys match', async () => {
    const req = httpMocks.createRequest({ 
      method: 'POST',
      headers: { authorization: `Bearer test-access-token` },
      path: '/mcp/message',
      body: {
        method: 'tools/call',
        params: {
          name: 'my_tool'
        }
      }
    });
    const res = httpMocks.createResponse();
    const f = fetchMock.createInstance();
    mockResourceServer(f, 'https://example.com', '/mcp');
    mockAuthorizationServer(f, 'https://paymcp.com')
      .modifyRoute('https://paymcp.com/introspect', {method: 'post', response: {body: {active: true, sub: 'test-user'}}});
    const db = new SqliteOAuthDb({db: ':memory:'});
    const client = new OAuthClient({userId: "bdj", db, callbackUrl: 'https://paymcp.com/callback', fetchFn: f.fetchHandler, isPublic: false});

    // Multiple keys, but one is exact
    const opPrices = { 
      'tools/call': 0.01,
      'tools/call:my': 0.02,
      'tools/call:my_tool': 0.03  // exact match
    };
    const fn = requireOAuthUser('https://paymcp.com', client, opPrices);
    const user = await fn(req, res);
    
    expect(user).toBe('test-user');
    expect(res.statusCode).toEqual(200);
    
    const introspectCall = f.callHistory.lastCall('https://paymcp.com/introspect');
    expect(introspectCall).toBeDefined();
    
    // Should use the exact match price
    const requestBody = (introspectCall?.args[1] as any).body;
    const params = new URLSearchParams(requestBody);
    expect(params.get('charge')).toBe('0.03');
  });

  it('should not match arbitrary substrings for non-tools/call operations', async () => {
    const req = httpMocks.createRequest({ 
      method: 'POST',
      headers: { authorization: `Bearer test-access-token` },
      path: '/mcp/message',
      body: {
        method: 'resources/read',
        params: {
          name: 'my_resource'
        }
      }
    });
    const res = httpMocks.createResponse();
    const f = fetchMock.createInstance();
    mockResourceServer(f, 'https://example.com', '/mcp');
    mockAuthorizationServer(f, 'https://paymcp.com')
      .modifyRoute('https://paymcp.com/introspect', {method: 'post', response: {body: {active: true, sub: 'test-user'}}});
    const db = new SqliteOAuthDb({db: ':memory:'});
    const client = new OAuthClient({userId: "bdj", db, callbackUrl: 'https://paymcp.com/callback', fetchFn: f.fetchHandler, isPublic: false});

    // 'resources/read' should NOT match 'resources/read:my_resource' 
    // (only 'tools/call' gets special prefix matching)
    const opPrices = { 
      'resources/read': 0.05
    };
    const fn = requireOAuthUser('https://paymcp.com', client, opPrices);
    const user = await fn(req, res);
    
    expect(user).toBe('test-user');
    expect(res.statusCode).toEqual(200);
    
    const introspectCall = f.callHistory.lastCall('https://paymcp.com/introspect');
    expect(introspectCall).toBeDefined();
    
    // Should charge 0 because no match (not a tools/call operation)
    const requestBody = (introspectCall?.args[1] as any).body;
    const params = new URLSearchParams(requestBody);
    expect(params.get('charge')).toBe('0');
  });

  it('should apply pricing for tools/call when using HTTP endpoint rather than SSE one (/mcp ,not /mcp/message)', async () => {
    const req = httpMocks.createRequest({ 
      method: 'POST',
      headers: { authorization: `Bearer test-access-token` },
      path: '/mcp',  // Not /mcp/message
      body: {
        method: 'tools/call',
        params: {
          name: 'my_tool'
        }
      }
    });
    const res = httpMocks.createResponse();
    const f = fetchMock.createInstance();
    mockResourceServer(f, 'https://example.com', '/mcp');
    mockAuthorizationServer(f, 'https://paymcp.com')
      .modifyRoute('https://paymcp.com/introspect', {method: 'post', response: {body: {active: true, sub: 'test-user'}}});
    const db = new SqliteOAuthDb({db: ':memory:'});
    const client = new OAuthClient({userId: "bdj", db, callbackUrl: 'https://paymcp.com/callback', fetchFn: f.fetchHandler, isPublic: false});

    const opPrices = { 'tools/call': 0.01 };
    const fn = requireOAuthUser('https://paymcp.com', client, opPrices);
    const user = await fn(req, res);
    
    expect(user).toBe('test-user');
    expect(res.statusCode).toEqual(200);
    
    const introspectCall = f.callHistory.lastCall('https://paymcp.com/introspect');
    expect(introspectCall).toBeDefined();
    
    // Should still charge for tools/call even on /mcp path
    const requestBody = (introspectCall?.args[1] as any).body;
    const params = new URLSearchParams(requestBody);
    expect(params.get('charge')).toBe('0.01');
  });
});
 