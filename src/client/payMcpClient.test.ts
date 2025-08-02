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
      .postOnce('https://example.com/mcp', CTH.authRequiredResponse())
      .post('https://example.com/mcp', CTH.mcpResponseHandler(CTH.mcpToolResponse(1, 'hello world')));
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
      onAuthorize,
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
    const f = fetchMock.createInstance();
    mockResourceServer(f, 'https://example.com', '/mcp', DEFAULT_AUTHORIZATION_SERVER)
      .postOnce('https://example.com/mcp', CTH.authRequiredResponse())
      .post('https://example.com/mcp', CTH.mcpResponseHandler(CTH.mcpToolResponse(1, 'hello world')));
    mockAuthorizationServer(f, DEFAULT_AUTHORIZATION_SERVER)
      // Respond to /authorize call with an error
      .get(`begin:${DEFAULT_AUTHORIZATION_SERVER}/authorize`, (req) => {
        const state = new URL(req.args[0] as any).searchParams.get('state');
        return {
          status: 301,
          headers: {location: `paymcp://paymcp?state=${state}&error=access_denied&error_description=User+denied+access`}
        };
      });

    const onAuthorizeFailure = vi.fn();
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
      onAuthorizeFailure,
      fetchFn: f.fetchHandler
    });

    // The OAuth library will throw an error when it receives an error response
    await expect(client.callTool({ name: 'authorize', arguments: {} })).rejects.toThrow();
    
    // But the callback should have been called before the error was thrown
    expect(onAuthorizeFailure).toHaveBeenCalledTimes(1);
    expect(onAuthorizeFailure).toHaveBeenCalledWith({
      authorizationServer: DEFAULT_AUTHORIZATION_SERVER,
      userId: account.accountId
    });
  });
  it('should call onPayment when making a payment', async () => {
    const f = fetchMock.createInstance();
    const paymentRequestId = 'test-payment-id';
    const errTxt = CTH.paymentRequiredMessage(DEFAULT_AUTHORIZATION_SERVER, paymentRequestId);
    const errMsg = CTH.mcpToolErrorResponse({content: [{type: 'text', text: errTxt}]});
    mockResourceServer(f, 'https://example.com', '/mcp', DEFAULT_AUTHORIZATION_SERVER)
      .postOnce('https://example.com/mcp', errMsg)
      .post('https://example.com/mcp', CTH.mcpResponseHandler(CTH.mcpToolResponse(1, 'hello world')));
    mockAuthorizationServer(f, DEFAULT_AUTHORIZATION_SERVER, {[paymentRequestId]: new (await import('bignumber.js')).BigNumber(0.01)})
      .putOnce(`${DEFAULT_AUTHORIZATION_SERVER}/payment-request/${paymentRequestId}`, {
        payment_id: 'test-payment-result-id'
      });

    const onPayment = vi.fn();
    const paymentMaker = {
      makePayment: vi.fn().mockResolvedValue('test-payment-result-id'),
      generateJWT: vi.fn().mockResolvedValue('testJWT')
    };
    const account = {
      accountId: 'bdj',
      paymentMakers: {solana: paymentMaker}
    };
    const client = await payMcpClient({
      mcpServer: 'https://example.com/mcp',
      account, 
      onPayment,
      fetchFn: f.fetchHandler
    });

    const res = await client.callTool({ name: 'pay', arguments: {} });
    expect(res).toMatchObject({content: [{type: 'text', text: 'hello world'}]});
    expect(paymentMaker.makePayment).toHaveBeenCalled();
    expect(onPayment).toHaveBeenCalledWith(expect.objectContaining({
      accountId: account.accountId,
      amount: new (await import('bignumber.js')).BigNumber(0.01),
      currency: expect.any(String),
      network: expect.any(String)
    }));
  });
  it('should call onPaymentFailure when making a payment fails', async () => {
    const f = fetchMock.createInstance();
    const paymentRequestId = 'test-payment-id';
    const errTxt = CTH.paymentRequiredMessage(DEFAULT_AUTHORIZATION_SERVER, paymentRequestId);
    const errMsg = CTH.mcpToolErrorResponse({content: [{type: 'text', text: errTxt}]});
    mockResourceServer(f, 'https://example.com', '/mcp', DEFAULT_AUTHORIZATION_SERVER)
      .postOnce('https://example.com/mcp', errMsg)
      .post('https://example.com/mcp', CTH.mcpResponseHandler(CTH.mcpToolResponse(1, 'hello world')));
    mockAuthorizationServer(f, DEFAULT_AUTHORIZATION_SERVER, {[paymentRequestId]: new (await import('bignumber.js')).BigNumber(0.01)});

    const onPaymentFailure = vi.fn();
    const paymentMaker = {
      makePayment: vi.fn().mockRejectedValue(new Error('Payment failed')),
      generateJWT: vi.fn().mockResolvedValue('testJWT')
    };
    const account = {
      accountId: 'bdj',
      paymentMakers: {solana: paymentMaker}
    };
    const client = await payMcpClient({
      mcpServer: 'https://example.com/mcp',
      account, 
      onPaymentFailure,
      fetchFn: f.fetchHandler
    });

    let error: Error | undefined;
    try {
      await client.callTool({ name: 'pay', arguments: {} });
    } catch (e) {
      error = e as Error;
    }
    
    expect(error).toBeDefined();
    expect(error?.message).toContain('Payment failed');
    expect(paymentMaker.makePayment).toHaveBeenCalled();
    // onPaymentFailure should have been called before the error was thrown
    expect(onPaymentFailure).toHaveBeenCalledWith(expect.objectContaining({
      accountId: account.accountId,
      amount: new (await import('bignumber.js')).BigNumber(0.01),
      currency: expect.any(String),
      network: expect.any(String)
    }));
  });
});
