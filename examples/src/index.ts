#!/usr/bin/env node

import { payMcpClient } from '../../dist/src/client/payMcpClient.js';
import { SolanaPaymentMaker } from '../../dist/src/solanaPaymentMaker.js';
import { SqliteOAuthDb } from '../../dist/src/oAuthDb.js';

async function main() {
  // Get the command line argument (the prompt for image generation)
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node index.js "your image prompt here"');
    console.error('Example: node index.js "a beautiful sunset over mountains"');
    process.exit(1);
  }

  const imagePrompt = args[0];
  console.log(`Creating image with prompt: "${imagePrompt}"`);

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
      mcpServer: 'https://image.corp.novellum.ai', // As specified in PROMPT.md
      account: {
        accountId: 'paymcp', // As specified in PROMPT.md
        paymentMakers: { solana: solanaPaymentMaker } // As specified in PROMPT.md
      },
      oAuthDb: db,
      allowHttp: process.env.NODE_ENV === 'development'
    });

    // Call the createImage tool using the MCP client
    const result = await client.callTool({
      name: 'image_create_image',
      arguments: {
        prompt: imagePrompt
      }
    });

    console.log('Image creation request successful!');
    console.log('Result:', JSON.stringify(result, null, 2));
    if (result.content && Array.isArray(result.content) && result.content[0]?.text) {
      const parsedResult = JSON.parse(result.content[0].text);
      console.log('Parsed result:', parsedResult.url);
    }

    // If the response contains image data or URL, you could save it here
    if (result.content && Array.isArray(result.content) && result.content[0]?.text) {
      console.log(`Image result: ${result.content[0].text}`);
    }

  } catch (error) {
    console.error('Error creating image:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    await db.close();
  }
}

// Run the application
main().catch(console.error); 