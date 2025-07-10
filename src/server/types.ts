import { Request, Response, NextFunction } from "express";
import { BigNumber } from "bignumber.js";
import { Logger } from "../logger";
import { OAuthResourceClient } from "../oAuthResource";
import { TokenData } from "../types";
import { Enum } from "@solana/web3.js/lib";

export type McpOperation = string;
export type McpOperationPattern = McpOperation | '*' | 'tools/call:*';
export type Currency = 'USDC';
export type Network = 'solana';
export type RefundErrors = boolean | 'nonMcpOnly';

export type PayMcpConfig = {
  price: BigNumber | Record<McpOperationPattern, BigNumber> | ((req: Request, op: McpOperation, params: any) => Promise<BigNumber>);
  destination: string;
  mountPath: string;
  currency: Currency;
  network: Network;
  server: string;
  payeeName: string | null;
  allowHttp: boolean;
  refundErrors: RefundErrors;
  logger: Logger;
  oAuthResourceClient: OAuthResourceClient;
}

export type PayMcpContext = {
  logger: Logger;
}

export type Charge = Required<Pick<PayMcpConfig, 'currency' | 'network' | 'destination'>> & {
  amount: BigNumber;
}

export enum TokenProblem {
  NO_TOKEN = 'no-token',
  INVALID_TOKEN = 'invalid-token',
  EXPIRED_TOKEN = 'expired-token',
  INVALID_SCOPE = 'invalid-scope',
  INVALID_AUDIENCE = 'invalid-audience'
}

type TokenCheckPass = {
  passes: true;
  token: TokenData;
}
type TokenCheckFail = {
  passes: false;
  problem: TokenProblem;
  token: TokenData | null;
}
export type TokenCheck = TokenCheckPass | TokenCheckFail;