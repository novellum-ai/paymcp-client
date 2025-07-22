import { describe, it, expect } from 'vitest';
import { getProtectedResourceMetadata } from './protectedResourceMetadata.js';
import * as TH from './testHelpers.js';
import { PayMcpPaymentServer } from './paymentServer.js';

describe('PayMcpPaymentServer', () => {
  it('should call the charge endpoint', async () => {
    const server = new PayMcpPaymentServer(TH.config());
    const result = await server.charge({
      source: 'source',
      destination: 'destination',
      network: 'solana',
      currency: 'USDC',
      amount: new BigNumber(100),
    });
    expect(result).toBe(true);
    expect.fail('Not implemented');
  });

  it('should use the client credentials when calling the charge endpoint', async () => {
    const server = new PayMcpPaymentServer(TH.config());
    const result = await server.charge({
      source: 'source',
      destination: 'destination',
      network: 'solana',
      currency: 'USDC',
      amount: new BigNumber(100),
    });
    expect(result).toBe(true);
    expect.fail('Not implemented');
  });

  it('should throw an error if there are no client credentials in the db', async () => {
    const server = new PayMcpPaymentServer(TH.config());
    await expect(server.charge({
      source: 'source',
      destination: 'destination',
    })).rejects.toThrow('No client credentials found');
  }); 

  it('should call the create payment request endpoint', async () => {
    const server = new PayMcpPaymentServer(TH.config());
    const result = await server.createPaymentRequest({
      source: 'source',
      destination: 'destination',
    });
    expect.fail('Not implemented');
  }); 

  it('should use the client credentials when calling the create payment request endpoint', async () => {
    expect.fail('Not implemented');
  });

  it('should throw an error if there are no client credentials in the db', async () => {
    expect.fail('Not implemented');
  });
});