import { BigNumber } from "bignumber.js";
import { Charge } from "./types.js";
import { PayMcpConfig } from "./types.js";
import { JSONRPCRequest } from "@modelcontextprotocol/sdk/types.js";

export function getCharge(config: PayMcpConfig, mcpRequest: JSONRPCRequest): Charge | null {
  if (mcpRequest.method !== 'tools/call') {
    return null;
  }

  if (config.price instanceof BigNumber) {
    return getStaticCharge(config, mcpRequest, config.price);
  }
  return null;
}

function getStaticCharge(config: PayMcpConfig, mcpRequest: JSONRPCRequest, price: BigNumber): Charge | null {
  return {
    amount: price,
    currency: config.currency,
    network: config.network,
    destination: config.destination
  }
}