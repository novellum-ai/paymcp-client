import { BigNumber } from "bignumber.js";
import { IncomingMessage } from "http";
import { Charge, PayMcpConfig, TokenCheck, TokenProblem } from "./types.js";

export async function checkToken(config: PayMcpConfig, req: IncomingMessage, charges: Charge[]): Promise<TokenCheck> {
  return {
    passes: false,
    problem: TokenProblem.INVALID_TOKEN,
    token: null
  };
}