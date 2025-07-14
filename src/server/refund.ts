import { Response } from "express";
import { BigNumber } from "bignumber.js";
import { Charge, PayMcpConfig } from "./types.js";

export async function getRefunds(config: PayMcpConfig, res: Response, charges: Charge[]): Promise<Charge[]> {
  // TODO: Implement refunds
  return [];
}

export async function processRefunds(config: PayMcpConfig, user: string, refunds: Charge[]): Promise<void> {
  // TODO: Implement refunds
}