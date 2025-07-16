import { TokenData } from "../types.js";
import { getResource } from "./protectedResourceMetadata.js";
import { PayMcpConfig, TokenCheck } from "./types.js";
import { AsyncLocalStorage } from "async_hooks";

const contextStorage = new AsyncLocalStorage<TokenData | null>();

// Helper function to get the current request's user
export function payMcpUser(): string | null {
  const tokenData = contextStorage.getStore();
  return tokenData?.sub ?? null;
}

// Helper function to run code within a user context
export async function continueWithUserContext(config: PayMcpConfig, tokenInfo: Pick<TokenCheck, 'token' | 'data'> | null, next: () => void): Promise<void> {
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
  
  return contextStorage.run(tokenInfo?.data || null, next);
} 