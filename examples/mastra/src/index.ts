#!/usr/bin/env node

import 'dotenv/config';
import { buildStreamableTransport } from '../../../dist/client/payMcpClient.js';
import { SolanaAccount } from '../../../dist/client/solanaAccount.js';
import { LogMessage, MCPClient, MastraMCPServerDefinition } from '@mastra/mcp';
import chalk from 'chalk';

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

const validateArgs = (args: string[]) => {
  if (args.length < 1) {
    console.error('Usage: node index.js "your prompt/query here"');
    console.error('Services available:');
    console.error('  image - Generate images');
    console.error('  search - Search for information');
    console.error('');
    console.error('Examples:');
    console.error('  node index.js "create an image of a beautiful sunset over mountains"');
    console.error('  node index.js "provide me with the latest news about AI"');
    process.exit(1);
  }
};

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
      logger: (logMessage) => {
        console.log(chalk.gray(`[${logMessage.serverName}] ${logMessage.level}: ${logMessage.message}`));
      },
      timeout: 10000,
    };
  }

  return serverConfigs;
};

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(1);
  validateArgs(args);

  const prompt = args[1];

  // Validate environment variables
  const solanaEndpoint = process.env.SOLANA_ENDPOINT || '';
  const solanaPrivateKey = process.env.SOLANA_PRIVATE_KEY || '';

  validateEnvironment(solanaEndpoint, solanaPrivateKey);

  try {
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
    
    console.log(chalk.green('\nSuccessfully connected to all services!'));
    console.log(chalk.blue('Available tools:'), Object.keys(allTools));
    console.log(chalk.blue('User prompt:'), prompt);

    // For demonstration, let's show how to use the tools
    console.log(chalk.blue('\nTool execution example:'));
    for (const [toolName, tool] of Object.entries(allTools)) {
      const typedTool = tool as { description: string };
      console.log(chalk.cyan(`- ${toolName}: ${typedTool.description}`));
    }

    // Example of using a tool
    if (Object.keys(allTools).length > 0) {
      const firstToolName = Object.keys(allTools)[0];
      const firstTool = allTools[firstToolName];
      
      console.log(chalk.blue(`\nExample: Calling ${firstToolName}...`));
      try {
        // This would normally be called with proper arguments
        console.log(chalk.yellow(`Tool ${firstToolName} is ready to be called with appropriate arguments`));
      } catch (error) {
        console.error(chalk.red(`Error calling tool ${firstToolName}:`), error);
      }
    }

    // Get toolsets to see server-specific organization
    console.log(chalk.blue('\nFetching toolsets (server-specific organization)...'));
    const toolsets = await mcpClient.getToolsets();
    
    console.log(chalk.blue('\nToolsets by server:'));
    for (const [serverName, toolset] of Object.entries(toolsets)) {
      console.log(chalk.cyan(`\n${serverName}:`));
      for (const [toolName, tool] of Object.entries(toolset)) {
        const typedTool = tool as { description: string };
        console.log(chalk.gray(`  - ${toolName}: ${typedTool.description}`));
      }
    }

    console.log(chalk.green('\n=== Summary ==='));
    console.log(chalk.green('This example demonstrates:'));
    console.log(chalk.cyan('1. Using a single MCPClient with multiple server configurations'));
    console.log(chalk.cyan('2. Integrating PayMCP for payment processing'));
    console.log(chalk.cyan('3. Connecting to multiple MCP servers with custom transport'));
    console.log(chalk.cyan('4. Tool discovery and execution capabilities'));
    console.log(chalk.cyan('5. Server-specific tool organization'));

    // Clean up
    await mcpClient.disconnect();

  } catch (error) {
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  }
}

// Run the application
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
} 