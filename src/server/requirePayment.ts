import { RequirePaymentConfig, PayMcpConfig } from "./types.js";
import { getPayMcpConfig, getPayMcpResource, payMcpUser } from "./payMcpContext.js";

export class PaymentRequestError extends Error { 
  paymentRequestId: string;
  paymentRequestUrl: string;
  constructor(config: PayMcpConfig, paymentRequestId: string) {
    const url = `${config.server}/payment-request/${paymentRequestId}`;
    super(`Payment request failed. Please pay at: ${url}`);
    this.paymentRequestId = paymentRequestId;
    this.paymentRequestUrl = url;
  }
}

export async function requirePayment({price, getExistingPaymentId}: RequirePaymentConfig): Promise<void> {
  const config = getPayMcpConfig();
  const resource = getPayMcpResource();
  if (!config) {
    throw new Error('No config found');
  }
  if (!resource) {
    throw new Error('No resource found');
  }
  const user = payMcpUser();
  if (!user) {
    config.logger.error('No user found');
    throw new Error('No user found');
  }

  const charge = {
    amount: price, 
    currency: config.currency, 
    network: config.network, 
    destination: config.destination, 
    source: user
  };

  config.logger.debug(`Charging ${charge.amount} for source ${charge.source}`);
  const chargeResponse = await config.paymentServer.charge(charge);
  if (chargeResponse.success) {
    config.logger.info(`Charged ${charge.amount} for source ${charge.source}`);
    return;
  }

  const existingPaymentId = await getExistingPaymentId?.();
  if (existingPaymentId) {
    config.logger.info(`Found existing payment ID ${existingPaymentId}`);
    throw new PaymentRequestError(config, existingPaymentId)
  }

  const paymentId = await config.paymentServer.createPaymentRequest({...charge, resource});
  config.logger.info(`Created payment request ${paymentId}`);
  throw new PaymentRequestError(config, paymentId);
}
