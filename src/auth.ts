import { Request, Response } from "express";
import { OAuthResourceClient } from "./oAuthResource.js";
import { OpPriceMap, OpPrices } from "./types.js";

function getOp(req: Request): string {
  const isMessage = req.method.toLowerCase() === 'post';

  if (!isMessage) {
    return 'NON_MCP';
  } else {
    // Get the operation from the jsonRpc message
    let op = req.body.method;
    const toolName = req.body.params?.name;
    if (toolName) {
      op = `${op}:${toolName}`
    }
    if (!op) {
      throw new Error('No operation found in request');
    }
    return op;
  }
}

function getChargeForOperation(op: string, opPrices: OpPriceMap): number {
  // Check for exact match first
  if (opPrices[op] !== undefined) {
    return opPrices[op];
  }

  // Special case: 'tools/call' matches any 'tools/call:*' operation
  if (op.startsWith('tools/call:') && opPrices['tools/call'] !== undefined) {
    return opPrices['tools/call'];
  }

  // No matches, default to 0
  return 0;
}

// TODO: Delete paymcp-client auth.ts - it's superceeded by the new server.ts middleware in paymcp()
// opPrices is experimental: The names of tools that will be charged for if PayMcp is used. 
// If not provided, all tools will be charged at the amount specified in the authorizationServerUrl's amount field
// If any are provided, all unlisted tools will be charged at 0
// resourceServerUrl is the URL of the resource server that the token was issued for
//   The client will fetch the PRM document from this URL to determine the token introspection server URL,
//   so if this service could receive requests for multiple resource servers, they implicitly all need
//   to use the same authorization server
export function requireOAuthUser(authorizationServerUrl: string, oauthClient: OAuthResourceClient, opPrices?: OpPrices): (req: Request, res: Response) => Promise<string | undefined> {
  return async (req: Request, res: Response): Promise<string | undefined> => {
    const protocol = req.protocol;
    const protectedResourceMetadataUrl = `${protocol}://${req.host}/.well-known/oauth-protected-resource${req.path}`;

    // Extract the Bearer token from the Authorization header
    const authHeader = req.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[auth] No authorization header found');
      // Set the WWW-Authenticate header for 401 responses as per PRM spec
      res.set('WWW-Authenticate', `Bearer resource_metadata="${protectedResourceMetadataUrl}"`);
      res.status(401).json({
        error: 'invalid_request',
        error_description: 'No token provided',
        www_authenticate: `Bearer resource_metadata="${protectedResourceMetadataUrl}"`
      });
      return undefined;
    }

    const token = authHeader.substring(7);

    try {
      // Perform token introspection
      let additionalParameters = {};
      const op = getOp(req);
      console.log('[auth] op', op, opPrices);
      // If they've specified any prices, we pass charge for everything
      // Anything they didn't specify is 0
      // TODO: Revisit the implicit 0 pricing of unspecified operations
      if (opPrices) {
        // We don't just set the amount because according to the docs, we can't change existing parameters
        // https://github.com/panva/oauth4webapi/blob/main/docs/interfaces/IntrospectionRequestOptions.md
        // We can't just strip the amount parameter just for the token introspection request, because that 
        // has to be reflected in /.well-known/oauth-protected-resource, (which is annoying but possible),
        // AS WELL as in the AS's /.well-known/oauth-authorization-server, (which would require the AS to 
        // make a decision for all clients about whether they have to send an amount parameter or not).
        const opPriceMap = typeof opPrices === 'function' ? opPrices({request: req}) : opPrices;
        const charge = getChargeForOperation(op, opPriceMap);
        additionalParameters = { charge };
      }
      const introspectionResult = await oauthClient.introspectToken(authorizationServerUrl, token, additionalParameters);

      if (!introspectionResult.active) {
        console.log('[auth] Token is not active');
        res.set('WWW-Authenticate', `Bearer resource_metadata="${protectedResourceMetadataUrl}"`);
        res.status(401).json({ error: 'invalid_token', error_description: 'Token is not active' });
        return undefined;
      }

      // Return the subject (user ID) from the introspection response
      return introspectionResult.sub;
    } catch (error) {
      console.error('[auth] Error during token introspection:', error);
      res.status(500).json({ error: 'server_error', error_description: 'An internal server error occurred' });
      return undefined;
    }
  };
}