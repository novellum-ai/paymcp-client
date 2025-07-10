import { Readable } from 'stream';
import { IncomingMessage } from 'http';
import { JSONRPCRequest } from '@modelcontextprotocol/sdk/types.js';

export function mcpRequest({method = 'tools/call', params = {}, id = 'call-1'}: {
  method?: string,
  params?: any,
  id?: string
}): JSONRPCRequest {
  return { jsonrpc: "2.0" as const, method, params, id };
}

export function mcpToolRequest({toolName = 'testTool', args = {paramOne: 'test'}}: {
  toolName?: string,
  args?: any
}): JSONRPCRequest {
  return mcpRequest({method: 'tools/call', params: {name: toolName, arguments: args}});
}

export function createIncomingMessage(bodyObj: any, method = 'POST', headers = {'content-type': 'application/json'}): IncomingMessage {
  const bodyString = JSON.stringify(bodyObj);
  const stream = new Readable({
    read() {
      this.push(bodyString);
      this.push(null);
    }
  }) as IncomingMessage;
  stream.method = method;
  stream.headers = headers;
  return stream;
}
