import { Request } from "express";
import { BigNumber } from "bignumber.js";
import { PayMcpConfig, McpOperation } from "./types.js";

export function getCharge(req: Request, mcpOperation: McpOperation | null, price: PayMcpConfig["price"]): BigNumber | undefined {
  return undefined;
}