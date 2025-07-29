import { SqliteOAuthDb } from '../common/oAuthDb';
import { OAuthAuthenticationRequiredError } from './oAuth.js';
import { describe, it, expect, vi } from 'vitest';
import fetchMock from 'fetch-mock';
import { mockResourceServer, mockAuthorizationServer } from './clientTestHelpers.js';
import { PayMcpFetcher } from './payMcpFetcher.js';
import { OAuthDb, FetchLike } from '../common/types.js';
import { PaymentMaker } from './types.js';

function payMcpFetcher(fetchFn: FetchLike, solanaPaymentMaker?: PaymentMaker, db?: OAuthDb, isPublic: boolean = false, strict: boolean = true) {
  solanaPaymentMaker = solanaPaymentMaker ?? {
    makePayment: vi.fn().mockResolvedValue('testPaymentId'),
    generateJWT: vi.fn().mockResolvedValue('testJWT')
  };
  return new PayMcpFetcher({
    userId: "bdj",
    db: db ?? new SqliteOAuthDb({db: ':memory:'}),
    paymentMakers: {'solana': solanaPaymentMaker},
    fetchFn,
    strict,
  });
}
describe('payMcpClient.fetch payment', () => {
  it.skip('should throw an error if amount isnt specified', async () => {
    const f = fetchMock.createInstance().getOnce('https://example.com/mcp', 401);
    mockResourceServer(f, 'https://example.com', '/mcp', 'https://paymcp.com?payMcp=1&network=solana&destination=testDestination&currency=USDC');
    mockAuthorizationServer(f, 'https://paymcp.com')
    const paymentMaker = {
      makePayment: vi.fn().mockResolvedValue('testPaymentId'),
      generateJWT: vi.fn().mockResolvedValue('testJWT')
    };
    const client = payMcpFetcher(f.fetchHandler, paymentMaker);

    await expect(client.fetch('https://example.com/mcp')).rejects.toThrow(/amount not provided/);
  });

  it.skip('should make a payment and post it to the authorization server for PayMcp challenge', async () => {
    const f = fetchMock.createInstance()
      // 401, then succeed
      .getOnce('https://example.com/mcp', 401)
      .getOnce('https://example.com/mcp', {data: 'data'});
    mockResourceServer(f, 'https://example.com', '/mcp', 'https://paymcp.com?payMcp=1&network=solana&destination=testDestination&currency=USDC&amount=0.01');
    mockAuthorizationServer(f, 'https://paymcp.com')
      // Respond to /authorize call 
      .get('begin:https://paymcp.com/authorize', (req) => {
        return {
          status: 301,
          headers: {location: `paymcp://paymcp?code=testCode&state=${new URL(req.args[0] as any).searchParams.get('state')}`}
        };
      });
    const paymentMaker = {
      makePayment: vi.fn().mockResolvedValue('testPaymentId'),
      generateJWT: vi.fn().mockResolvedValue('testJWT')
    };
    const client = payMcpFetcher(f.fetchHandler, paymentMaker);

    await client.fetch('https://example.com/mcp');
    // Ensure we make a payment and sign it
    expect(paymentMaker.makePayment).toHaveBeenCalled();

    // Ensure we call the authorization endpoint
    const authCall = f.callHistory.lastCall('begin:https://paymcp.com/authorize');
    expect(authCall).toBeDefined();

    // Ensure there was an auth header with the payment id and signature
    const authHeader = (authCall!.args[1] as any).headers['Authorization'];
    expect(authHeader).toBeDefined();
    expect(authHeader).toContain('Bearer ');
    const jwtToken = authHeader.split(' ')[1];
    // const decodedPayment = Buffer.from(encodedPayment, 'base64').toString('utf-8');
    expect(jwtToken).toBe('testJWT');
  });

  it.skip('should throw if PayMcp payment-request endpoint response is not successful', async () => {
    const f = fetchMock.createInstance()
      // 401, then succeed
      .getOnce('https://example.com/mcp', 401)
      .getOnce('https://example.com/mcp', {data: 'data'});
    mockResourceServer(f, 'https://example.com', '/mcp', 'https://paymcp.com?payMcp=1&network=solana&destination=testDestination&currency=USDC&amount=0.01');
    mockAuthorizationServer(f, 'https://paymcp.com')
      // Respond to /authorize call 
      .get('begin:https://paymcp.com/authorize', 401, {});
    const client = payMcpFetcher(f.fetchHandler);

    await expect(client.fetch('https://example.com/mcp')).rejects.toThrow('Expected redirect response from authorization URL, got 401');
  });
});
