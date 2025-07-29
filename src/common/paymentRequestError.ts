import { AuthorizationServerUrl } from "./types.js";

export class PaymentRequestError extends Error { 
  paymentRequestId: string;
  paymentRequestUrl: string;
  constructor(server: AuthorizationServerUrl, paymentRequestId: string) {
    const url = `${server}/payment-request/${paymentRequestId}`;
    super(`Payment is required. Please pay at: ${url}`);
    this.paymentRequestId = paymentRequestId;
    this.paymentRequestUrl = url;
  }
}