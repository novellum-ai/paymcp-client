import { Response } from "express";
import { BigNumber } from "bignumber.js";
import { Charge, PayMcpConfig } from "./types.js";

export function getRefunds(res: Response, refundErrors: PayMcpConfig["refundErrors"], charges: Charge[]): Charge[] {
  // TODO: Implement refunds
  return [];
}

export function processRefunds(user: string, refunds: Charge[], config: PayMcpConfig): void {
  // TODO: Implement refunds
}