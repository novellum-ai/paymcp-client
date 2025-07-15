import { BigNumber } from "bignumber.js";
import { Logger } from "../logger";
import { OAuthResourceClient } from "../oAuthResource";
import { TokenData } from "../types";
import { IncomingMessage } from "http";

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

export type Price = BigNumber | { [K in McpOperationPattern]?: BigNumber } | ((req: IncomingMessage, op: McpOperation, params: any) => Promise<BigNumber>);
export type ToolPrice = BigNumber | { [K in McpNamePattern]?: BigNumber } | ((req: IncomingMessage, toolName: McpName, params: any) => Promise<BigNumber>);

export type AuthorizationServerUrl = `http://${string}` | `https://${string}`;

export type PayMcpConfig = {
  // Intended for future expansion, to generalize prices to operations than tool calls
  //price: Price
  toolPrice: ToolPrice;
  destination: string;
  mountPath: string;
  currency: Currency;
  network: Network;
  server: AuthorizationServerUrl;
  payeeName: string | null;
  allowHttp: boolean;
  refundErrors: RefundErrors;
  logger: Logger;
  oAuthClient: OAuthResourceClient;
}

export type PayMcpContext = {
  logger: Logger;
}

export type Charge = Required<Pick<PayMcpConfig, 'currency' | 'network' | 'destination'>> & {
  amount: BigNumber;
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
  token: TokenData;
}

export type TokenCheckFail = {
  passes: false;
  problem: TokenProblem;
  token: TokenData | null;
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