import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { paymcp } from './index.js';
import httpMocks from 'node-mocks-http';
import { mockAuthorizationServer, mockResourceServer } from '../testHelpers.js';
import fetchMock from 'fetch-mock';
import { ConsoleLogger, LogLevel } from '../logger.js';
import { OAuthResourceClient } from '../oAuthResource.js';
import { BigNumber } from 'bignumber.js';
import { EventEmitter } from 'events';

describe('checkToken', () => {
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

  it.skip('should call token introspection when MCP tool call request comes in with Authorization header', async () => {
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
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call:testTool',
          params: { name: 'test' }
        }
      }
    );

    const middleware = paymcp({
      toolPrice: new BigNumber(0.01),
      destination: 'test-destination',
      oAuthResourceClient: mockOAuthClient
    });
    const next = vi.fn();
    middleware(req as any, res as any, next);

    expect(mockOAuthClient.introspectToken).toHaveBeenCalledWith(
      'https://auth.paymcp.com',
      'test-access-token',
      undefined
    );
    expect(mockOAuthClient.introspectToken).toHaveBeenCalledTimes(1);
  });


});