import { Response } from "express";
import { BigNumber } from "bignumber.js";
import { PayMcpConfig } from "./types.js";

export function getRefund(res: Response, refundErrors: PayMcpConfig["refundErrors"], charge: BigNumber): BigNumber | null {
  // TODO: Implement refunds
  return null;
}

export function processRefund(user: string, refund: BigNumber | null, config: PayMcpConfig): void {
  // TODO: Implement refunds
}