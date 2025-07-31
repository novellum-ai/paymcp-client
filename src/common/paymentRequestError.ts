import { AuthorizationServerUrl } from "./types.js";

export class PaymentRequestError extends Error { 
  static readonly code = -32604;
  // Do NOT modify this message. It is used by clients to identify a payMcp payment request error
  // in an MCP response. Changing it will break back-compatability.
  static readonly MESSAGE_PREAMBLE = 'Payment via PayMcp is required. ';

  paymentRequestId: string;
  paymentRequestUrl: string;
  constructor(server: AuthorizationServerUrl, paymentRequestId: string) {
    // Trim the server url to the origin only (ie. https://paymcp.com/payment-request/foo -> https://paymcp.com)
    const serverUrl = new URL(server);
    server = serverUrl.origin as AuthorizationServerUrl;

    const url = `${server}/payment-request/${paymentRequestId}`;
    super(`${PaymentRequestError.MESSAGE_PREAMBLE} Please pay at: ${url}`);
    this.paymentRequestId = paymentRequestId;
    this.paymentRequestUrl = url;
  }
}