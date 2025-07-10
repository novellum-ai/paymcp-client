import { describe, it, expect } from 'vitest';
import httpMocks from 'node-mocks-http';
import { parseMcpRequests } from './http.js';
import { createIncomingMessage, mcpToolRequest } from './testHelpers.js';
import { DEFAULT_CONFIG } from './index.js';
import { BigNumber } from 'bignumber.js';

describe('http', () => {
  describe('parseMcpMessages', () => {
    const config = {
      price: new BigNumber(0.01),
      destination: 'testDestination',
      ...DEFAULT_CONFIG
    };

    it('should extract a tool message', async () => {
      const req = createIncomingMessage(mcpToolRequest({toolName: 'testTool', args: { paramOne: 'test' }}));
      const msgs = await parseMcpRequests(config, req, '/');
      expect(msgs).toEqual([{
        id: 'call-1',
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'testTool',
          arguments: { paramOne: 'test' }
        },
      }]);
    });

    it('should return multiple messages for a request', async () => {
      const req = createIncomingMessage([
        mcpToolRequest({toolName: 'testTool'}),
        mcpToolRequest({toolName: 'testTool2'})
      ]);
      const msgs = await parseMcpRequests(config, req, '/');
      expect(msgs.length).toEqual(2);
      expect((msgs[0] as any).params.name).toEqual('testTool');
      expect((msgs[1] as any).params.name).toEqual('testTool2');
    });

    it('should return an empty array for a post with a non-MCP body', async () => {
      const req = createIncomingMessage({ not: 'a-mcp-message' });
      const msgs = await parseMcpRequests(config, req, '/');
      expect(msgs).toEqual([]);
    });

    it('should return an empty array for GET requests', async () => { 
      const req = createIncomingMessage({}, 'GET');
      const msgs = await parseMcpRequests(config, req, '/');
      expect(msgs).toEqual([]);
    });

    it('should return messages for a sub-path of the mountPath', async () => {
      const pathConfig = {
        ...config,
        mountPath: '/mount-path'
      }
      const req = createIncomingMessage(mcpToolRequest({toolName: 'testTool'}));
      const msgs = await parseMcpRequests(pathConfig, req, '/mount-path/sub-path');
      expect(msgs).toEqual([{
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'testTool',
          arguments: { paramOne: 'test' }
        },
        id: 'call-1',
      }]);
    });

    it('should ignore MCP messages outside of its mountPath', async () => {
      const subPathConfig = {
        ...config,
        mountPath: '/mount-path'
      }
      const req = createIncomingMessage(mcpToolRequest({toolName: 'testTool'}));
      const ops = await parseMcpRequests(subPathConfig, req, '/not-the-mount-path');
      expect(ops).toEqual([]);
    });

    it('should treat an empty path as /', async () => {
      const req = createIncomingMessage(mcpToolRequest({toolName: 'testTool'}));
      const msgs = await parseMcpRequests(config, req, '');
      expect(msgs).toEqual([{
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'testTool',
          arguments: { paramOne: 'test' }
        },
        id: 'call-1',
      }]);
    });

    it('should treat an empty mountPath as /', async () => {
      const req = createIncomingMessage(mcpToolRequest({toolName: 'testTool'}));
      const emptyMountPathConfig = {
        ...config,
        mountPath: ''
      }
      const msgs = await parseMcpRequests(emptyMountPathConfig, req, '/');
      expect(msgs).toEqual([{
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'testTool',
          arguments: { paramOne: 'test' }
        },
        id: 'call-1',
      }]);
    });

    it('should extract from an already parsed body', async () => {
      const req = httpMocks.createRequest({
        method: 'POST',
        path: '/mcp/message',
        body: mcpToolRequest({toolName: 'testTool', args: { paramOne: 'test' }})
      });
      const msgs = await parseMcpRequests(config, req, '/', req.body);
      expect(msgs).toEqual([{
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'testTool',
          arguments: { paramOne: 'test' }
        },
        id: 'call-1',
      }]);
    });
  });
});