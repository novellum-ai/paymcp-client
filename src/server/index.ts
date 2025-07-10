import { ConsoleLogger } from "../logger.js";
import { OAuthResourceClient } from "../oAuthResource.js";
import { SqliteOAuthDb } from "../oAuthDb.js";
import { PayMcpConfig } from "./types.js";
import { getCharge } from "./charge.js";
import { checkToken } from "./token.js";
import { sendOAuthChallenge } from "./oAuthChallenge.js";
import { setUser } from "./user.js";
import { getRefunds, processRefunds } from "./refund.js";
import { parseMcpRequests } from "./http.js";
import { Request, Response, NextFunction } from "express";
import { withContext, getContext } from "./context.js";

type RequiredFields = 'price' | 'destination';

export const DEFAULT_CONFIG: Omit<PayMcpConfig, RequiredFields> = {
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

export function paymcp(args: Pick<PayMcpConfig, RequiredFields> & Partial<PayMcpConfig>): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const config = Object.freeze({ ...DEFAULT_CONFIG, ...args });

  return async (req: Request, res: Response, next: NextFunction) => {
    // Set the request-global context that can be used in handlers
    return withContext({logger: config.logger}, async () => {
      const context = getContext();
      context.logger.debug(`Request started - ${req.method} ${req.path}`);

      const mcpRequests = await parseMcpRequests(config, req, req.path, req.body);
      const charges = mcpRequests.map(mcpr => getCharge(config, mcpr)).filter(c => c !== null);
      const tokenCheck = checkToken(config, req, charges);
      const user = setUser(req, tokenCheck.token);
      // No charges mean no auth required. Any charges (even 0s) means auth is required
      if (charges.length > 0 && !tokenCheck.passes) { 
        sendOAuthChallenge(res, tokenCheck);
      }

      // Listen for when the response is finished
      res.on('finish', () => {
        const refunds = getRefunds(config, res, charges);
        processRefunds(config, user, refunds);
        
        context.logger.debug(`Request finished - ${req.method} ${req.path}`);
      });
      
      // Call next() to continue to the next middleware
      next();
    });
  };
}