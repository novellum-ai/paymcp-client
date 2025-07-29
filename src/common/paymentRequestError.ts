import { AuthorizationServerUrl } from "./types.js";

export class PaymentRequestError extends Error { 
  paymentRequestId: string;
  paymentRequestUrl: string;
  constructor(server: AuthorizationServerUrl, paymentRequestId: string) {
    const url = `${server}/payment-request/${paymentRequestId}`;
    super(`Payment request failed. Please pay at: ${url}`);
    this.paymentRequestId = paymentRequestId;
    this.paymentRequestUrl = url;
  }
}