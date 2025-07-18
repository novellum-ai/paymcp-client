import { ConsoleLogger } from "../logger.js";
import { SqliteOAuthDb } from "../oAuthDb.js";
import { PayMcpConfig } from "./types.js";
import { getCharge } from "./charge.js";
import { checkToken } from "./token.js";
import { sendOAuthChallenge } from "./oAuthChallenge.js";
import { continueWithUserContext } from "./userContext.js";
import { getRefunds, processRefunds } from "./refund.js";
import { parseMcpRequests } from "./http.js";
import { Request, Response, NextFunction } from "express";
import { getProtectedResourceMetadata as getPRMResponse, sendProtectedResourceMetadata } from "./protectedResourceMetadata.js";

export { payMcpUser } from './userContext.js';

type RequiredPayMcpConfigFields = 'toolPrice' | 'destination';
export type RequiredPayMcpConfig = Pick<PayMcpConfig, RequiredPayMcpConfigFields>;
export type OptionalPayMcpConfig = Omit<PayMcpConfig, RequiredPayMcpConfigFields>;

export const DEFAULT_CONFIG: Required<OptionalPayMcpConfig> = {
  mountPath: '/',
  currency: 'USDC' as const,
  network: 'solana' as const,
  server: 'https://auth.paymcp.com' as const,
  payeeName: 'A PayMcp Server',
  allowHttp: process.env.NODE_ENV === 'development',
  //refundErrors: true,
  logger: new ConsoleLogger(),
  oAuthDb: new SqliteOAuthDb({db: ':memory:'}),
  oAuthClient: null // Allow it to be constructed from oAuthDb, allowHttp, payeeName
};

export function paymcp(args: RequiredPayMcpConfig & Partial<OptionalPayMcpConfig>): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const config = Object.freeze({ ...DEFAULT_CONFIG, ...args });

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const logger = config.logger;  // Capture logger in closure

      const prmResponse = getPRMResponse(config, req);
      if (sendProtectedResourceMetadata(res, prmResponse)) {
        return;
      }

      const mcpRequests = await parseMcpRequests(config, req, req.body);
      logger.debug(`${mcpRequests.length} MCP requests found in request`);

      if(mcpRequests.length === 0) {
        next();
        return;
      }

      logger.debug(`Request started - ${req.method} ${req.path}`);
      const charges = await Promise.all(mcpRequests.map(mcpr => getCharge(config, req, mcpr)));
      const tokenCheck = await checkToken(config, req, charges);
      const user = tokenCheck.data?.sub ?? null;

      // Listen for when the response is finished
      res.on('finish', async () => {
        const refunds = await getRefunds(config, res, charges);
        await processRefunds(config, user, refunds);
        
        logger.debug(`Request finished ${user ? `for user ${user} ` : ''}- ${req.method} ${req.path}`);
      });

      // Send the oauth challenge, if needed. If we do, we're done
      if (sendOAuthChallenge(res, tokenCheck)) {
        return;
      }

      return continueWithUserContext(config, tokenCheck, next);
    } catch (error) {
      config.logger.error(`Critical error in paymcp middleware - return HTTP 500. Error: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ error: 'server_error', error_description: 'An internal server error occurred' });
    }
  };
}