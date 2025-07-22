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

    const logger = TH.logger();
    const middleware = paymcp(TH.config({
      logger, 
      oAuthClient: TH.oAuthClient({introspectResult: TH.tokenData({active: true})})
    }));

    await middleware(req as any, res, next);

    expect(logger.debug).toHaveBeenCalledWith('Request started - POST /mcp/message');
    expect(next).toHaveBeenCalled();

    // Simulate the response finishing by calling end() which triggers the 'finish' event
    res.end();

    // Wait for the async finish event handler to complete
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(logger.debug).toHaveBeenCalledWith('Request finished for user test-user - POST /mcp/message');
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
    const logger = TH.logger();
    const middleware = paymcp(TH.config({
      logger, 
      oAuthClient: TH.oAuthClient({introspectResult: badToken})
    }));

    await middleware(req as any, res, next);

    expect(logger.debug).toHaveBeenCalledWith('Request started - POST /mcp/message');
    expect(next).not.toHaveBeenCalled();

    // Simulate the response finishing by calling end() which triggers the 'finish' event
    res.end();

    // Wait for the async finish event handler to complete
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(logger.debug).toHaveBeenCalledWith('Request finished - POST /mcp/message');
  });
  
  it('should return an OAuth challenge if token not active', async () => {
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
    const middleware = paymcp(TH.config({
      oAuthClient: TH.oAuthClient({introspectResult: badToken})
    }));

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