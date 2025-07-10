import { IncomingMessage } from "node:http";
import { McpOperation, PayMcpConfig } from "./types.js";
import { parseMcpMessages } from "./http.js";
import { JSONRPCMessage, JSONRPCRequest, isJSONRPCRequest } from "@modelcontextprotocol/sdk/types.js";

export async function getMcpOperations(config: PayMcpConfig, req: IncomingMessage, path: string, parsedMcpMessages?: JSONRPCMessage[]): Promise<McpOperation[]> {
  // Useful reference for dealing with low-level http requests:
  // https://github.com/modelcontextprotocol/typescript-sdk/blob/c6ac083b1b37b222b5bfba5563822daa5d03372e/src/server/streamableHttp.ts#L375
  if (!req.method) {
    return [];
  }
  const isPost = req.method.toLowerCase() === 'post';
  if (!isPost) {
    return [];
  }
  parsedMcpMessages = parsedMcpMessages ?? await parseMcpMessages(config, req, path);
  if (parsedMcpMessages.length === 0) {
    return [];
  }

  const operations = parsedMcpMessages.map(msg => mcpOperation(msg));
  return operations.filter(op => op !== null);
}

function mcpOperation(msg: JSONRPCMessage): McpOperation | null {
  // Try to get the operation from the jsonRpc message
  if(!isJSONRPCRequest(msg)) {
    return null;
  }
  const mcpRequest = msg as JSONRPCRequest;
  let op = mcpRequest.method;
  const toolName = mcpRequest.params?.name;
  if (toolName) {
    op = `${op}:${toolName}`
  }
  if (!op) {
    return null;
  }
  return op;
}