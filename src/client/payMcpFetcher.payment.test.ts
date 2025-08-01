import { SqliteOAuthDb } from '../common/oAuthDb';
import { describe, it, expect, vi } from 'vitest';
import fetchMock from 'fetch-mock';
import { mockResourceServer, mockAuthorizationServer } from './clientTestHelpers.js';
import * as CTH from '../common/commonTestHelpers.js';
import { PayMcpFetcher } from './payMcpFetcher.js';
import { OAuthDb, FetchLike, AuthorizationServerUrl, DEFAULT_AUTHORIZATION_SERVER } from '../common/types.js';
import { PaymentMaker, ProspectivePayment } from './types.js';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import BigNumber from 'bignumber.js';

function mockPaymentMakers(solanaPaymentMaker?: PaymentMaker) {
  solanaPaymentMaker = solanaPaymentMaker ?? {
    makePayment: vi.fn().mockResolvedValue('testPaymentId'),
    generateJWT: vi.fn().mockResolvedValue('testJWT')
  };
  return {'solana': solanaPaymentMaker };
}

function payMcpFetcher(
  fetchFn: FetchLike, 
  paymentMakers?: {[key: string]: PaymentMaker}, 
  db?: OAuthDb, 
  allowedAuthorizationServers?: AuthorizationServerUrl[],
  approvePayment?: (payment: ProspectivePayment) => Promise<boolean>
) {
  return new PayMcpFetcher({
    userId: "bdj",
    db: db ?? new SqliteOAuthDb({db: ':memory:'}),
    paymentMakers: paymentMakers ?? mockPaymentMakers(),
    fetchFn,
    allowedAuthorizationServers,
    approvePayment
  });
}

