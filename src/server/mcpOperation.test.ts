import { describe, it, expect } from 'vitest';
import { getMcpOperations } from './mcpOperation.js';
import { createIncomingMessage, toolBody } from './testHelpers.js';

describe('getMcpOperations', () => {
  it('should extract a tool operation', async () => {
    const req = createIncomingMessage(toolBody({toolName: 'testTool'}));
    const ops = await getMcpOperations(req);
    expect(ops).toEqual(['tools/call:testTool']);
  });

  it('should return an empty array for a post with a non-MCP body', async () => {
    const req = createIncomingMessage({ not: 'a-mcp-message' });
    const ops = await getMcpOperations(req);
    expect(ops).toEqual([]);
  });

  it('should return an empty array for GET requests', async () => { 
    const req = createIncomingMessage({}, 'GET');
    const ops = await getMcpOperations(req);
    expect(ops).toEqual([]);
  });

  it('should return multiple operations for a request with multiple MCP tool messages', async () => {
    const req = createIncomingMessage([
      toolBody({toolName: 'testTool'}),
      toolBody({toolName: 'testTool2'})
    ]);
    const ops = await getMcpOperations(req);
    expect(ops).toEqual(['tools/call:testTool', 'tools/call:testTool2']);
  });
});