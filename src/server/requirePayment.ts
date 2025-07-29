import { RequirePaymentConfig } from "../common/types.js";
import { getPayMcpConfig, getPayMcpResource, payMcpUser } from "./payMcpContext.js";
import { PaymentRequestError } from "../common/paymentRequestError.js";

export async function requirePayment(paymentConfig: RequirePaymentConfig): Promise<void> {
  const config = getPayMcpConfig();
  if (!config) {
    throw new Error('No config found');
  }
  const user = payMcpUser();
  if (!user) {
    config.logger.error('No user found');
    throw new Error('No user found');
  }

  const charge = {
    amount: paymentConfig.price, 
    currency: config.currency, 
    network: config.network, 
    destination: config.destination, 
    source: user
  };

  config.logger.debug(`Charging amount ${charge.amount}, destination ${charge.destination}, source ${charge.source}`);
  const chargeResponse = await config.paymentServer.charge(charge);
  if (chargeResponse.success) {
    config.logger.info(`Charged ${charge.amount} for source ${charge.source}`);
    return;
  }

  const existingPaymentId = await paymentConfig.getExistingPaymentId?.();
  if (existingPaymentId) {
    config.logger.info(`Found existing payment ID ${existingPaymentId}`);
    throw new PaymentRequestError(config.server, existingPaymentId)
  }

  const paymentId = await config.paymentServer.createPaymentRequest(charge);
  config.logger.info(`Created payment request ${paymentId}`);
  throw new PaymentRequestError(config.server, paymentId);
}
