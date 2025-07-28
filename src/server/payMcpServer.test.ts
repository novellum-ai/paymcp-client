import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { payMcpServer } from './payMcpServer.js';
import httpMocks from 'node-mocks-http';
import * as TH from './testHelpers.js';
import { EventEmitter } from 'events';

describe('paymcp', () => {
  it('should run code at request start and finish', async () => {
    const { req, res } = httpMocks.createMocks(
      {
        method: 'POST',
        url: 'https://example.com/',
        body: TH.mcpToolRequest(),
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer test-access-token'
        }
      },
      { eventEmitter: EventEmitter }
    );
    const next = vi.fn();

    const logger = TH.logger();
    const middleware = payMcpServer(TH.config({
      logger, 
      oAuthClient: TH.oAuthClient({introspectResult: TH.tokenData({active: true})})
    }));

    await middleware(req as any, res, next);

    expect(logger.debug).toHaveBeenCalledWith('Request started - POST /');
    expect(next).toHaveBeenCalled();

    // Simulate the response finishing by calling end() which triggers the 'finish' event
    res.end();

    expect(logger.debug).toHaveBeenCalledWith('Request finished for user test-user - POST /');
  });

  it('should run code at start and finish if sending an OAuth challenge', async () => {
    const { req, res } = httpMocks.createMocks(
      {
        method: 'POST',
        url: 'https://example.com/',
        body: TH.mcpToolRequest(),
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer test-access-token'
        }
      },
      { eventEmitter: EventEmitter }
    );
    const next = vi.fn();

    const badToken = TH.tokenData({active: false});
    const logger = TH.logger();
    const middleware = payMcpServer(TH.config({
      logger, 
      oAuthClient: TH.oAuthClient({introspectResult: badToken})
    }));

    await middleware(req as any, res, next);

    expect(logger.debug).toHaveBeenCalledWith('Request started - POST /');
    expect(next).not.toHaveBeenCalled();

    expect(logger.debug).toHaveBeenCalledWith('Request finished - POST /');
  });
  
  it('should return an OAuth challenge if token not active', async () => {
    const { req, res } = httpMocks.createMocks(
      {
        method: 'POST',
        url: 'https://example.com/',
        body: TH.mcpToolRequest(),
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer test-access-token'
        }
      },
      { eventEmitter: EventEmitter }
    );
    const next = vi.fn();

    const badToken = TH.tokenData({active: false});
    const middleware = payMcpServer(TH.config({
      oAuthClient: TH.oAuthClient({introspectResult: badToken})
    }));

    await middleware(req as any, res, next);

    expect(res.statusCode).toEqual(401);
    expect(res.getHeader('www-authenticate')).toEqual('Bearer resource_metadata="https://example.com/.well-known/oauth-protected-resource/"');
  });

  it('should not intercept non-MCP requests', async () => {
    const { req, res } = httpMocks.createMocks({ url: 'https://example.com/non-mcp' });
    const next = vi.fn();

    const middleware = payMcpServer({
      destination: 'test-destination',
    });

    await middleware(req as any, res, next);

    // The middleware should call next() for non-MCP routes, allowing other handlers to process
    expect(next).toHaveBeenCalled();
    
    expect(res.statusCode).toEqual(200);
  });

  it('serves PRM endpoint', async () => {
    const { req, res } = httpMocks.createMocks({ url: 'https://example.com/.well-known/oauth-protected-resource' });
    const next = vi.fn();

    const middleware = payMcpServer({
      destination: 'test-destination',
    });

    await middleware(req as any, res, next);

    expect(res.statusCode).toEqual(200);
    // Check the response data that was written - parse the raw data
    const responseData = JSON.parse(res._getData());
    expect(responseData).toMatchObject({
      resource: 'https://example.com/',
      resource_name: 'A PayMcp Server',
      authorization_servers: ['https://auth.paymcp.com'],
      bearer_methods_supported: ['header'],
      scopes_supported: ['read', 'write'],
    });
  });
});