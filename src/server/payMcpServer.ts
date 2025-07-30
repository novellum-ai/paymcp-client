import { ConsoleLogger } from "../common/logger.js";
import { SqliteOAuthDb } from "../common/oAuthDb.js";
import { PayMcpConfig } from "./types.js";
import { checkToken } from "./token.js";
import { sendOAuthChallenge } from "./oAuthChallenge.js";
import { withPayMcpContext } from "./payMcpContext.js";
import { parseMcpRequests } from "./http.js";
import { Request, Response, NextFunction, Router } from "express";
import { getProtectedResourceMetadata as getPRMResponse, sendProtectedResourceMetadata } from "./protectedResourceMetadata.js";
import { getResource } from "./getResource.js";
import { PayMcpPaymentServer } from "./paymentServer.js";
import { OAuthResourceClient } from "../common/oAuthResource.js";
import { getOAuthMetadata, sendOAuthMetadata } from "./oAuthMetadata.js";

type RequiredPayMcpConfigFields = 'destination';
type RequiredPayMcpConfig = Pick<PayMcpConfig, RequiredPayMcpConfigFields>;
type OptionalPayMcpConfig = Omit<PayMcpConfig, RequiredPayMcpConfigFields>;
export type PayMcpArgs = RequiredPayMcpConfig & Partial<OptionalPayMcpConfig>;
type BuildablePayMcpConfigFields = 'oAuthDb' | 'oAuthClient' | 'paymentServer' | 'logger';

export const DEFAULT_CONFIG: Required<Omit<OptionalPayMcpConfig, BuildablePayMcpConfigFields>> = {
  mountPath: '/',
  currency: 'USDC' as const,
  network: 'solana' as const,
  server: 'https://auth.paymcp.com' as const,
  payeeName: 'A PayMcp Server',
  allowHttp: process.env.NODE_ENV === 'development',
  resource: null, // Set dynamically from the request URL
};

export function buildServerConfig(args: PayMcpArgs): PayMcpConfig {
  if(!args.destination) {
    throw new Error('destination is required');
  }

  const withDefaults = { ...DEFAULT_CONFIG, ...args };
  const oAuthDb = withDefaults.oAuthDb ?? new SqliteOAuthDb({db: ':memory:'});
  const oAuthClient = withDefaults.oAuthClient ?? new OAuthResourceClient({
    db: oAuthDb,
    allowInsecureRequests: withDefaults.allowHttp,
    clientName: withDefaults.payeeName,
  });
  const logger = withDefaults.logger ?? new ConsoleLogger();
  const paymentServer = withDefaults.paymentServer ?? new PayMcpPaymentServer(withDefaults.server, oAuthDb, logger);
  const built = { oAuthDb, oAuthClient, paymentServer, logger};
  return Object.freeze({ ...withDefaults, ...built });
};

export function payMcpServer(args: PayMcpArgs): Router {
  const config = buildServerConfig(args);
  const router = Router();

  // Regular middleware
  const payMcpMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const logger = config.logger;  // Capture logger in closure
      const requestUrl = new URL(req.url, req.protocol + '://' + req.host);
      logger.debug(`Handling ${req.method} ${requestUrl.toString()}`);

      const resource = getResource(config, requestUrl);
      const prmResponse = getPRMResponse(config, requestUrl);
      if (sendProtectedResourceMetadata(res, prmResponse)) {
        return;
      }

      // Some older clients don't use PRM and assume the MCP server is an OAuth server
      const oAuthMetadata = await getOAuthMetadata(config, requestUrl);
      if(sendOAuthMetadata(res, oAuthMetadata)) {
        return;
      }

      const mcpRequests = await parseMcpRequests(config, requestUrl, req, req.body);
      logger.debug(`${mcpRequests.length} MCP requests found in request`);

      if(mcpRequests.length === 0) {
        next();
        return;
      }

      logger.debug(`Request started - ${req.method} ${req.path}`);
      const tokenCheck = await checkToken(config, resource, req);
      const user = tokenCheck.data?.sub ?? null;

      // Listen for when the response is finished
      res.on('finish', async () => {
        logger.debug(`Request finished ${user ? `for user ${user} ` : ''}- ${req.method} ${req.path}`);
      });

      // Send the oauth challenge, if needed. If we do, we're done
      if (sendOAuthChallenge(res, tokenCheck)) {
        return;
      }

      return withPayMcpContext(config, resource, tokenCheck, next);
    } catch (error) {
      config.logger.error(`Critical error in paymcp middleware - returning HTTP 500. Error: ${error instanceof Error ? error.message : String(error)}`);
      config.logger.debug(JSON.stringify(error, null, 2));
      res.status(500).json({ error: 'server_error', error_description: 'An internal server error occurred' });
    }
  };

  // Add middleware to the router
  router.use(payMcpMiddleware);

  return router;
}