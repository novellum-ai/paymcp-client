import BigNumber from 'bignumber.js';
import express from 'express';
import bodyParser from 'body-parser';
import { createMcpServer, defineTool } from '@longrun/turtle';
import { z } from 'zod';
import { requirePayment, payMcpServer, ConsoleLogger, LogLevel } from '../index';
import 'dotenv/config';

const PORT = 3009;

// Create the Express app
const app = express();

app.use(bodyParser.json());

// Set up an MCP server to use as an example
// Define MCP tools that require authentication
const secureTool = defineTool(
  'secure-data',
  'Get secure data that requires authentication',
  z.object({
    message: z.string().optional()
  }),
  async () => {
    await requirePayment({price: BigNumber(0.01)});
    console.log('Got past requirePayment');
    // The user is already authenticated by the MCP server's auth middleware
    return 'Secure data accessed successfully';
  }
);

// Create MCP server with OAuth authentication
const mcpServer = createMcpServer({
  mountpath: '/',
  tools: [secureTool],
  name: 'Secure Data Tool',
});

// Mount the MCP server
app.use(payMcpServer({
  destination: process.env.SOLANA_DESTINATION!,
  resource: `http://localhost:${PORT}`,
  server: 'http://localhost:3010',
  mountPath: '/',
  payeeName: 'I like turtles',
  allowHttp: true,
  logger: new ConsoleLogger({level: LogLevel.DEBUG})
}));
app.use(mcpServer);


// Start the server
app.listen(PORT, async () => {
  console.log(`MCP server running at http://localhost:${PORT}`);
  console.log('MCP server mounted at /');
});