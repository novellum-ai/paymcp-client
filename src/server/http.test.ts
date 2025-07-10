import { describe, it, expect } from 'vitest';
import httpMocks from 'node-mocks-http';
import { parseMcpMessages } from './http.js';
import { createIncomingMessage, toolBody } from './testHelpers.js';

describe('http', () => {
  describe('parseMcpMessages', () => {
    it('should extract a tool message', async () => {
      const req = createIncomingMessage(toolBody({toolName: 'testTool', args: { paramOne: 'test' }}));
      const msgs = await parseMcpMessages(req);
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
        toolBody({toolName: 'testTool'}),
        toolBody({toolName: 'testTool2'})
      ]);
      const msgs = await parseMcpMessages(req);
      expect(msgs.length).toEqual(2);
      expect((msgs[0] as any).params.name).toEqual('testTool');
      expect((msgs[1] as any).params.name).toEqual('testTool2');
    });

    it('should return an empty array for a post with a non-MCP body', async () => {
      const req = createIncomingMessage({ not: 'a-mcp-message' });
      const msgs = await parseMcpMessages(req);
      expect(msgs).toEqual([]);
    });

    it('should return an empty array for GET requests', async () => { 
      const req = createIncomingMessage({}, 'GET');
      const msgs = await parseMcpMessages(req);
      expect(msgs).toEqual([]);
    });

    it('should extract from an already parsed body', async () => {
      const req = httpMocks.createRequest({
        method: 'POST',
        path: '/mcp/message',
        body: toolBody({toolName: 'testTool', args: { paramOne: 'test' }})
      });
      const msgs = await parseMcpMessages(req, req.body);
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