#!/usr/bin/env node

import { payMcpClient } from '../../dist/src/client/payMcpClient.js';
import { SolanaPaymentMaker } from '../../dist/src/solanaPaymentMaker.js';
import { SqliteOAuthDb } from '../../dist/src/oAuthDb.js';

interface ServiceConfig {
  mcpServer: string;
  toolName: string;
  description: string;
  getArguments: (prompt: string) => Record<string, any>;
}

const SERVICES: Record<string, ServiceConfig> = {
  image: {
    mcpServer: 'https://image.corp.novellum.ai',
    toolName: 'image_create_image',
    description: 'image generation',
    getArguments: (prompt: string) => ({ prompt })
  },
  search: {
    mcpServer: 'https://search.corp.novellum.ai',
    toolName: 'search_search',
    description: 'search',
    getArguments: (prompt: string) => ({ query: prompt })
  }
};

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node index.js <service> "your prompt/query here"');
    console.error('Services available:');
    console.error('  image - Generate images');
    console.error('  search - Search for information');
    console.error('');
    console.error('Examples:');
    console.error('  node index.js image "a beautiful sunset over mountains"');
    console.error('  node index.js search "latest news about AI"');
    process.exit(1);
  }

  const service = args[0].toLowerCase();
  const prompt = args[1];

  if (!SERVICES[service]) {
    console.error(`Error: Unknown service "${service}"`);
    console.error('Available services:', Object.keys(SERVICES).join(', '));
    process.exit(1);
  }

  const serviceConfig = SERVICES[service];
  console.log(`Using ${serviceConfig.description} service with prompt: "${prompt}"`);

  // Validate environment variables
  const solanaEndpoint = process.env.SOLANA_ENDPOINT;
  const solanaPrivateKey = process.env.SOLANA_PRIVATE_KEY;

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

  // Create database instance
  const db = new SqliteOAuthDb({ db: 'example-oauth.db' });

  try {
    // Create Solana payment maker
    const solanaPaymentMaker = new SolanaPaymentMaker(solanaEndpoint, solanaPrivateKey);

    // Create MCP client using payMcpClient function
    const client = await payMcpClient({
      mcpServer: serviceConfig.mcpServer as any,
      account: {
        accountId: 'paymcp', // As specified in PROMPT.md
        paymentMakers: { solana: solanaPaymentMaker } // As specified in PROMPT.md
      },
      oAuthDb: db,
      allowHttp: process.env.NODE_ENV === 'development'
    });

    // Call the appropriate tool using the MCP client
    const result = await client.callTool({
      name: serviceConfig.toolName,
      arguments: serviceConfig.getArguments(prompt)
    });

    console.log(`${serviceConfig.description} request successful!`);
    console.log('Result:', JSON.stringify(result, null, 2));

    // Handle different result formats based on service
    if (result.content && Array.isArray(result.content) && result.content[0]?.text) {
      if (service === 'image') {
        try {
          const parsedResult = JSON.parse(result.content[0].text);
          console.log('Image URL:', parsedResult.url);
        } catch (e) {
          console.log('Image result:', result.content[0].text);
        }
      } else if (service === 'search') {
        console.log('Search results:', result.content[0].text);
      }
    }

  } catch (error) {
    console.error(`Error with ${serviceConfig.description}:`, error);
    process.exit(1);
  } finally {
    // Close the database connection
    await db.close();
  }
}

// Run the application
main().catch(console.error); 