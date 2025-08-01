import 'dotenv/config';
import { SolanaAccount } from '@longrun/paymcp-client/solanaAccount.js'

import { buildStreamableTransport } from '@longrun/paymcp-client/payMcpClient.js'
import chalk from 'chalk';
import { MastraMCPServerDefinition, LogMessage, MCPClient } from '@mastra/mcp';

interface ServiceConfig {
  mcpServer: string;
  toolName: string;
  description: string;
}

const SERVICES: Record<string, ServiceConfig> = {
  image: {
    mcpServer: 'https://image.corp.novellum.ai',
    toolName: 'image_create_image',
    description: 'image generation',
  },
  search: {
    mcpServer: 'https://search.corp.novellum.ai',
    toolName: 'search_search',
    description: 'search',
  }
};

const createServerConfigs = async (account: SolanaAccount) => {
  const serverConfigs: Record<string, MastraMCPServerDefinition> = {};

  // Create server configurations for each service
  for (const [serviceName, serviceConfig] of Object.entries(SERVICES)) {
    console.log(chalk.blue(`\nCreating transport for ${serviceName} service...`));

    // Create custom transport using payMcpClient function
    const clientArgs = {
      mcpServer: serviceConfig.mcpServer,
      account,
    };

    const transport = buildStreamableTransport(clientArgs);

    // Add server configuration
    serverConfigs[serviceName] = {
      customTransport: transport,
      logger: (logMessage: LogMessage) => {
        console.log(chalk.gray(`[${logMessage.serverName}] ${logMessage.level}: ${logMessage.message}`));
      },
      timeout: 10000,
    };
  }

  return serverConfigs;
};


const solanaEndpoint = process.env.SOLANA_ENDPOINT || '';
const solanaPrivateKey = process.env.SOLANA_PRIVATE_KEY || '';

if (!solanaEndpoint || !solanaPrivateKey) {
  throw new Error('SOLANA_ENDPOINT and SOLANA_PRIVATE_KEY must be set');
}

// validateEnvironment(solanaEndpoint, solanaPrivateKey);

const account = new SolanaAccount(solanaEndpoint, solanaPrivateKey);

// Create server configurations for all services
const serverConfigs = await createServerConfigs(account);

// Create a single MCPClient with all server configurations
export const mcpClient = new MCPClient({
  servers: serverConfigs,
  timeout: 15000,
}); 