describe('payMcpClient.fetch payment', () => {
  it('should make a payment if the server response is a paymcp payment request error', async () => {
    const f = fetchMock.createInstance();
    const errTxt = CTH.paymentRequiredMessage(DEFAULT_AUTHORIZATION_SERVER, 'foo');
    const errMsg = CTH.mcpToolErrorResponse({content: [{type: 'text', text: errTxt}]});

    mockResourceServer(f, 'https://example.com', '/mcp', DEFAULT_AUTHORIZATION_SERVER)
      .getOnce('https://example.com/mcp', errMsg)
      .getOnce('https://example.com/mcp', {content: [{type: 'text', text: 'hello world'}]});
    mockAuthorizationServer(f, DEFAULT_AUTHORIZATION_SERVER, {'foo': BigNumber(0.01)});

    const paymentMaker = {
      makePayment: vi.fn().mockResolvedValue('testPaymentId'),
      generateJWT: vi.fn().mockResolvedValue('testJWT')
    };
    const fetcher = payMcpFetcher(f.fetchHandler, {'solana': paymentMaker});
    await fetcher.fetch('https://example.com/mcp');
    // Ensure we make a payment 
    expect(paymentMaker.makePayment).toHaveBeenCalled();
    // Ensure we call the payment request endpoint
    const payCall = f.callHistory.lastCall(`begin:${DEFAULT_AUTHORIZATION_SERVER}/payment-request/foo`);
    expect(payCall).toBeDefined();
    // Ensure there was an auth header with the payment id and signature
    const authHeader = (payCall!.args[1] as any).headers['Authorization'];
    expect(authHeader).toBeDefined();
    expect(authHeader).toContain('Bearer ');
    const jwtToken = authHeader.split(' ')[1];
    expect(jwtToken).toBe('testJWT');
  });

  it('should make a payment if the server response is an elicitation request error', async () => {
    const f = fetchMock.createInstance();
    const errMsg = CTH.mcpElicitationRequiredErrorResponse({url: `${DEFAULT_AUTHORIZATION_SERVER}/payment-request/foo`, elicitationId: 'foo'});

    mockResourceServer(f, 'https://example.com', '/mcp', DEFAULT_AUTHORIZATION_SERVER)
      .getOnce('https://example.com/mcp', errMsg)
      .getOnce('https://example.com/mcp', {content: [{type: 'text', text: 'hello world'}]});
    mockAuthorizationServer(f, DEFAULT_AUTHORIZATION_SERVER, {'foo': BigNumber(0.01)});

    const paymentMaker = {
      makePayment: vi.fn().mockResolvedValue('testPaymentId'),
      generateJWT: vi.fn().mockResolvedValue('testJWT')
    };
    const fetcher = payMcpFetcher(f.fetchHandler, {'solana': paymentMaker});
    await fetcher.fetch('https://example.com/mcp');
    // Ensure we make a payment 
    expect(paymentMaker.makePayment).toHaveBeenCalled();
    // Ensure we call the payment request endpoint
    const payCall = f.callHistory.lastCall(`begin:${DEFAULT_AUTHORIZATION_SERVER}/payment-request/foo`);
    expect(payCall).toBeDefined();
    // Ensure there was an auth header with the payment id and signature
    const authHeader = (payCall!.args[1] as any).headers['Authorization'];
    expect(authHeader).toBeDefined();
    expect(authHeader).toContain('Bearer ');
    const jwtToken = authHeader.split(' ')[1];
    expect(jwtToken).toBe('testJWT');
  });

  it('should pass through an elicitation request error that is not paymcp', async () => {
    const f = fetchMock.createInstance();
    const errMsg = CTH.mcpElicitationRequiredErrorResponse({url: `https://slack.com/give-me-api-key`, elicitationId: 'foo'});

    mockResourceServer(f, 'https://example.com', '/mcp', DEFAULT_AUTHORIZATION_SERVER)
      .getOnce('https://example.com/mcp', errMsg)
      .getOnce('https://example.com/mcp', {content: [{type: 'text', text: 'hello world'}]});
    mockAuthorizationServer(f, DEFAULT_AUTHORIZATION_SERVER, {'foo': BigNumber(0.01)});

    const paymentMaker = {
      makePayment: vi.fn().mockResolvedValue('testPaymentId'),
      generateJWT: vi.fn().mockResolvedValue('testJWT')
    };
    const fetcher = payMcpFetcher(f.fetchHandler, {'solana': paymentMaker});
    const res = await fetcher.fetch('https://example.com/mcp');
    const resJson = await res.json();
    expect(resJson).toMatchObject(errMsg);
  });

  it('should allow consuming the body of the response', async () => {
    const f = fetchMock.createInstance();
    const responseJson = {content: [{type: 'text', text: 'hello world'}]};

    mockResourceServer(f, 'https://example.com', '/mcp', DEFAULT_AUTHORIZATION_SERVER)
      .getOnce('https://example.com/mcp', responseJson);
    mockAuthorizationServer(f, DEFAULT_AUTHORIZATION_SERVER);

    const paymentMaker = {
      makePayment: vi.fn().mockResolvedValue('testPaymentId'),
      generateJWT: vi.fn().mockResolvedValue('testJWT')
    };
    const fetcher = payMcpFetcher(f.fetchHandler, {'solana': paymentMaker});
    const res = await fetcher.fetch('https://example.com/mcp');
    expect(await res.json()).toEqual(responseJson);
  });

  it('should retry the request if a payment was required and made successfully', async () => {
    const f = fetchMock.createInstance();
    const errTxt = CTH.paymentRequiredMessage(DEFAULT_AUTHORIZATION_SERVER, 'foo');
    const errMsg = CTH.mcpToolErrorResponse({content: [{type: 'text', text: errTxt}]});

    mockResourceServer(f, 'https://example.com', '/mcp', DEFAULT_AUTHORIZATION_SERVER)
      .getOnce('https://example.com/mcp', errMsg)
      .getOnce('https://example.com/mcp', {content: [{type: 'text', text: 'hello world'}]});
    mockAuthorizationServer(f, DEFAULT_AUTHORIZATION_SERVER, {'foo': BigNumber(0.01)});

    const paymentMaker = {
      makePayment: vi.fn().mockResolvedValue('testPaymentId'),
      generateJWT: vi.fn().mockResolvedValue('testJWT')
    };
    const fetcher = payMcpFetcher(f.fetchHandler, {'solana': paymentMaker});
    const res = await fetcher.fetch('https://example.com/mcp');
    expect(res.status).toBe(200);
    const resJson = await res.json();
    expect(resJson).toMatchObject({content: [{type: 'text', text: 'hello world'}]});
    const mcpCalls = f.callHistory.callLogs.filter(call => call.url.startsWith('https://example.com/mcp'));
    expect(mcpCalls.length).toBe(2);
    expect(mcpCalls[0].args[0]).toBe('https://example.com/mcp');
    expect(mcpCalls[1].args[0]).toBe('https://example.com/mcp');
  });

  it('should pass through a payment request response if there is no matching payment maker', async () => {
    const f = fetchMock.createInstance();
    const errTxt = CTH.paymentRequiredMessage(DEFAULT_AUTHORIZATION_SERVER, 'foo');
    const errMsg = CTH.mcpToolErrorResponse({content: [{type: 'text', text: errTxt}]});

    mockResourceServer(f, 'https://example.com', '/mcp', DEFAULT_AUTHORIZATION_SERVER)
      .getOnce('https://example.com/mcp', errMsg)
      .getOnce('https://example.com/mcp', {content: [{type: 'text', text: 'hello world'}]});
    mockAuthorizationServer(f, DEFAULT_AUTHORIZATION_SERVER, {'foo': BigNumber(0.01)});

    const fetcher = payMcpFetcher(f.fetchHandler, {});
    const res = await fetcher.fetch('https://example.com/mcp');

    const resJson = await res.json();
    expect(resJson.result.content[0].type).toBe('text');
    expect(resJson.result.content[0].text).to.include('Payment via PayMcp is required');
    expect(resJson.result.content[0].text).to.include(`${DEFAULT_AUTHORIZATION_SERVER}/payment-request/foo`);
  });

  it('should throw an error if the server does not have the payment request', async() => {
    const f = fetchMock.createInstance();
    const errTxt = CTH.paymentRequiredMessage(DEFAULT_AUTHORIZATION_SERVER, 'foo');
    const errMsg = CTH.mcpToolErrorResponse({content: [{type: 'text', text: errTxt}]});

    mockResourceServer(f, 'https://example.com', '/mcp', DEFAULT_AUTHORIZATION_SERVER)
      .getOnce('https://example.com/mcp', errMsg)
      .getOnce('https://example.com/mcp', {content: [{type: 'text', text: 'hello world'}]});
    mockAuthorizationServer(f, DEFAULT_AUTHORIZATION_SERVER, {})
      .getOnce(`${DEFAULT_AUTHORIZATION_SERVER}/payment-request/foo`, 404);
    let threw = false;

    const fetcher = payMcpFetcher(f.fetchHandler, {});
    try {
      await fetcher.fetch('https://example.com/mcp');
    } catch (e: any) {
      threw = true;
      expect(e).not.toBeInstanceOf(McpError);
    }
    expect(threw).toBe(true);
  });

  it('should pass through payment request response if the payment request server is not allowed', async () => {
    const f = fetchMock.createInstance();
    const errTxt = CTH.paymentRequiredMessage(DEFAULT_AUTHORIZATION_SERVER, 'foo');
    const errMsg = CTH.mcpToolErrorResponse({content: [{type: 'text', text: errTxt}]});

    mockResourceServer(f, 'https://example.com', '/mcp', DEFAULT_AUTHORIZATION_SERVER)
      .getOnce('https://example.com/mcp', errMsg)
      .getOnce('https://example.com/mcp', {content: [{type: 'text', text: 'hello world'}]});
    mockAuthorizationServer(f, DEFAULT_AUTHORIZATION_SERVER, {'foo': BigNumber(0.01)});

    const paymentMaker = {
      makePayment: vi.fn().mockResolvedValue('testPaymentId'),
      generateJWT: vi.fn().mockResolvedValue('testJWT')
    };
    const fetcher = payMcpFetcher(f.fetchHandler, {'solana': paymentMaker}, undefined, ['https://not-paymcp.com']);
    const res = await fetcher.fetch('https://example.com/mcp');

    expect(res.status).toBe(200);
    const resJson = await res.json();
    expect(resJson.result.content[0].type).toBe('text');
    expect(resJson.result.content[0].text).to.include('Payment via PayMcp is required');
    expect(resJson.result.content[0].text).to.include(`${DEFAULT_AUTHORIZATION_SERVER}/payment-request/foo`);
  });

  it('should not make a payment if the payment request is denied by the callback function', async () => {
    const f = fetchMock.createInstance();
    const errTxt = CTH.paymentRequiredMessage(DEFAULT_AUTHORIZATION_SERVER, 'foo');
    const errMsg = CTH.mcpToolErrorResponse({content: [{type: 'text', text: errTxt}]});

    mockResourceServer(f, 'https://example.com', '/mcp', DEFAULT_AUTHORIZATION_SERVER)
      .getOnce('https://example.com/mcp', errMsg)
      .getOnce('https://example.com/mcp', {content: [{type: 'text', text: 'hello world'}]});
    mockAuthorizationServer(f, DEFAULT_AUTHORIZATION_SERVER, {'foo': BigNumber(0.01)});

    const paymentMaker = {
      makePayment: vi.fn().mockResolvedValue('testPaymentId'),
      generateJWT: vi.fn().mockResolvedValue('testJWT')
    };
    const fetcher = payMcpFetcher(f.fetchHandler, {'solana': paymentMaker}, undefined, undefined, async () => false);
    const res = await fetcher.fetch('https://example.com/mcp');

    expect(res.status).toBe(200);
    const resJson = await res.json();
    expect(resJson.result.content[0].type).toBe('text');
    expect(resJson.result.content[0].text).to.include('Payment via PayMcp is required');
    expect(resJson.result.content[0].text).to.include(`${DEFAULT_AUTHORIZATION_SERVER}/payment-request/foo`);
  });

  it('should throw an error if amount is negative', async () => {
    const f = fetchMock.createInstance();
    const errTxt = CTH.paymentRequiredMessage(DEFAULT_AUTHORIZATION_SERVER, 'foo');
    const errMsg = CTH.mcpToolErrorResponse({content: [{type: 'text', text: errTxt}]});

    mockResourceServer(f, 'https://example.com', '/mcp', DEFAULT_AUTHORIZATION_SERVER)
      .getOnce('https://example.com/mcp', errMsg)
      .getOnce('https://example.com/mcp', {content: [{type: 'text', text: 'hello world'}]});
    mockAuthorizationServer(f, DEFAULT_AUTHORIZATION_SERVER, {'foo': BigNumber(-0.01)});
    let threw = false;

    const paymentMaker = {
      makePayment: vi.fn().mockResolvedValue('testPaymentId'),
      generateJWT: vi.fn().mockResolvedValue('testJWT')
    };
    const fetcher = payMcpFetcher(f.fetchHandler, {'solana': paymentMaker});
    try {
      await fetcher.fetch('https://example.com/mcp');
    } catch (e: any) {
      threw = true;
      expect(e).not.toBeInstanceOf(McpError);
    }
    expect(threw).toBe(true);
  });

  it('should throw an error if PUTing to the payment-request endpoint fails', async () => {
    const f = fetchMock.createInstance();
    const errTxt = CTH.paymentRequiredMessage(DEFAULT_AUTHORIZATION_SERVER, 'foo');
    const errMsg = CTH.mcpToolErrorResponse({content: [{type: 'text', text: errTxt}]});

    mockResourceServer(f, 'https://example.com', '/mcp', DEFAULT_AUTHORIZATION_SERVER)
      .getOnce('https://example.com/mcp', errMsg)
      .getOnce('https://example.com/mcp', {content: [{type: 'text', text: 'hello world'}]});
    mockAuthorizationServer(f, DEFAULT_AUTHORIZATION_SERVER, {})
      .putOnce(`${DEFAULT_AUTHORIZATION_SERVER}/payment-request/foo`, 500);
    let threw = false;

    const paymentMaker = {
      makePayment: vi.fn().mockResolvedValue('testPaymentId'),
      generateJWT: vi.fn().mockResolvedValue('testJWT')
    };
    const fetcher = payMcpFetcher(f.fetchHandler, {'solana': paymentMaker});
    try {
      await fetcher.fetch('https://example.com/mcp');
    } catch (e: any) {
      threw = true;
      expect(e).not.toBeInstanceOf(McpError);
    }
    expect(threw).toBe(true);
  });
});
