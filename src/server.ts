import { Request, Response, NextFunction } from "express";
import { BigNumber } from "bignumber.js";
import { ConsoleLogger, Logger } from "./logger";
import { OAuthResourceClient } from "./oAuthResource";
import { SqliteOAuthDb } from "./oAuthDb";

export type McpOperation = `tools/call:${string}`;
export type McpOperationPattern = McpOperation | '*' | 'tools/call:*';
export type Currency = 'USDC';
export type Network = 'solana';
export type RefundErrors = boolean | 'nonMcpOnly';

export type PayMcpConfig = {
  price: BigNumber | Record<McpOperationPattern, BigNumber> | ((req: Request, op: McpOperation, params: any) => Promise<BigNumber>);
  destination: string;
  mountPath?: string | null;
  currency?: Currency;
  network?: Network;
  server?: string;
  payeeName?: string | null;
  allowHttp?: boolean;
  refundErrors?: RefundErrors;
  logger?: Logger;
  oAuthResourceClient?: OAuthResourceClient;
}

export function paymcp({
  price,
  destination,
  mountPath = null,
  currency = 'USDC',
  network = 'solana',
  server = 'https://auth.paymcp.com',
  payeeName = null,
  allowHttp = process.env.NODE_ENV === 'development',
  refundErrors = true,
  logger = new ConsoleLogger(),
  oAuthResourceClient: oauthGlobalClient = new OAuthResourceClient({db: new SqliteOAuthDb()})
}: PayMcpConfig): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    logger.debug(`Request started - ${req.method} ${req.path}`);
    
    // Listen for when the response is finished
    res.on('finish', () => {
      logger.debug(`Request finished - ${req.method} ${req.path}`);
    });
    
    // Call next() to continue to the next middleware
    next();
  };
}