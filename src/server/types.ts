import { BigNumber } from "bignumber.js";
import { Logger } from "../logger.js";
import { OAuthDb, TokenData } from "../types.js";
import { OAuthResourceClient } from "../oAuthResource.js";

// https://github.com/modelcontextprotocol/typescript-sdk/blob/c6ac083b1b37b222b5bfba5563822daa5d03372e/src/types.ts
// ctrl+f "method: z.literal(""
export type McpMethod = 'notifications/cancelled' | 'initialize' | 'ping' | 'notifications/progress' | 
  'resources/list' | 'resources/templates/list' | 'resources/read' | 'notifications/resources/list_changed' | 
  'resources/subscribe' | 'resources/unsubscribe' | 'notifications/resources/updated' | 
  'prompts/list' | 'prompts/get' | 'notifications/prompts/list_changed' | 'tools/list' | 
  'tools/call' | 'notifications/tools/list_changed' | 'logging/setLevel' | 'notifications/message' |
  'sampling/createMessage' | 'elicitation/create' | 'completion/complete' | 'roots/list' | 
  'notifications/roots/list_changed';

export type McpName = string;
export type McpNamePattern = McpName | '*';
export type McpOperation = `${McpMethod}` | `${McpMethod}:${McpName}`;
export type McpOperationPattern = McpOperation | '*' | `${McpMethod}:*`;
export type Currency = 'USDC';
export type Network = 'solana';
export type RefundErrors = boolean | 'nonMcpOnly';

export type AuthorizationServerUrl = `http://${string}` | `https://${string}`;

export type RequirePaymentConfig = {
  price: BigNumber;
  getExistingPaymentId?: () => Promise<string | null>;
}

export type Charge = Required<Pick<PayMcpConfig, 'currency' | 'network' | 'destination'>> & {
  amount: BigNumber;
  source: PayMcpConfig['destination'];
}

export type ChargeResponse = {
  success: boolean;
  requiredPayment: Charge | null;
}

export type PaymentServer = {
  charge: (args: Charge) => Promise<ChargeResponse>;
  createPaymentRequest: (args: Charge & {resource: string}) => Promise<string>;
}

export type PayMcpConfig = {
  destination: string;
  mountPath: string;
  currency: Currency;
  network: Network;
  server: AuthorizationServerUrl;
  payeeName: string;
  // If not provided, the resource will be inferred from the request URL
  resource: string | null;
  allowHttp: boolean;
  //refundErrors: RefundErrors;
  logger: Logger;
  oAuthDb: OAuthDb;
  oAuthClient: OAuthResourceClient;
  paymentServer: PaymentServer;
}


export enum TokenProblem {
  NO_TOKEN = 'NO-TOKEN',
  NON_BEARER_AUTH_HEADER = 'NON-BEARER-AUTH-HEADER',
  INVALID_TOKEN = 'INVALID-TOKEN',
  INVALID_AUDIENCE = 'INVALID-AUDIENCE',
  NON_SUFFICIENT_FUNDS = 'NON-SUFFICIENT-FUNDS',
  INTROSPECT_ERROR = 'INTROSPECT-ERROR',
}

export type TokenCheckPass = {
  passes: true;
  token: string;
  data: TokenData;
}

export type TokenCheckFail = {
  passes: false;
  problem: TokenProblem;
  token: string | null;
  data: TokenData | null;
  resourceMetadataUrl: string | null;
}

export type TokenCheck = TokenCheckPass | TokenCheckFail;

export type ProtectedResourceMetadata = {
  resource: string;
  resource_name: string;
  authorization_servers: string[];
  bearer_methods_supported: string[];
  scopes_supported: string[];
}