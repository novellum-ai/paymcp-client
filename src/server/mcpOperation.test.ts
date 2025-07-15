import { describe, it, expect } from 'vitest';
import { getMcpOperations } from './mcpOperation.js';
import * as TH from './testHelpers.js';

describe('getMcpOperations', () => {
  const config = TH.config();

  it('should extract a tool operation', async () => {
    const req = TH.incomingMessage({
      body: TH.mcpToolRequest({toolName: 'testTool'})
    });
    const ops = await getMcpOperations(config, req);
    expect(ops).toEqual(['tools/call:testTool']);
  });
  
  it('should return multiple operations for a request with multiple MCP tool messages', async () => {
    const req = TH.incomingMessage({body: [
      TH.mcpToolRequest({toolName: 'testTool'}),
      TH.mcpToolRequest({toolName: 'testTool2'})
    ]});
    const ops = await getMcpOperations(config, req);
    expect(ops).toEqual(['tools/call:testTool', 'tools/call:testTool2']);
  });
});