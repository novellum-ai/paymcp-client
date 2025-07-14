import { IncomingMessage } from "node:http";
import { McpOperation, PayMcpConfig } from "./types.js";
import { parseMcpRequests } from "./http.js";
import { JSONRPCMessage, JSONRPCRequest, isJSONRPCRequest } from "@modelcontextprotocol/sdk/types.js";

export async function getMcpOperations(config: PayMcpConfig, req: IncomingMessage, path: string, parsedMcpMessages?: JSONRPCMessage[]): Promise<McpOperation[]> {
  parsedMcpMessages = parsedMcpMessages ?? await parseMcpRequests(config, req, path);
  if (parsedMcpMessages.length === 0) {
    return [];
  }

  const operations = parsedMcpMessages.map(msg => getMcpOperation(msg));
  return operations.filter(op => op !== null);
}

export function getMcpOperation(msg: JSONRPCMessage): McpOperation | null {
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
  return op as McpOperation;
}