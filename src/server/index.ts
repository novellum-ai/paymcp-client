import { ConsoleLogger } from "../logger.js";
import { OAuthResourceClient } from "../oAuthResource.js";
import { SqliteOAuthDb } from "../oAuthDb.js";
import { PayMcpConfig } from "./types.js";
import { getMcpOperations } from "./mcpOperation.js";
import { getCharge } from "./charge.js";
import { checkToken } from "./token.js";
import { sendOAuthChallenge } from "./oAuthChallenge.js";
import { setUser } from "./user.js";
import { getRefunds, processRefunds } from "./refund.js";
import { parseMcpMessages } from "./http.js";
import { Request, Response, NextFunction } from "express";
import { withContext, getContext } from "./context.js";

export const DEFAULT_CONFIG: Required<Omit<PayMcpConfig, 'price' | 'destination'>> = {
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

export function paymcp(args: PayMcpConfig): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const config = Object.freeze({ ...DEFAULT_CONFIG, ...args });

  return async (req: Request, res: Response, next: NextFunction) => {
    // Set the request-global context that can be used in handlers
    return withContext({logger: config.logger}, async () => {
      const context = getContext();
      context.logger.debug(`Request started - ${req.method} ${req.path}`);

      const messages = await parseMcpMessages(req, req.body);
      const charges = messages.map(msg => getCharge(msg, config.price)).filter(c => c !== undefined);
      const tokenCheck = checkToken(req, charges, config);
      const user = setUser(req, tokenCheck.token);
      // No charges mean no auth required. Any charges (even 0s) means auth is required
      if (charges.length > 0 && !tokenCheck.passes) { 
        sendOAuthChallenge(res, tokenCheck);
      }

      // Listen for when the response is finished
      res.on('finish', () => {
        const refunds = getRefunds(res, config.refundErrors, charges);
        processRefunds(user, refunds, config);
        
        context.logger.debug(`Request finished - ${req.method} ${req.path}`);
      });
      
      // Call next() to continue to the next middleware
      next();
    });
  };
}