import { BigNumber } from "bignumber.js";
import { Charge } from "./types.js";
import { PayMcpConfig } from "./types.js";
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

export function getCharge(msg: JSONRPCMessage, price: PayMcpConfig["price"]): Charge | undefined {
  return undefined;
}