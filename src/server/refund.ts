import { ServerResponse } from "http";
import { Charge, PayMcpConfig } from "./types.js";

export async function getRefunds(config: PayMcpConfig, res: ServerResponse, charges: Charge[]): Promise<Charge[]> {
  // TODO: Implement refunds
  return [];
}

export async function processRefunds(config: PayMcpConfig, user: string, refunds: Charge[]): Promise<void> {
  // TODO: Implement refunds
}