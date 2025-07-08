import { Request, Response, NextFunction } from "express";
import { BigNumber } from "bignumber.js";
import { Logger } from "../logger";
import { OAuthResourceClient } from "../oAuthResource";

export type McpOperation = `tools/call:${string}`;
export type McpOperationPattern = McpOperation | '*' | 'tools/call:*';
export type Currency = 'USDC';
export type Network = 'solana';
export type RefundErrors = boolean | 'nonMcpOnly';

export type PayMcpConfig = {
  price: BigNumber | Record<McpOperationPattern, BigNumber> | ((req: Request, op: McpOperation, params: any) => Promise<BigNumber>);
  destination: string;
  // TODO: Can we auto-detect mountPath? ie can we look at all incoming requests and identify MCP ones?
  mountPath?: string;
  currency?: Currency;
  network?: Network;
  server?: string;
  payeeName?: string | null;
  allowHttp?: boolean;
  refundErrors?: RefundErrors;
  logger?: Logger;
  oAuthResourceClient?: OAuthResourceClient;
}