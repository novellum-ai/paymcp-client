import { PayMcpConfig } from "./types.js";
import * as oauth from 'oauth4webapi';
import { ServerResponse } from "http";
import { getPath, getResource } from "./getResource.js";

export function sendOAuthMetadata(res: ServerResponse, metadata: oauth.AuthorizationServer | null): boolean {
  if (!metadata) {
    return false;
  }
  res.setHeader('Content-Type', 'application/json');
  res.writeHead(200);
  res.end(JSON.stringify(metadata));
  return true;
}

export async function getOAuthMetadata(config: PayMcpConfig, requestUrl: URL): Promise<oauth.AuthorizationServer | null> {
  if (isOAuthMetadataRequest(config, requestUrl)) {
    const authServer = await config.oAuthClient.authorizationServerFromUrl(new URL(config.server));

    return {
      issuer: config.server,
      authorization_endpoint: authServer.authorization_endpoint,
      response_types_supported: authServer.response_types_supported,
      grant_types_supported: authServer.grant_types_supported,
      token_endpoint: authServer.token_endpoint,
      token_endpoint_auth_methods_supported: authServer.token_endpoint_auth_methods_supported,
      registration_endpoint: authServer.registration_endpoint,
      revocation_endpoint: authServer.revocation_endpoint,
      introspection_endpoint: authServer.introspection_endpoint,
      introspection_endpoint_auth_methods_supported: authServer.introspection_endpoint_auth_methods_supported,
      code_challenge_methods_supported: authServer.code_challenge_methods_supported,
      scopes_supported: authServer.scopes_supported
    };
  }
  return null;
}

function isOAuthMetadataRequest(config: PayMcpConfig, requestUrl: URL): boolean {
  config.logger.debug(`Checking if ${requestUrl.toString()} is a OAuth metadata request`);
  const path = getPath(requestUrl).replace(/\/$/, '');
  return path === '/.well-known/oauth-authorization-server';
}