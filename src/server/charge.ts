import { BigNumber, config } from "bignumber.js";
import { Charge } from "./types.js";
import { PayMcpConfig } from "./types.js";
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

export function getCharge(config: PayMcpConfig, msg: JSONRPCMessage): Charge | null {
  if (config.price instanceof BigNumber) {
    return getStaticCharge(config, msg, config.price);
  }
  return null;
}

function getStaticCharge(config: PayMcpConfig, msg: JSONRPCMessage, price: BigNumber): Charge {
  return {
    amount: price,
    currency: config.currency,
    network: config.network,
    destination: config.destination
  }
}