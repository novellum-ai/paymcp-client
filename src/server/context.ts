import { AsyncLocalStorage } from "async_hooks";
import { PayMcpContext } from "./types.js";
import { ConsoleLogger } from "../logger.js";

// Create an AsyncLocalStorage instance to store config per request
const contextStorage = new AsyncLocalStorage<Required<PayMcpContext>>();

// Default test context for when we're in a test environment
const defaultTestContext: Required<PayMcpContext> = {
  logger: new ConsoleLogger(),
};

// Helper function to check if we're in a test environment
function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test' || 
         process.env.VITEST === 'true' ||
         typeof globalThis !== 'undefined' && 'vitest' in globalThis;
}

// Helper function to get the current request's config
export function payMcpContext(): Required<PayMcpContext> {
  const config = contextStorage.getStore();
  if (!config) {
    // If we're in a test environment, return a default context instead of throwing
    if (isTestEnvironment()) {
      return defaultTestContext;
    }
    // We generally logger.error instead of throwing, since this is middleware and we don't want
    // to break the server.
    //   However, if we can't get the context, we _also_ can't get the logger....
    throw new Error('getContext() called outside of a paymcp request context');
  }
  return config;
}

// Helper function to run code within a config context
export function withContext<T>(config: Required<PayMcpContext>, fn: () => T | Promise<T>): T | Promise<T> {
  return contextStorage.run(config, fn);
} 