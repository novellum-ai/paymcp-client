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
          jsonrpc: '2.0',
          id: '1',
          method: 'tools/call:testTool',
          params: { name: 'test' }
        }
      },
      { eventEmitter: EventEmitter }
    );
    const next = vi.fn();

    const middleware = paymcp({
      toolPrice: new BigNumber(0.01),
      destination: 'test-destination',
      logger: new ConsoleLogger({level: LogLevel.DEBUG})
    });

    await middleware(req as any, res, next);

    expect(consoleSpy.debug).toHaveBeenCalledWith('[paymcp] Request started - POST /mcp/message');
    expect(next).toHaveBeenCalled();
    expect(consoleSpy.debug).toHaveBeenCalledTimes(1);

    // Simulate the response finishing by calling end() which triggers the 'finish' event
    res.end();

    // Wait for the async finish event handler to complete
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(consoleSpy.debug).toHaveBeenCalledWith('[paymcp] Request finished - POST /mcp/message');
    expect(consoleSpy.debug).toHaveBeenCalledTimes(2);
    const calls = consoleSpy.debug.mock.calls;
    expect(calls[0][0]).toBe('[paymcp] Request started - POST /mcp/message');
    expect(calls[1][0]).toBe('[paymcp] Request finished - POST /mcp/message');
  });

  it.skip('should run successfully charge a tool that requires it', async () => {
    const { req, res } = httpMocks.createMocks(
      {
        method: 'POST',
        path: '/mcp/message',
        body: {
          jsonrpc: '2.0',
          id: '1',
          method: 'tools/call:testTool',
          params: { name: 'test' }
        }
      },
      { eventEmitter: EventEmitter }
    );
    const next = vi.fn();

    const middleware = paymcp({
      toolPrice: new BigNumber(0.01),
      destination: 'test-destination',
      logger: new ConsoleLogger({level: LogLevel.DEBUG})
    });
    
    await middleware(req as any, res, next);
    
    expect(next).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      some: 'success'
    });
  });

  it.skip('should return an OAuth challenge if payment required', async () => {
    const { req, res } = httpMocks.createMocks(
      {
        method: 'POST',
        path: '/mcp/message',
        body: {
          jsonrpc: '2.0',
          id: '1',
          method: 'tools/call:testTool',
          params: { name: 'test' }
        }
      },
      { eventEmitter: EventEmitter }
    );
    const next = vi.fn();

    const middleware = paymcp({
      toolPrice: new BigNumber(0.01),
      destination: 'test-destination',
      logger: new ConsoleLogger({level: LogLevel.DEBUG})
    });

    await middleware(req as any, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      some: 'failure'
    });
  });

  it.skip('serves PRM endpoint', async () => {
    expect.fail('Not implemented');
  });

  it.skip('throws an error if not mounted at root', async () => {
    expect.fail('Not implemented');
  });
});