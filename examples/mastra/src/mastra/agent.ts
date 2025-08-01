import 'dotenv/config';
import { buildStreamableTransport } from '../../../../dist/client/payMcpClient.js';
import { SolanaAccount } from '../../../../dist/client/solanaAccount.js';
import { LogMessage, MCPClient, MastraMCPServerDefinition } from '@mastra/mcp';
import { openai } from '@ai-sdk/openai';
import chalk from 'chalk';

import { Agent } from '@mastra/core/agent';
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

// Example 1: Basic custom transport usage
console.log(chalk.blue('=== Example 1: PayMCP Integration with Mastra MCP Client ==='));


const validateEnvironment = (solanaEndpoint: string, solanaPrivateKey: string) => {
  if (!solanaEndpoint) {
    console.error('Error: SOLANA_ENDPOINT environment variable is required');
    console.error('Example: SOLANA_ENDPOINT=https://api.mainnet-beta.solana.com');
    process.exit(1);
  }

  if (!solanaPrivateKey) {
    console.error('Error: SOLANA_PRIVATE_KEY environment variable is required');
    console.error('Example: SOLANA_PRIVATE_KEY=your_base58_encoded_private_key');
    process.exit(1);
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



// Validate environment variables
const solanaEndpoint = process.env.SOLANA_ENDPOINT || '';
const solanaPrivateKey = process.env.SOLANA_PRIVATE_KEY || '';

validateEnvironment(solanaEndpoint, solanaPrivateKey);

const account = new SolanaAccount(solanaEndpoint, solanaPrivateKey);

console.log(chalk.blue('\n=== Example 2: Using Single MCPClient with Multiple Servers ==='));

// Create server configurations for all services
const serverConfigs = await createServerConfigs(account);

// Create a single MCPClient with all server configurations
const mcpClient = new MCPClient({
  servers: serverConfigs,
  timeout: 15000,
});

console.log(chalk.green('\nSuccessfully created MCPClient with multiple servers!'));

// Get tools from all servers
console.log(chalk.blue('\nFetching tools from all servers...'));
const allTools = await mcpClient.getTools();


// Create system prompt
const systemPrompt = `AI assistant is a brand new, powerful, human-like artificial intelligence.
The traits of AI include expert knowledge, helpfulness, cleverness, and articulateness.
AI is a well-behaved and well-mannered individual.
AI is always friendly, kind, and inspiring, and he is eager to provide vivid and thoughtful responses to the user.
AI has the sum of all knowledge in their brain, and is able to accurately answer nearly any question about any topic in conversation.
AI assistant prefers using the tools provided to it to answer questions.
`;

export default new Agent({
  name: 'ai',
  instructions: systemPrompt,
  tools: allTools,
  model: openai("gpt-4o-mini"),
})