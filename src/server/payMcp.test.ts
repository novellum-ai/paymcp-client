import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { paymcp } from './index.js';
import httpMocks from 'node-mocks-http';
import * as TH from './testHelpers.js';
import { ConsoleLogger, LogLevel } from '../logger.js';
import { BigNumber } from 'bignumber.js';
import { EventEmitter } from 'events';
import { mcpToolRequest } from './testHelpers.js';
import express from 'express';
import type { Request, Response } from 'express';

describe('paymcp', () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should run code at request start and finish', async () => {
    const { req, res } = httpMocks.createMocks(
      {
        method: 'POST',
        url: 'https://example.com/mcp/message',
        body: TH.mcpToolRequest(),
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer test-access-token'
        }
      },
      { eventEmitter: EventEmitter }
    );
    const next = vi.fn();

    const middleware = paymcp({
      destination: 'test-destination',
      oAuthClient: TH.oAuthClient(),
      logger: new ConsoleLogger({level: LogLevel.DEBUG})
    });

    await middleware(req as any, res, next);

    expect(consoleSpy.debug).toHaveBeenCalledWith('[paymcp] Request started - POST /mcp/message');
    expect(next).toHaveBeenCalled();

    // Simulate the response finishing by calling end() which triggers the 'finish' event
    res.end();

    // Wait for the async finish event handler to complete
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(consoleSpy.debug).toHaveBeenCalledWith('[paymcp] Request finished for user test-user - POST /mcp/message');
  });

  it('should run code at start and finish if sending an OAuth challenge', async () => {
    const { req, res } = httpMocks.createMocks(
      {
        method: 'POST',
        url: 'https://example.com/mcp/message',
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
    const middleware = paymcp({
      destination: 'test-destination',
      oAuthClient: TH.oAuthClient({introspectResult: badToken}),
      logger: new ConsoleLogger({level: LogLevel.DEBUG})
    });

    await middleware(req as any, res, next);

    expect(consoleSpy.debug).toHaveBeenCalledWith('[paymcp] Request started - POST /mcp/message');
    expect(next).not.toHaveBeenCalled();

    // Simulate the response finishing by calling end() which triggers the 'finish' event
    res.end();

    // Wait for the async finish event handler to complete
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(consoleSpy.debug).toHaveBeenCalledWith('[paymcp] Request finished - POST /mcp/message');
  });
  

  it('should run successfully charge a tool that requires it', async () => {
    const { req, res } = httpMocks.createMocks(
      {
        method: 'POST',
        url: 'https://example.com/mcp/message',
        body: TH.mcpToolRequest(),
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer test-access-token'
        }
      },
      { eventEmitter: EventEmitter }
    );
    const next = vi.fn();

    const oauthClient = TH.oAuthClient();
    const middleware = paymcp({
      destination: 'test-destination',
      oAuthClient: oauthClient,
      logger: new ConsoleLogger({level: LogLevel.DEBUG})
    });

    await middleware(req as any, res, next);

    expect(next).toHaveBeenCalled();

    // Simulate the response finishing by calling end() which triggers the 'finish' event
    res.end();

    // Wait for the async finish event handler to complete
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(res.statusCode).toEqual(200);
    expect(oauthClient.introspectToken).toHaveBeenCalledWith('https://auth.paymcp.com', 'test-access-token', {charge: '0.01'});
  });

  it('should return an OAuth challenge if payment required', async () => {
    const { req, res } = httpMocks.createMocks(
      {
        method: 'POST',
        url: 'https://example.com/mcp/message',
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
    const middleware = paymcp({
      destination: 'test-destination',
      oAuthClient: TH.oAuthClient({introspectResult: badToken}),
      logger: new ConsoleLogger({level: LogLevel.DEBUG})
    });

    await middleware(req as any, res, next);

    // Simulate the response finishing by calling end() which triggers the 'finish' event
    res.end();

    // Wait for the async finish event handler to complete
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(res.statusCode).toEqual(401);
    expect(res.getHeader('www-authenticate')).toEqual('Bearer resource_metadata="https://example.com/.well-known/oauth-protected-resource/mcp/message"');
  });

  it('should not intercept non-MCP requests', async () => {
    const { req, res } = httpMocks.createMocks({ url: 'https://example.com/non-mcp' });
    const next = vi.fn();

    const middleware = paymcp({
      destination: 'test-destination',
    });

    await middleware(req as any, res, next);

    // The middleware should call next() for non-MCP routes, allowing other handlers to process
    expect(next).toHaveBeenCalled();
    
    // Simulate the response finishing by calling end() which triggers the 'finish' event
    res.end();
    // Wait for the async finish event handler to complete
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(res.statusCode).toEqual(200);
  });

  it('serves PRM endpoint', async () => {
    const { req, res } = httpMocks.createMocks({ url: 'https://example.com/.well-known/oauth-protected-resource' });
    const next = vi.fn();

    const middleware = paymcp({
      destination: 'test-destination',
    });

    await middleware(req as any, res, next);
    // Simulate the response finishing by calling end() which triggers the 'finish' event
    res.end();
    // Wait for the async finish event handler to complete
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(res.statusCode).toEqual(200);
    // Check the response data that was written
    const responseData = res._getJSONData();
    expect(responseData).toMatchObject({
      resource: 'https://example.com',
      resource_name: 'A PayMcp Server',
      authorization_servers: ['https://auth.paymcp.com'],
      bearer_methods_supported: ['header'],
      scopes_supported: ['read', 'write'],
    });
  });
});