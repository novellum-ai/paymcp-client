import { IncomingMessage } from "http";
import { TokenData } from "../types.js";
import { AsyncLocalStorage } from "async_hooks";

const contextStorage = new AsyncLocalStorage<string | null>();

// Helper function to get the current request's user
export function payMcpUser(): string | null {
  const user = contextStorage.getStore();
  return user ?? null;
}

// Helper function to run code within a user context
export function withUser<T>(user: string | null, fn: () => T | Promise<T>): T | Promise<T> {
  return contextStorage.run(user, fn);
} 