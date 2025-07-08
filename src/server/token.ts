import { Request, Response, NextFunction } from "express";
import { BigNumber } from "bignumber.js";
import { PayMcpConfig } from "./types.js";
import { TokenData } from "../types.js";

export function processToken(req: Request, charge: BigNumber, config: PayMcpConfig): TokenData | null {
  return null;
}