import { SqliteOAuthDb } from '../common/oAuthDb';
import { OAuthAuthenticationRequiredError } from './oAuth.js';
import { describe, it, expect, vi } from 'vitest';
import fetchMock from 'fetch-mock';
import { mockResourceServer, mockAuthorizationServer } from './clientTestHelpers.js';
import { PayMcpFetcher } from './payMcpFetcher.js';
import { OAuthDb, FetchLike, DEFAULT_AUTHORIZATION_SERVER } from '../common/types.js';
import { PaymentMaker } from './types.js';
import { buildClientConfig, payMcpClient } from './payMcpClient.js';

describe('buildConfig', () => {
  it('should use fetchFn for oAuthChannelFetch if the former is provided and not the latter', () => {
    const fetchFn = vi.fn();
    const config = buildClientConfig({
      fetchFn,
      mcpServer: 'https://example.com/mcp',
      account: {
        accountId: 'bdj',
        paymentMakers: {}
      }
    });
    expect(config.oAuthChannelFetch).toBe(fetchFn);
  });
});