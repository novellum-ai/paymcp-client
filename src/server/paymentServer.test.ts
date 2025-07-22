import { describe, it, expect } from 'vitest';
import * as TH from './testHelpers.js';
import { PayMcpPaymentServer } from './paymentServer.js';

describe('PayMcpPaymentServer', () => {
  it('should call the charge endpoint', async () => {
    const config = TH.config();
    const server = new PayMcpPaymentServer(config.server, config.oAuthDb);
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
    const config = TH.config();
    const server = new PayMcpPaymentServer(config.server, config.oAuthDb);
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
    const config = TH.config();
    const server = new PayMcpPaymentServer(config.server, config.oAuthDb);
    await expect(server.charge({
      source: 'source',
      destination: 'destination',
      network: 'solana',
      currency: 'USDC',
      amount: new BigNumber(100),
    })).rejects.toThrow('No client credentials found');
  }); 

  it('should call the create payment request endpoint', async () => {
    const config = TH.config();
    const server = new PayMcpPaymentServer(config.server, config.oAuthDb);
    const result = await server.createPaymentRequest({
      source: 'source',
      destination: 'destination',
      network: 'solana',
      currency: 'USDC',
      amount: new BigNumber(100),
      resource: 'resource',
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