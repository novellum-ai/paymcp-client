import { Request, Response, NextFunction } from "express";
import { ConsoleLogger } from "../logger.js";
import { OAuthResourceClient } from "../oAuthResource.js";
import { SqliteOAuthDb } from "../oAuthDb.js";
import { PayMcpConfig } from "./types.js";
import { getMcpOperation } from "./mcpOperation.js";
import { getCharge } from "./charge.js";
import { processToken } from "./token.js";
import { sendOAuthChallenge } from "./oAuthChallenge.js";
import { setUser } from "./user.js";
import { getRefund, processRefund } from "./refund.js";

const DEFAULT_CONFIG: Required<Omit<PayMcpConfig, 'price' | 'destination'>> = {
  mountPath: '/',
  currency: 'USDC' as const,
  network: 'solana' as const,
  server: 'https://auth.paymcp.com',
  payeeName: null,
  allowHttp: process.env.NODE_ENV === 'development',
  refundErrors: true,
  logger: new ConsoleLogger(),
  oAuthResourceClient: new OAuthResourceClient({db: new SqliteOAuthDb()})
};

export function paymcp(args: PayMcpConfig): (req: Request, res: Response, next: NextFunction) => void {
  const config = { ...DEFAULT_CONFIG, ...args };

  return async (req: Request, res: Response, next: NextFunction) => {
    config.logger.debug(`Request started - ${req.method} ${req.path}`);

    const mcpOperation = getMcpOperation(req, config.mountPath);
    const charge = getCharge(req, mcpOperation, config.price);
    if (charge === undefined) { next(); return; }
    const token = processToken(req, charge, config);
    if (!token) { sendOAuthChallenge(res); return; }
    const user = setUser(req, token);

    // Listen for when the response is finished
    res.on('finish', () => {
      const refund = getRefund(res, config.refundErrors, charge);
      processRefund(user, refund, config);
      
      config.logger.debug(`Request finished - ${req.method} ${req.path}`);
    });
    
    // Call next() to continue to the next middleware
    next();
  };
}