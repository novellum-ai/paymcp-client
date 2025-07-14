import { BigNumber } from "bignumber.js";
import { Charge, McpOperationPattern, ToolPrice, Price } from "./types.js";
import { PayMcpConfig } from "./types.js";
import { JSONRPCRequest } from "@modelcontextprotocol/sdk/types.js";
import { getMcpOperation } from "./mcpOperation.js";
import { IncomingMessage } from "http";
import { getContext } from "./context.js";

export async function getCharge(config: PayMcpConfig, req: IncomingMessage, mcpRequest: JSONRPCRequest): Promise<Charge> {
  const amount = await toolPrice(config.toolPrice, req, mcpRequest);
  return charge(config, amount);
}

async function toolPrice(toolPrice: ToolPrice, req: IncomingMessage, mcpRequest: JSONRPCRequest): Promise<BigNumber> {
  const context = getContext();
  if (mcpRequest.method !== 'tools/call') {
    return BigNumber(0);
  }

  // Valid that it's a valid tool call - else return 0
  const params = mcpRequest.params ?? {};
  const toolName = params.name;
  if (typeof toolName !== 'string') {
    context.logger.warn(`MCP tools/call request did not have a .name parameter - this is not a valid tool call. Params: ${JSON.stringify(params)}`);
    return BigNumber(0);
  }
  const args = params.arguments ?? {};

  if (typeof toolPrice === 'function') {
    return await toolPrice(req, toolName, args);
  } else if (toolPrice instanceof BigNumber) {
    // We only support toolPrice today, but will likely want to expand to other MCP methods
    // in the future. We'll write this method to behave as if we have full price support today.
    const priceMap = {'tools/call:*': toolPrice};
    return priceFromMap(priceMap, mcpRequest);
  } else if (typeof toolPrice === 'object') {
    const priceMap: { [K in McpOperationPattern]?: BigNumber } = {};
    for (const [k,v] of Object.entries(toolPrice)) {
      priceMap[`tools/call:${k}`] = v;
    }
    return priceFromMap(priceMap, mcpRequest);
  } else {
    const msg = `Invalid toolPrice: ${typeof toolPrice}`;
    context.logger.warn(msg);
    throw new Error(msg);
  }
}

function priceFromMap(priceMap: { [K in McpOperationPattern]?: BigNumber }, mcpRequest: JSONRPCRequest): BigNumber {
  const context = getContext();
  const op = getMcpOperation(mcpRequest);
  if (!op) {
    context.logger.info(`MCP request did not have a valid operation - this is not a valid MCP request. Params: ${JSON.stringify(mcpRequest.params)}`);
    return BigNumber(0);
  }
  if (priceMap[op]) {
    return priceMap[op];
  }
  const opWildcard = `${mcpRequest.method}:*` as McpOperationPattern;
  if (priceMap[opWildcard]) {
    return priceMap[opWildcard];
  }
  if (priceMap['*']) { // global wildcard
    return priceMap['*'];
  }
  return BigNumber(0);
}

function charge(config: PayMcpConfig, amount: BigNumber | number): Charge {
  return {
    amount: BigNumber(amount),
    currency: config.currency,
    network: config.network,
    destination: config.destination
  }
}