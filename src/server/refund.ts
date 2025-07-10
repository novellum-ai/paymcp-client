import { Response } from "express";
import { BigNumber } from "bignumber.js";
import { Charge, PayMcpConfig } from "./types.js";

export function getRefunds(config: PayMcpConfig, res: Response, charges: Charge[]): Charge[] {
  // TODO: Implement refunds
  return [];
}

export function processRefunds(config: PayMcpConfig, user: string, refunds: Charge[]): void {
  // TODO: Implement refunds
}