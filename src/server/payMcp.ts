import { ConsoleLogger } from "../logger.js";
import { SqliteOAuthDb } from "../oAuthDb.js";
import { PayMcpConfig } from "./types.js";
import { checkToken } from "./token.js";
import { sendOAuthChallenge } from "./oAuthChallenge.js";
import { withPayMcpContext } from "./payMcpContext.js";
import { parseMcpRequests } from "./http.js";
import { Request, Response, NextFunction } from "express";
import { getProtectedResourceMetadata as getPRMResponse, sendProtectedResourceMetadata } from "./protectedResourceMetadata.js";
import { PayMcpPaymentServer } from "./paymentServer.js";
import { OAuthResourceClient } from "../oAuthResource.js";

type RequiredPayMcpConfigFields = 'destination';
type RequiredPayMcpConfig = Pick<PayMcpConfig, RequiredPayMcpConfigFields>;
type OptionalPayMcpConfig = Omit<PayMcpConfig, RequiredPayMcpConfigFields>;
type PayMcpArgs = RequiredPayMcpConfig & Partial<OptionalPayMcpConfig>;
type BuildablePayMcpConfigFields = 'oAuthDb' | 'oAuthClient' | 'paymentServer' | 'logger';

export const DEFAULT_CONFIG: Required<Omit<OptionalPayMcpConfig, BuildablePayMcpConfigFields>> = {
  mountPath: '/',
  currency: 'USDC' as const,
  network: 'solana' as const,
  server: 'https://auth.paymcp.com' as const,
  payeeName: 'A PayMcp Server',
  allowHttp: process.env.NODE_ENV === 'development',
  //refundErrors: true,
};

const buildConfig = (args: PayMcpArgs): PayMcpConfig => {
  const withDefaults = { ...DEFAULT_CONFIG, ...args };
  const oAuthDb = withDefaults.oAuthDb ?? new SqliteOAuthDb({db: ':memory:'});
  const oAuthClient = withDefaults.oAuthClient ?? new OAuthResourceClient({
    db: oAuthDb,
    allowInsecureRequests: withDefaults.allowHttp,
    clientName: withDefaults.payeeName,
  });
  const paymentServer = withDefaults.paymentServer ?? new PayMcpPaymentServer(withDefaults.server, oAuthDb);
  const logger = new ConsoleLogger();
  const built = { oAuthDb, oAuthClient, paymentServer, logger };
  return Object.freeze({ ...withDefaults, ...built });
};

export function paymcp(args: PayMcpArgs): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const config = buildConfig(args);

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
      const tokenCheck = await checkToken(config, req);
      const user = tokenCheck.data?.sub ?? null;

      // Listen for when the response is finished
      res.on('finish', async () => {
        logger.debug(`Request finished ${user ? `for user ${user} ` : ''}- ${req.method} ${req.path}`);
      });

      // Send the oauth challenge, if needed. If we do, we're done
      if (sendOAuthChallenge(res, tokenCheck)) {
        return;
      }

      return withPayMcpContext(config, tokenCheck, next);
    } catch (error) {
      config.logger.error(`Critical error in paymcp middleware - return HTTP 500. Error: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ error: 'server_error', error_description: 'An internal server error occurred' });
    }
  };
}