import { Readable } from 'stream';
import { IncomingMessage } from 'http';

export function toolBody({toolName = 'testTool', args = {paramOne: 'test'}}: {
  toolName?: string,
  args?: any
}){
  return {
    jsonrpc: "2.0" as const,
    method: "tools/call",
    params: {
      name: toolName,
      arguments: args,
    },
    id: "call-1",
  };
}

export function createIncomingMessage(bodyObj: any, method = 'POST', headers = {'content-type': 'application/json'}) {
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
