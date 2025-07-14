import { describe, it, expect } from 'vitest';
import { getMcpOperations } from './mcpOperation.js';
import { createIncomingMessage, mcpToolRequest } from './testHelpers.js';
import { DEFAULT_CONFIG } from './index.js';
import { BigNumber } from 'bignumber.js';

describe('getMcpOperations', () => {
  const config = {
    toolPrice: BigNumber(0.01),
    destination: 'testDestination',
    ...DEFAULT_CONFIG
  };

  it('should extract a tool operation', async () => {
    const req = createIncomingMessage(mcpToolRequest({toolName: 'testTool'}));
    const ops = await getMcpOperations(config, req, '/');
    expect(ops).toEqual(['tools/call:testTool']);
  });
  
  it('should return multiple operations for a request with multiple MCP tool messages', async () => {
    const req = createIncomingMessage([
      mcpToolRequest({toolName: 'testTool'}),
      mcpToolRequest({toolName: 'testTool2'})
    ]);
    const ops = await getMcpOperations(config, req, '/');
    expect(ops).toEqual(['tools/call:testTool', 'tools/call:testTool2']);
  });
});