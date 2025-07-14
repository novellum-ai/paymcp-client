import { IncomingMessage } from "http";
import { TokenData } from "../types.js";

export function setUser(req: IncomingMessage, token: TokenData | null): string {
  return '';
}