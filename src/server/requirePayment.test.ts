import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { paymcp, requirePayment } from './index.js';
import httpMocks from 'node-mocks-http';
import * as TH from './testHelpers.js';
import { ConsoleLogger, LogLevel } from '../logger.js';
import { BigNumber } from 'bignumber.js';
import { EventEmitter } from 'events';
import { mcpToolRequest } from './testHelpers.js';
import express from 'express';
import type { Request, Response } from 'express';
import { withPayMcpContext } from './payMcpContext.js';
import { PaymentRequestError } from './requirePayment.js';

describe('requirePayment', () => {
  it('should pass if there is money', async () => {
    const paymentServer = TH.paymentServer({charge: vi.fn().mockResolvedValue({success: true, requiredPaymentId: null})});
    const config = TH.config({ paymentServer });
    await withPayMcpContext(config, 'https://example.com', TH.tokenCheck(), async () => {
      await expect(requirePayment({price: BigNumber(0.01)})).resolves.not.toThrow();
    });
  });

  it('should call the paymcp server /charge endpoint', async () => {
    const paymentServer = TH.paymentServer({charge: vi.fn().mockResolvedValue({success: true, requiredPaymentId: null})});
    const config = TH.config({ paymentServer });
    await withPayMcpContext(config, 'https://example.com', TH.tokenCheck(), async () => {
      await expect(requirePayment({price: BigNumber(0.01)})).resolves.not.toThrow();
      expect(paymentServer.charge).toHaveBeenCalledWith({
        amount: BigNumber(0.01),
        currency: config.currency,
        network: config.network,
        destination: config.destination,
        source: 'test-user',
      });
    });
  });

  it('should throw an error if there is no money', async () => {
    const paymentServer = TH.paymentServer({charge: vi.fn().mockResolvedValue({success: false, requiredPaymentId: 'test-payment-request-id'})});
    const config = TH.config({ paymentServer });
    await withPayMcpContext(config, 'https://example.com', TH.tokenCheck(), async () => {
      try {
        await requirePayment({price: BigNumber(0.01)});
      } catch (err: any) {
        expect(err).toBeInstanceOf(PaymentRequestError);
      }
    });
  });

  it('should create a payment request if there is no money', async () => {
    const paymentServer = TH.paymentServer({charge: vi.fn().mockResolvedValue({success: false, requiredPaymentId: 'test-payment-request-id'})});
    const config = TH.config({ paymentServer });
    await withPayMcpContext(config, 'https://example.com', TH.tokenCheck(), async () => {
      try {
        await requirePayment({price: BigNumber(0.01)});
      } catch (err: any) {
        expect(err).toBeInstanceOf(PaymentRequestError);
        expect(paymentServer.createPaymentRequest).toHaveBeenCalledWith({
          amount: BigNumber(0.01),
          currency: config.currency,
          network: config.network,
          destination: config.destination,
          source: 'test-user',
          resource: 'https://example.com',
        });
      }
    });
  });

  it('should throw an error if the user is not set', async () => {
    const paymentServer = TH.paymentServer();
    const config = TH.config({ paymentServer });
    await withPayMcpContext(config, 'https://example.com', null, async () => {
      try {
        await requirePayment({price: BigNumber(0.01)});
      } catch (err: any) {
        expect(err).not.toBeInstanceOf(PaymentRequestError);
        expect(err.message).toContain('No user found');
      }
    });
  });

  it('error should include the elicitation url constructed from paymcp() config', async () => {
    const paymentServer = TH.paymentServer({charge: vi.fn().mockResolvedValue({success: false, requiredPaymentId: 'test-payment-request-id'})});
    const config = TH.config({ paymentServer, server: 'https://example.com' });
    await withPayMcpContext(config, 'https://example.com', TH.tokenCheck(), async () => {
      try {
        await requirePayment({price: BigNumber(0.01)});
      } catch (err: any) {
        expect(err).toBeInstanceOf(PaymentRequestError);
        expect(err.paymentRequestId).toBe('test-payment-request-id');
        expect(err.paymentRequestUrl).toBe('https://example.com/payment-request/test-payment-request-id');
      }
    });
  });

  it('should provide a way for consumer to do an idempotency check', async () => {
    const paymentServer = TH.paymentServer({ charge: vi.fn().mockResolvedValue({success: false, requiredPaymentId: 'test-payment-request-id'}) });
    const config = TH.config({ paymentServer });
    await withPayMcpContext(config, 'https://example.com', TH.tokenCheck(), async () => {
      try {
        await requirePayment({price: BigNumber(0.01), getExistingPaymentId: async () => 'some-other-payment-id'});
      } catch (err: any) {
        expect(err).toBeInstanceOf(PaymentRequestError);
        expect(err.paymentRequestId).toBe('some-other-payment-id');
        expect(err.paymentRequestUrl).toBe('https://auth.paymcp.com/payment-request/some-other-payment-id');
        expect(paymentServer.createPaymentRequest).not.toHaveBeenCalled();
      }
    });
  });

  it('should throw an error if the payment request fails', async () => {
    const paymentServer = TH.paymentServer({
      charge: vi.fn().mockResolvedValue({success: false, requiredPaymentId: 'test-payment-request-id'}),
      createPaymentRequest: vi.fn().mockRejectedValue(new Error('Payment request failed')),
    });
    const config = TH.config({ paymentServer });
    await withPayMcpContext(config, 'https://example.com', TH.tokenCheck(), async () => {
      try {
        await requirePayment({price: BigNumber(0.01)});
      } catch (err: any) {
        expect(err).not.toBeInstanceOf(PaymentRequestError);
        expect(err.message).toContain('Payment request failed');
      }
    });
  });

});