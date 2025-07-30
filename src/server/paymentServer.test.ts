import { describe, it, expect, vi } from 'vitest';
import * as TH from './serverTestHelpers.js';
import { PayMcpPaymentServer } from './paymentServer.js';
import { BigNumber } from 'bignumber.js';
import fetchMock from 'fetch-mock';
import { SqliteOAuthDb } from '../common/oAuthDb.js';

describe('PayMcpPaymentServer', () => {
  it('should call the charge endpoint', async () => {
    const oAuthDb = new SqliteOAuthDb({ db: ':memory:' });
    
    // Setup database with credentials
    await oAuthDb.saveClientCredentials('https://auth.paymcp.com', {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'https://example.com/callback'
    });
    
    const mock = fetchMock.createInstance();
    mock.post('https://auth.paymcp.com/charge', {
      status: 200,
      body: { success: true }
    });

    // Create server instance with real database
    const server = new PayMcpPaymentServer('https://auth.paymcp.com', oAuthDb, TH.logger(), mock.fetchHandler);
    
    const chargeParams = TH.charge({
      source: 'test-source',
      destination: 'test-destination'
    });

    const result = await server.charge(chargeParams);

    // Verify the result
    expect(result).toEqual({ success: true, requiredPayment: null });

    // Verify fetch was called with correct parameters
    const call = mock.callHistory.lastCall('https://auth.paymcp.com/charge');
    expect(call).toBeDefined();
    expect(call?.options.method).toBe('post');
    expect(call?.options.headers).toEqual({
      'authorization': 'Basic dGVzdC1jbGllbnQtaWQ6dGVzdC1jbGllbnQtc2VjcmV0',
      'content-type': 'application/json'
    });
    const parsedBody = JSON.parse(call?.options.body as string);
    expect(parsedBody).toEqual({
      ...chargeParams,
      amount: chargeParams.amount.toString()
    });

    // Credentials were fetched from the real database
  });

  it('should use the client credentials when calling the charge endpoint', async () => {
    const oAuthDb = new SqliteOAuthDb({ db: ':memory:' });
    
    // Setup database with specific credentials
    await oAuthDb.saveClientCredentials('https://auth.paymcp.com', {
      clientId: 'specific-client-id',
      clientSecret: 'specific-client-secret',
      redirectUri: 'https://example.com/callback'
    });
    
    const mock = fetchMock.createInstance();
    mock.post('https://auth.paymcp.com/charge', {
      status: 200,
      body: { success: true }
    });

    const server = new PayMcpPaymentServer('https://auth.paymcp.com', oAuthDb, TH.logger(), mock.fetchHandler);
    
    await server.charge(TH.charge({
      source: 'test-source',
      destination: 'test-destination'
    }));

    // Verify the specific credentials were used
    const call = mock.callHistory.lastCall('https://auth.paymcp.com/charge');
    expect((call?.options?.headers as any)?.['authorization']).toBe('Basic c3BlY2lmaWMtY2xpZW50LWlkOnNwZWNpZmljLWNsaWVudC1zZWNyZXQ=');
  });

  it('should throw an error if there are no client credentials in the db', async () => {
    const oAuthDb = new SqliteOAuthDb({ db: ':memory:' });
    // No credentials saved to database (empty database)

    const mock = fetchMock.createInstance();
    const server = new PayMcpPaymentServer('https://auth.paymcp.com', oAuthDb, TH.logger(), mock.fetchHandler);
    
    await expect(server.charge(TH.charge({
      source: 'test-source',
      destination: 'test-destination'
    }))).rejects.toThrow('No client credentials found');

    // Verify fetch was never called
    const call = mock.callHistory.lastCall('https://auth.paymcp.com/charge');
    expect(call).toBeUndefined();
  });

  it('should call the create payment request endpoint', async () => {
    const oAuthDb = new SqliteOAuthDb({ db: ':memory:' });
    
    // Setup database with credentials
    await oAuthDb.saveClientCredentials('https://auth.paymcp.com', {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'https://example.com/callback'
    });
    
    const mock = fetchMock.createInstance();
    mock.post('https://auth.paymcp.com/payment-request', {
      status: 200,
      body: { id: 'test-payment-request-id' }
    });

    const server = new PayMcpPaymentServer('https://auth.paymcp.com', oAuthDb, TH.logger(), mock.fetchHandler);
    
    const paymentRequestParams = {
      ...TH.charge({
        source: 'test-source',
        destination: 'test-destination'
      })
    };

    const result = await server.createPaymentRequest(paymentRequestParams);

    // Verify the result
    expect(result).toBe('test-payment-request-id');

    // Verify fetch was called with correct parameters
    const call = mock.callHistory.lastCall('https://auth.paymcp.com/payment-request');
    expect(call).toBeDefined();
    expect(call?.options.method).toBe('post');
    expect(call?.options.headers).toEqual({
      'authorization': 'Basic dGVzdC1jbGllbnQtaWQ6dGVzdC1jbGllbnQtc2VjcmV0',
      'content-type': 'application/json'
    });
    const parsedBody = JSON.parse(call?.options.body as string);
    expect(parsedBody).toMatchObject({
      ...paymentRequestParams,
      amount: paymentRequestParams.amount.toString()
    });
  });

  it('should use the client credentials when calling the create payment request endpoint', async () => {
    const oAuthDb = new SqliteOAuthDb({ db: ':memory:' });
    
    // Setup database with specific credentials
    await oAuthDb.saveClientCredentials('https://auth.paymcp.com', {
      clientId: 'payment-client-id',
      clientSecret: 'payment-client-secret',
      redirectUri: 'https://example.com/callback'
    });
    
    const mock = fetchMock.createInstance();
    mock.post('https://auth.paymcp.com/payment-request', {
      status: 200,
      body: { id: 'test-payment-request-id' }
    });

    const server = new PayMcpPaymentServer('https://auth.paymcp.com', oAuthDb, TH.logger(), mock.fetchHandler);
    
    await server.createPaymentRequest({
      ...TH.charge({
        source: 'test-source',
        destination: 'test-destination'
      })
    });

    // Verify the specific credentials were used
    const call = mock.callHistory.lastCall('https://auth.paymcp.com/payment-request');
    expect((call?.options?.headers as any)?.['authorization']).toBe('Basic cGF5bWVudC1jbGllbnQtaWQ6cGF5bWVudC1jbGllbnQtc2VjcmV0');
  });

  it('should throw an error if there are no client credentials in the db for payment request', async () => {
    const oAuthDb = new SqliteOAuthDb({ db: ':memory:' });
    // No credentials saved to database (empty database)

    const mock = fetchMock.createInstance();
    const server = new PayMcpPaymentServer('https://auth.paymcp.com', oAuthDb, TH.logger(), mock.fetchHandler);
    
    await expect(server.createPaymentRequest({
      ...TH.charge({
        source: 'test-source',
        destination: 'test-destination'
      })
    })).rejects.toThrow('No client credentials found');

    // Verify fetch was never called
    const call = mock.callHistory.lastCall('https://auth.paymcp.com/payment-request');
    expect(call).toBeUndefined();
  });

  it('should handle charge endpoint returning 402 status (payment required)', async () => {
    const oAuthDb = new SqliteOAuthDb({ db: ':memory:' });
    
    // Setup database with credentials
    await oAuthDb.saveClientCredentials('https://auth.paymcp.com', {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'https://example.com/callback'
    });
    
    const mock = fetchMock.createInstance();
    mock.post('https://auth.paymcp.com/charge', {
      status: 402,
      body: { 
        id: 'payment-request-id',
        url: 'https://auth.paymcp.com/payment/payment-request-id'
      }
    });

    const server = new PayMcpPaymentServer('https://auth.paymcp.com', oAuthDb, TH.logger(), mock.fetchHandler);
    
    const result = await server.charge(TH.charge({
      source: 'test-source',
      destination: 'test-destination'
    }));

    // Verify the result indicates payment required
    expect(result).toEqual({ 
      success: false, 
      requiredPayment: { 
        id: 'payment-request-id',
        url: 'https://auth.paymcp.com/payment/payment-request-id'
      }
    });
  });

  it('should throw error for unexpected status codes from charge endpoint', async () => {
    const oAuthDb = new SqliteOAuthDb({ db: ':memory:' });
    
    // Setup database with credentials
    await oAuthDb.saveClientCredentials('https://auth.paymcp.com', {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'https://example.com/callback'
    });
    
    const mock = fetchMock.createInstance();
    mock.post('https://auth.paymcp.com/charge', {
      status: 500,
      body: { error: 'server error' }
    });

    const server = new PayMcpPaymentServer('https://auth.paymcp.com', oAuthDb, TH.logger(), mock.fetchHandler);
    
    await expect(server.charge(TH.charge({
      source: 'test-source',
      destination: 'test-destination'
    }))).rejects.toThrow('Unexpected status code 500 from payment server POST /charge endpoint');
  });

  it('should throw error for non-200 status from payment request endpoint', async () => {
    const oAuthDb = new SqliteOAuthDb({ db: ':memory:' });
    
    // Setup database with credentials
    await oAuthDb.saveClientCredentials('https://auth.paymcp.com', {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'https://example.com/callback'
    });
    
    const mock = fetchMock.createInstance();
    mock.post('https://auth.paymcp.com/payment-request', {
      status: 400,
      body: { error: 'bad request' }
    });

    const server = new PayMcpPaymentServer('https://auth.paymcp.com', oAuthDb, TH.logger(), mock.fetchHandler);
    
    await expect(server.createPaymentRequest({
      ...TH.charge({
        source: 'test-source',
        destination: 'test-destination'
      })
    })).rejects.toThrow('POST /payment-request responded with unexpected HTTP status 400');
  });

  it('should throw error if payment request response lacks id field', async () => {
    const oAuthDb = new SqliteOAuthDb({ db: ':memory:' });
    
    // Setup database with credentials
    await oAuthDb.saveClientCredentials('https://auth.paymcp.com', {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'https://example.com/callback'
    });
    
    const mock = fetchMock.createInstance();
    mock.post('https://auth.paymcp.com/payment-request', {
      status: 200,
      body: { success: true } // Missing 'id' field
    });

    const server = new PayMcpPaymentServer('https://auth.paymcp.com', oAuthDb, TH.logger(), mock.fetchHandler);
    
    await expect(server.createPaymentRequest({
      ...TH.charge({
        source: 'test-source',
        destination: 'test-destination'
      })
    })).rejects.toThrow('POST /payment-request response did not contain an id');
  });
});