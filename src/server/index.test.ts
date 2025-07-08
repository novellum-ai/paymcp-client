import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { paymcp } from './index.js';
import httpMocks from 'node-mocks-http';
import { mockAuthorizationServer, mockResourceServer } from '../testHelpers.js';
import fetchMock from 'fetch-mock';
import { ConsoleLogger, LogLevel } from '../logger.js';
import { OAuthResourceClient } from '../oAuthResource.js';
import { BigNumber } from 'bignumber.js';
import { EventEmitter } from 'events';

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
        path: '/mcp/message',
        body: {
          method: 'tools/call:testTool',
          params: { name: 'test' }
        }
      },
      { eventEmitter: EventEmitter }
    );

    const middleware = paymcp({
      price: new BigNumber(0.01),
      destination: 'test-destination',
      logger: new ConsoleLogger({level: LogLevel.DEBUG})
    });

    // Create a mock next function that we can track
    const next = vi.fn();

    // Call the middleware
    middleware(req, res, next);

    // 1. Assert we logged the start line immediately
    expect(consoleSpy.debug).toHaveBeenCalledWith('[paymcp] Request started - POST /mcp/message');
    expect(next).toHaveBeenCalled();

    // 2. Assert the finish line has NOT been called yet (response hasn't finished)
    expect(consoleSpy.debug).toHaveBeenCalledTimes(1);

    // 3. Simulate the response finishing by calling end() which triggers the 'finish' event
    res.end();

    // 4. Now assert we logged the finish line when the response was finished
    expect(consoleSpy.debug).toHaveBeenCalledWith('[paymcp] Request finished - POST /mcp/message');

    // Verify the order and count of calls
    expect(consoleSpy.debug).toHaveBeenCalledTimes(2);
    const calls = consoleSpy.debug.mock.calls;
    expect(calls[0][0]).toBe('[paymcp] Request started - POST /mcp/message');
    expect(calls[1][0]).toBe('[paymcp] Request finished - POST /mcp/message');
  });

  it('should call token introspection when MCP tool call request comes in with Authorization header', async () => {
    // Create a mock OAuthResourceClient
    const mockOAuthClient = {
      introspectToken: vi.fn().mockResolvedValue({
        active: true,
        sub: 'test-user',
        scope: 'tools:read',
        aud: 'https://example.com'
      })
    } as unknown as OAuthResourceClient;

    const { req, res } = httpMocks.createMocks(
      {
        method: 'POST',
        path: '/mcp/message',
        headers: {
          authorization: 'Bearer test-access-token'
        },
        body: {
          method: 'tools/call:testTool',
          params: { name: 'test' }
        }
      }
    );

    const middleware = paymcp({
      price: new BigNumber(0.01),
      destination: 'test-destination',
      oAuthResourceClient: mockOAuthClient
    });
    const next = vi.fn();
    middleware(req, res, next);

    expect(mockOAuthClient.introspectToken).toHaveBeenCalledWith(
      'https://auth.paymcp.com',
      'test-access-token',
      undefined
    );
    expect(mockOAuthClient.introspectToken).toHaveBeenCalledTimes(1);
  });

});