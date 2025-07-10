import { Request, Response, NextFunction } from "express";
import { BigNumber } from "bignumber.js";
import { Charge, PayMcpConfig, TokenCheck, TokenProblem } from "./types.js";

export function checkToken(config: PayMcpConfig, req: Request, charges: Charge[]): TokenCheck {
  return {
    passes: false,
    problem: TokenProblem.INVALID_TOKEN,
    token: null
  };
}