import { ClientConfig } from "./types.js";
import { SqliteOAuthDb } from "../common/oAuthDb.js";
import { ConsoleLogger } from "../common/logger.js";
import { PayMcpFetcher } from "./payMcpFetcher.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

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

export function buildClientConfig(args: ClientArgs): ClientConfig {
  const withDefaults = { ...DEFAULT_CLIENT_CONFIG, ...args };
  const oAuthDb = withDefaults.oAuthDb ?? new SqliteOAuthDb({db: ':memory:'});
  const logger = withDefaults.logger ?? new ConsoleLogger();
  const built = { oAuthDb, logger};
  return Object.freeze({ ...withDefaults, ...built });
};

export async function payMcpClient(args: ClientArgs): Promise<Client> {
  const config = buildClientConfig(args);

  const fetcher = new PayMcpFetcher({
    userId: args.account.accountId,
    db: config.oAuthDb,
    paymentMakers: args.account.paymentMakers,
    fetchFn: config.fetchFn,
    sideChannelFetch: config.oAuthChannelFetch,
    allowInsecureRequests: config.allowHttp
  });

  const client = new Client(config.clientInfo, config.clientOptions);
  const transport = new StreamableHTTPClientTransport(new URL(args.mcpServer), {fetch: fetcher.fetch});
  await client.connect(transport);

  return client;
}