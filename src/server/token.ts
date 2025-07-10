import { Request, Response, NextFunction } from "express";
import { BigNumber } from "bignumber.js";
import { Charge, PayMcpConfig, TokenCheck, TokenProblem } from "./types.js";

export function checkToken(req: Request, charges: Charge[], config: PayMcpConfig): TokenCheck {
  return {
    passes: false,
    problem: TokenProblem.INVALID_TOKEN,
    token: null
  };
}