import { TokenData } from "../types.js";
import { PayMcpConfig, TokenCheck } from "./types.js";
import { AsyncLocalStorage } from "async_hooks";

const contextStorage = new AsyncLocalStorage<PayMcpContext | null>();

type PayMcpContext = {
  tokenData: TokenData | null;
  config: PayMcpConfig;
  resource: string;
}

export function getPayMcpConfig(): PayMcpConfig | null {
  const context = contextStorage.getStore();
  return context?.config ?? null;
}

export function getPayMcpResource(): string | null {
  const context = contextStorage.getStore();
  return context?.resource ?? null;
}

// Helper function to get the current request's user
export function payMcpUser(): string | null {
  const context = contextStorage.getStore();
  return context?.tokenData?.sub ?? null;
}

// Helper function to run code within a user context
export async function withPayMcpContext(config: PayMcpConfig, resource: string, tokenInfo: Pick<TokenCheck, 'token' | 'data'> | null, next: () => void): Promise<void> {
  config.logger.debug(`Setting user context to ${tokenInfo?.data?.sub ?? 'null'}`);
  
  if(tokenInfo && tokenInfo.data?.sub) {
    if(tokenInfo.token) {
      const dbData = {
        accessToken: tokenInfo.token!,
        resourceUrl: ''
      };
      // Save the token to the oAuthDB so that other users of the DB can access it
      // if needed (ie, for token-exchange for downstream services)
      await config.oAuthDb.saveAccessToken(tokenInfo.data.sub, '', dbData);
    } else {
      config.logger.warn(`Setting user context with token data, but there was no token provided. This probably indicates a bug, since the data should be derived from the token`);
      config.logger.debug(`Token data: ${JSON.stringify(tokenInfo.data)}`);
    }
  }

  const ctx = {
    tokenData: tokenInfo?.data || null,
    config,
    resource
  };
  return contextStorage.run(ctx, next);
} 