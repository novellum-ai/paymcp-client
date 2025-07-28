import { ClientConfig } from "./types.js";
import { SqliteOAuthDb } from "../oAuthDb.js";
import { ConsoleLogger } from "../common/logger.js";
import { PayMcpClient } from "../payMcpClient.js";
import * as mcp from '@modelcontextprotocol/sdk';

type RequiredClientConfigFields = 'mcpServer' | 'account';
type RequiredClientConfig = Pick<ClientConfig, RequiredClientConfigFields>;
type OptionalClientConfig = Omit<ClientConfig, RequiredClientConfigFields>;
export type ClientArgs = RequiredClientConfig & Partial<OptionalClientConfig>;
type BuildableClientConfigFields = 'oAuthDb' | 'logger';

export const DEFAULT_CLIENT_CONFIG: Required<Omit<OptionalClientConfig, BuildableClientConfigFields>> = {
  allowedAuthorizationServers: ['https://auth.paymcp.com'],
  approvePayment: async (p) => true,
  fetchFn: fetch,
  oAuthChannelFetch: fetch,
  allowHttp: process.env.NODE_ENV === 'development',
  clientInfo: {
    name: 'PayMcpClient',
    version: '0.0.1'
  },
  clientOptions: {
    capabilities: {}
  },
};

export function buildConfig(args: ClientArgs): ClientConfig {
  const withDefaults = { ...DEFAULT_CLIENT_CONFIG, ...args };
  const oAuthDb = withDefaults.oAuthDb ?? new SqliteOAuthDb({db: ':memory:'});
  const logger = withDefaults.logger ?? new ConsoleLogger();
  const built = { oAuthDb, logger};
  return Object.freeze({ ...withDefaults, ...built });
};

export async function payMcpClient(args: ClientArgs): Promise<mcp.Client> {
  const config = buildConfig(args);

  const fetcher = new PayMcpClient({
    userId: args.account.accountId,
    db: config.oAuthDb,
    paymentMakers: args.account.paymentMakers,
    fetchFn: config.fetchFn,
    sideChannelFetch: config.oAuthChannelFetch,
    allowInsecureRequests: config.allowHttp
  });

  const client = new mcp.Client(config.clientInfo, config.clientOptions);
  const transport = new mcp.StreamableHTTPClientTransport(new URL(args.mcpServer), {fetch: fetcher.fetch});
  await client.connect(transport);

  return client;
}