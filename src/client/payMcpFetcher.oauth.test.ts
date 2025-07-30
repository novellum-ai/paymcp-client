import { SqliteOAuthDb } from '../common/oAuthDb';
import { OAuthAuthenticationRequiredError } from './oAuth.js';
import { describe, it, expect, vi } from 'vitest';
import fetchMock from 'fetch-mock';
import { mockResourceServer, mockAuthorizationServer } from './clientTestHelpers.js';
import { PayMcpFetcher } from './payMcpFetcher.js';
import { OAuthDb, FetchLike } from '../common/types.js';
import { PaymentMaker } from './types.js';

function mockPaymentMakers(solanaPaymentMaker?: PaymentMaker) {
  solanaPaymentMaker = solanaPaymentMaker ?? {
    makePayment: vi.fn().mockResolvedValue('testPaymentId'),
    generateJWT: vi.fn().mockResolvedValue('testJWT')
  };
  return {'solana': solanaPaymentMaker };
}

function payMcpFetcher(fetchFn: FetchLike, paymentMakers?: {[key: string]: PaymentMaker}, db?: OAuthDb) {
  return new PayMcpFetcher({
    userId: "bdj",
    db: db ?? new SqliteOAuthDb({db: ':memory:'}),
    paymentMakers: paymentMakers ?? mockPaymentMakers(),
    fetchFn
  });
}
describe('payMcpClient.fetch oauth', () => {
  it('should bubble up OAuthAuthenticationRequiredError on OAuth challenge with no paymentMakers or local token', async () => {
    const f = fetchMock.createInstance().getOnce('https://example.com/mcp', 401);
    mockResourceServer(f, 'https://example.com', '/mcp', 'https://paymcp.com');
    mockAuthorizationServer(f, 'https://paymcp.com');

    const client = payMcpFetcher(f.fetchHandler, {});
    await expect(client.fetch('https://example.com/mcp')).rejects.toThrow(OAuthAuthenticationRequiredError);
  });

  it('should throw if authorization server response is not successful', async () => {
    const f = fetchMock.createInstance()
      // 401, then succeed
      .getOnce('https://example.com/mcp', 401)
      .getOnce('https://example.com/mcp', {data: 'data'});
    mockResourceServer(f, 'https://example.com', '/mcp', 'https://paymcp.com');
    mockAuthorizationServer(f, 'https://paymcp.com')
      // Respond to /authorize call 
      .get('begin:https://paymcp.com/authorize', 401, {});
    const client = payMcpFetcher(f.fetchHandler);

    await expect(client.fetch('https://example.com/mcp')).rejects.toThrow('Expected redirect response from authorization URL, got 401');
  });

  it('should throw if authorization server authorization endpoint returns an error', async () => {
    // We can't save this - the authorization URL was constructed using the client_id, so 
    // if the client registration is no longer valid, there's nothing we can do.
    const f = fetchMock.createInstance().getOnce('https://example.com/mcp', 401);
    mockResourceServer(f, 'https://example.com', '/mcp', 'https://paymcp.com');
    mockAuthorizationServer(f, 'https://paymcp.com')
      /// Respond to /authorize call 
      .get('begin:https://paymcp.com/authorize', (req) => {
        const state = new URL(req.args[0] as any).searchParams.get('state');
        return {
          status: 301,
          // This is how the AS responds to a bad request, as per RFC 6749
          // It just redirects back to the client without a code and with an error
          headers: {location: `paymcp://paymcp?state=${state}&error=invalid_request`}
        };
      });

    const client = payMcpFetcher(f.fetchHandler);
    await expect(client.fetch('https://example.com/mcp')).rejects.toThrow('authorization response from the server is an error');
  });
});
