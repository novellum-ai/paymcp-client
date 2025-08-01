import { SqliteOAuthDb } from '../common/oAuthDb';
import { OAuthAuthenticationRequiredError } from './oAuth.js';
import { describe, it, expect, vi } from 'vitest';
import fetchMock from 'fetch-mock';
import { mockResourceServer, mockAuthorizationServer } from './clientTestHelpers.js';
import { PayMcpFetcher } from './payMcpFetcher.js';
import { OAuthDb, FetchLike, DEFAULT_AUTHORIZATION_SERVER } from '../common/types.js';
import { PaymentMaker } from './types.js';
import { payMcpClient } from './payMcpClient.js';
import * as CTH from '../common/commonTestHelpers.js';

describe('payMcpClient', () => {
  it('should call onAuthorize when authorizing', async () => {
    const f = fetchMock.createInstance();
    mockResourceServer(f, 'https://example.com', '/mcp', DEFAULT_AUTHORIZATION_SERVER)
      .postOnce('https://example.com/mcp', {
        status: 401, 
        headers: {
          'www-authenticate': 'Bearer resource_metadata="https://example.com/.well-known/oauth-protected-resource/mcp"'
        }
      })
      .postOnce('https://example.com/mcp', CTH.mcpResponse());
    mockAuthorizationServer(f, DEFAULT_AUTHORIZATION_SERVER)
      // Respond to /authorize call 
      .get(`begin:${DEFAULT_AUTHORIZATION_SERVER}/authorize`, (req) => {
        const state = new URL(req.args[0] as any).searchParams.get('state');
        return {
          status: 301,
          headers: {location: `paymcp://paymcp?state=${state}&code=testCode`}
        };
      });

    const onAuthorize = vi.fn();
    const paymentMaker = {
      makePayment: vi.fn(),
      generateJWT: vi.fn().mockResolvedValue('testJWT')
    };
    const account = {
      accountId: 'bdj',
      paymentMakers: {solana: paymentMaker}
    };
    const client = await payMcpClient({
      mcpServer: 'https://example.com/mcp',
      account, 
      //onAuthorize,
      fetchFn: f.fetchHandler
    });

    const res = await client.callTool({ name: 'authorize', arguments: {} });
    expect(res).toMatchObject({content: [{type: 'text', text: 'hello world'}]});
    expect(onAuthorize).toHaveBeenCalledWith({
      authorizationServer: DEFAULT_AUTHORIZATION_SERVER,
      userId: account.accountId
    });
  });

  it('should call onAuthorizeFailure when authorizing fails', async () => {
    expect.fail('not implemented');
  });
  it('should call onPayment when making a payment', async () => {
    expect.fail('not implemented');
  });
  it('should call onPaymentFailure when making a payment fails', async () => {
    expect.fail('not implemented');
  });
});
