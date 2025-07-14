import { Request, Response, NextFunction } from "express";
import { BigNumber } from "bignumber.js";
import { Charge, PayMcpConfig, TokenCheck, TokenProblem } from "./types.js";

export async function checkToken(config: PayMcpConfig, req: Request, charges: Charge[]): Promise<TokenCheck> {
  return {
    passes: false,
    problem: TokenProblem.INVALID_TOKEN,
    token: null
  };
}