import { describe, it, expect } from 'vitest';
import { getMcpOperations } from './mcpOperation.js';
import { createIncomingMessage, mcpToolRequest } from './testHelpers.js';
import { DEFAULT_CONFIG } from './index.js';

describe('getMcpOperations', () => {
  const config = {
    price: new BigNumber(0.01),
    destination: 'testDestination',
    ...DEFAULT_CONFIG
  };

  it('should extract a tool operation', async () => {
    const req = createIncomingMessage(mcpToolRequest({toolName: 'testTool'}));
    const ops = await getMcpOperations(config, req, '/');
    expect(ops).toEqual(['tools/call:testTool']);
  });

  it('should return an empty array for a post with a non-MCP body', async () => {
    const req = createIncomingMessage({ not: 'a-mcp-message' });
    const ops = await getMcpOperations(config, req, '/');
    expect(ops).toEqual([]);
  });

  it('should return an empty array for GET requests', async () => { 
    const req = createIncomingMessage({}, 'GET');
    const ops = await getMcpOperations(config, req, '/');
    expect(ops).toEqual([]);
  });

  it('should return multiple operations for a request with multiple MCP tool messages', async () => {
    const req = createIncomingMessage([
      mcpToolRequest({toolName: 'testTool'}),
      mcpToolRequest({toolName: 'testTool2'})
    ]);
    const ops = await getMcpOperations(config, req, '/');
    expect(ops).toEqual(['tools/call:testTool', 'tools/call:testTool2']);
  });

  it('should ignore MCP messages outside of its mountPath', async () => {
    const subPathConfig = {
      ...config,
      mountPath: '/mount-path'
    }
    const req = createIncomingMessage(mcpToolRequest({toolName: 'testTool'}));
    const ops = await getMcpOperations(subPathConfig, req, '/not-the-mount-path');
    expect(ops).toEqual([]);
  });
});