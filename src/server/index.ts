import { ConsoleLogger } from "../logger.js";
import { OAuthResourceClient } from "../oAuthResource.js";
import { SqliteOAuthDb } from "../oAuthDb.js";
import { PayMcpConfig } from "./types.js";
import { getCharge } from "./charge.js";
import { checkToken } from "./token.js";
import { sendOAuthChallenge } from "./oAuthChallenge.js";
import { payMcpUser, withUser } from "./user.js";
import { getRefunds, processRefunds } from "./refund.js";
import { parseMcpRequests } from "./http.js";
import { Request, Response, NextFunction } from "express";
import { withContext, payMcpContext } from "./context.js";
import { getProtectedResourceMetadata, sendProtectedResourceMetadata } from "./protectedResourceMetadata.js";

type RequiredPayMcpConfigFields = 'toolPrice' | 'destination';
export type RequiredPayMcpConfig = Pick<PayMcpConfig, RequiredPayMcpConfigFields>;
export type OptionalPayMcpConfig = Omit<PayMcpConfig, RequiredPayMcpConfigFields>;

export const DEFAULT_CONFIG: Required<OptionalPayMcpConfig> = {
  mountPath: '/',
  currency: 'USDC' as const,
  network: 'solana' as const,
  server: 'https://auth.paymcp.com' as const,
  payeeName: null,
  allowHttp: process.env.NODE_ENV === 'development',
  refundErrors: true,
  logger: new ConsoleLogger(),
  oAuthClient: new OAuthResourceClient({db: new SqliteOAuthDb({db: ':memory:'})}),
};

export function paymcp(args: RequiredPayMcpConfig & Partial<OptionalPayMcpConfig>): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const config = Object.freeze({ ...DEFAULT_CONFIG, ...args });

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Set the request-global context that can be used in handlers
      return withContext({logger: config.logger}, async () => {
        const context = payMcpContext();

        const prmMetadata = getProtectedResourceMetadata(config, req);
        if (prmMetadata) {
          sendProtectedResourceMetadata(res, prmMetadata);
          return;
        }

        const mcpRequests = await parseMcpRequests(config, req, req.body);
        context.logger.debug(`${mcpRequests.length} MCP requests found in request`);

        if(mcpRequests.length === 0) {
          next();
          return;
        }

        context.logger.debug(`Request started - ${req.method} ${req.path}`);
        const charges = await Promise.all(mcpRequests.map(mcpr => getCharge(config, req, mcpr)));
        const tokenCheck = await checkToken(config, req, charges);
        return withUser(tokenCheck.token?.sub ?? null, async () => {
          // Listen for when the response is finished
          res.on('finish', async () => {
            const user = payMcpUser();
            const refunds = await getRefunds(config, res, charges);
            await processRefunds(config, user, refunds);
            
            context.logger.debug(`Request finished - ${req.method} ${req.path}`);
          });
  
          // Send the oauth challenge, if needed. If we do, we're done
          if (sendOAuthChallenge(res, tokenCheck)) {
            return;
          } else {
            next();
          }
        });
      });
    } catch (error) {
      config.logger.error(`Critical error in paymcp middleware - return HTTP 500. Error: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ error: 'server_error', error_description: 'An internal server error occurred' });
    }
  };
}