import { BigNumber } from "bignumber.js";
import { IncomingMessage } from "http";
import { Charge, PayMcpConfig, TokenCheck, TokenProblem } from "./types.js";
import { OAuthResourceClient } from "../oAuthResource.js";

export async function checkToken(config: PayMcpConfig, req: IncomingMessage, charges: Charge[]): Promise<TokenCheck> {
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

  const aggregatedCharge = aggregateCharge(config, charges);

  try {
    const client = getResourceClient(config);
    let additionalParameters = {charge: aggregatedCharge.amount.toString()};
    const introspectionResult = await client.introspectToken(config.server, token, additionalParameters);
    
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

function getResourceClient(config: PayMcpConfig): OAuthResourceClient {
  if (config.oAuthClient) {
    return config.oAuthClient;
  }

  return new OAuthResourceClient({
    db: config.oAuthDb,
    allowInsecureRequests: config.allowHttp,
    clientName: config.payeeName,
  });
}

function aggregateCharge(config: PayMcpConfig, charges: Charge[]): Charge  {
  if (charges.length === 0) {
    return {
      amount: BigNumber(0),
      currency: config.currency,
      network: config.network,
      destination: config.destination,
    };
  }

  const res: Charge = {...charges[0], amount: BigNumber(0)};
  for (const charge of charges) {
    if (charge.currency !== config.currency) {
      throw new Error('Charges with multiple currencies are not allowed');
    }
    if (charge.network !== config.network) {
      throw new Error('Charges with multiple networks are not allowed');
    }
    if (charge.destination !== config.destination) {
      throw new Error('Charges with multiple destinations are not allowed');
    }
    res.amount = res.amount.plus(charge.amount);
  }

  return res;
}