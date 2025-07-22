import { BigNumber } from "bignumber.js";
import { IncomingMessage } from "http";
import { PayMcpConfig, TokenCheck, TokenProblem } from "./types.js";

export async function checkToken(config: PayMcpConfig, req: IncomingMessage): Promise<TokenCheck> {
  const url = new URL(req.url || '');
  const protocol = url.protocol;
  const protectedResourceMetadataUrl = `${protocol}//${url.host}/.well-known/oauth-protected-resource${url.pathname}`;

  const failure = {
    passes: false as const,
    resourceMetadataUrl: protectedResourceMetadataUrl,
  };

  // Extract the Bearer token from the Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return {...failure, problem: TokenProblem.NO_TOKEN, data: null, token: null}
  }
  if (!authHeader.startsWith('Bearer ')) {
    return {...failure, problem: TokenProblem.NON_BEARER_AUTH_HEADER, data: null, token: null}
  }

  const token = authHeader.substring(7);

  try {
    const introspectionResult = await config.oAuthClient.introspectToken(config.server, token);
    
    if (!introspectionResult.active) {
      return {...failure, problem: TokenProblem.INVALID_TOKEN, data: null, token}
    }

    return {
      passes: true,
      data: introspectionResult,
      token,
    };
  } catch (error) {
    config.logger.error(`Error during token introspection: ${error}`);
    return {...failure, problem: TokenProblem.INTROSPECT_ERROR, data: null, token};
  }
}