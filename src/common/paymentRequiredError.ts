import { McpError } from "@modelcontextprotocol/sdk/types.js";
import { AuthorizationServerUrl } from "./types.js";

export const PAYMENT_REQUIRED_ERROR_CODE = -30402; // Payment required
// Do NOT modify this message. It is used by clients to identify a payMcp payment required error
// in an MCP response. Changing it will break back-compatability.
export const PAYMENT_REQUIRED_PREAMBLE = 'Payment via PayMcp is required. ';

export function paymentRequiredError(server: AuthorizationServerUrl, paymentRequestId: string): McpError {
  const serverUrl = new URL(server);
  server = serverUrl.origin as AuthorizationServerUrl;

  const paymentRequestUrl = `${server}/payment-request/${paymentRequestId}`;
  const data = { paymentRequestId, paymentRequestUrl };
  return new McpError(PAYMENT_REQUIRED_ERROR_CODE, `${PAYMENT_REQUIRED_PREAMBLE} Please pay at: ${paymentRequestUrl}`, data);
}