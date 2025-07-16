import { BigNumber } from "bignumber.js";
import { Charge, McpOperationPattern, ToolPrice, Price } from "./types.js";
import { PayMcpConfig } from "./types.js";
import { JSONRPCRequest } from "@modelcontextprotocol/sdk/types.js";
import { getMcpOperation } from "./mcpOperation.js";
import { IncomingMessage } from "http";

export async function getCharge(config: PayMcpConfig, req: IncomingMessage, mcpRequest: JSONRPCRequest): Promise<Charge> {
  const amount = await toolPrice(config, req, mcpRequest);
  if (amount.isNegative()) {
    config.logger.error(`Charge amount must be non-negative, but received ${amount.toString()}. Returning 0 instead.`);
    return charge(config, 0);
  }
  return charge(config, amount);
}

async function toolPrice(config: PayMcpConfig, req: IncomingMessage, mcpRequest: JSONRPCRequest): Promise<BigNumber> {
  if (mcpRequest.method !== 'tools/call') {
    return BigNumber(0);
  }

  // Valid that it's a valid tool call - else return 0
  const params = mcpRequest.params ?? {};
  const toolName = params.name;
  if (typeof toolName !== 'string') {
    config.logger.warn(`MCP tools/call request did not have a .name parameter - this is not a valid tool call. Params: ${JSON.stringify(params)}`);
    return BigNumber(0);
  }
  const args = params.arguments ?? {};

  if (typeof config.toolPrice === 'function') {
    return await config.toolPrice(req, toolName, args);
  } else if (config.toolPrice instanceof BigNumber) {
    // We only support toolPrice today, but will likely want to expand to other MCP methods
    // in the future. We'll write this method to behave as if we have full price support today.
    const priceMap = {'tools/call:*': config.toolPrice};
    return priceFromMap(config, priceMap, mcpRequest);
  } else if (typeof config.toolPrice === 'object') {
    const priceMap: { [K in McpOperationPattern]?: BigNumber } = {};
    for (const [k,v] of Object.entries(config.toolPrice)) {
      priceMap[`tools/call:${k}`] = v;
    }
    return priceFromMap(config, priceMap, mcpRequest);
  } else {
    const msg = `Invalid toolPrice: ${typeof config.toolPrice}`;
    config.logger.error(msg);
    return BigNumber(0);
  }
}

function priceFromMap(config: PayMcpConfig, priceMap: { [K in McpOperationPattern]?: BigNumber }, mcpRequest: JSONRPCRequest): BigNumber {
  const op = getMcpOperation(mcpRequest);
  if (!op) {
    config.logger.info(`MCP request did not have a valid operation - this is not a valid MCP request. Params: ${JSON.stringify(mcpRequest.params)}`);
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