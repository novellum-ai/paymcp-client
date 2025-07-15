import { describe, it, expect } from 'vitest';
import httpMocks from 'node-mocks-http';
import { parseMcpRequests } from './http.js';
import * as TH from './testHelpers.js'
import { DEFAULT_CONFIG } from './index.js';
import { BigNumber } from 'bignumber.js';

describe('http', () => {
  describe('parseMcpMessages', () => {
    it('should extract a tool message', async () => {
      const req = TH.incomingMessage({
        body: TH.mcpToolRequest({toolName: 'testTool', args: { paramOne: 'test' }})
      });
      const msgs = await parseMcpRequests(TH.config(), req);
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
      const req = TH.incomingMessage({ body:[
        TH.mcpToolRequest({toolName: 'testTool'}),
        TH.mcpToolRequest({toolName: 'testTool2'})
      ]});
      const msgs = await parseMcpRequests(TH.config(), req);
      expect(msgs.length).toEqual(2);
      expect((msgs[0] as any).params.name).toEqual('testTool');
      expect((msgs[1] as any).params.name).toEqual('testTool2');
    });

    it('should return an empty array for a post with a non-MCP body', async () => {
      const req = TH.incomingMessage({body: { not: 'a-mcp-message' }});
      const msgs = await parseMcpRequests(TH.config(), req);
      expect(msgs).toEqual([]);
    });

    it('should return an empty array for GET requests', async () => { 
      const req = TH.incomingMessage({method: 'GET'});
      const msgs = await parseMcpRequests(TH.config(), req);
      expect(msgs).toEqual([]);
    });

    it('should return messages for a sub-path of the mountPath', async () => {
      const pathConfig = TH.config({
        mountPath: '/mount-path'
      });
      const req = TH.incomingMessage({
        body: TH.mcpToolRequest({toolName: 'testTool'}), 
        url: 'https://example.com/mount-path/sub-path'
      });
      const msgs = await parseMcpRequests(pathConfig, req);
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
      const subPathConfig = TH.config({mountPath: '/mount-path'});
      const req = TH.incomingMessage({
        body: TH.mcpToolRequest({toolName: 'testTool'}), 
        url: 'https://example.com/not-the-mount-path'
      });
      const msgs = await parseMcpRequests(subPathConfig, req);
      expect(msgs).toEqual([]);
    });

    it('should extract MCP messages from SSE endpoints', async () => {
      const req = TH.incomingMessage({
        body: TH.mcpToolRequest({toolName: 'testTool'}), 
        url: 'https://example.com/mcp/message'
      });
      const msgs = await parseMcpRequests(TH.config({mountPath: '/mcp'}), req);
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

    it('should treat an empty path as /', async () => {
      const req = TH.incomingMessage({
        body: TH.mcpToolRequest({toolName: 'testTool'}), 
        url: 'https://example.com'
      });
      const msgs = await parseMcpRequests(TH.config(), req);
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
      const req = TH.incomingMessage({
        body: TH.mcpToolRequest({toolName: 'testTool'})
      });
      const emptyMountPathConfig = TH.config({mountPath: ''});
      const msgs = await parseMcpRequests(emptyMountPathConfig, req);
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
        url: 'https://example.com/mcp/message',
        body: TH.mcpToolRequest({toolName: 'testTool', args: { paramOne: 'test' }})
      });
      const msgs = await parseMcpRequests(TH.config(), req, req.body);
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