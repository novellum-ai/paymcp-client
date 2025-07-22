import { describe, it, expect } from 'vitest';
import * as TH from './testHelpers.js';
import { checkToken } from './token.js';
import { Currency, Network, TokenProblem } from './types.js';
import { BigNumber } from 'bignumber.js';

describe('checkToken', () => {
  it('should set props on result object', async () => {
    const tokenData = TH.tokenData();
    const oAuthClient = TH.oAuthClient({introspectResult: tokenData});
    const cfg = TH.config({oAuthClient});
    const req = TH.incomingToolMessage({authHeader: 'Bearer test-access-token'});
    const res = await checkToken(cfg, req);
    expect(res).toMatchObject({
      passes: true,
      data: tokenData,
      token: 'test-access-token',
    });
  });

  it('should call token introspection when MCP tool call request comes in with Authorization header', async () => {
    const tokenData = TH.tokenData();
    const oAuthClient = TH.oAuthClient({introspectResult: tokenData});
    const cfg = TH.config({oAuthClient});
    const req = TH.incomingToolMessage({authHeader: 'Bearer test-access-token'});
    const res = await checkToken(cfg, req);
    expect(res).toMatchObject({
      passes: true,
      data: tokenData,
      token: 'test-access-token',
    });
    expect(oAuthClient.introspectToken).toHaveBeenCalledWith(
      'https://auth.paymcp.com',
      'test-access-token'
    );
    expect(oAuthClient.introspectToken).toHaveBeenCalledTimes(1);
  });

  it('should return NO_TOKEN when no authorization header is present', async () => {
    const cfg = TH.config();
    const req = TH.incomingToolMessage({authHeader: undefined});
    const res = await checkToken(cfg, req);
    expect(res).toMatchObject({
      passes: false,
      problem: TokenProblem.NO_TOKEN,
      token: null,
    });
  });

  it('should return a Protected Resource Metadata URL in the WWW-Authenticate header', async () => {
    const cfg = TH.config();
    const req = TH.incomingToolMessage({authHeader: undefined, url: 'https://example.com/'});
    const res = await checkToken(cfg, req);
    expect(res).toMatchObject({
      resourceMetadataUrl: 'https://example.com/.well-known/oauth-protected-resource/'
    });
  });

  it('should use the same protocol as the request for the Protected Resource Metadata URL', async () => {
    const cfg = TH.config();
    const req = TH.incomingToolMessage({authHeader: undefined, url: 'http://example.com/'});
    const res = await checkToken(cfg, req);
    expect(res).toMatchObject({
      resourceMetadataUrl: 'http://example.com/.well-known/oauth-protected-resource/'
    });
  });

  it('should set Protected Resource Metadata URL to path matching the request path', async () => {
    const cfg = TH.config();
    const req = TH.incomingToolMessage({authHeader: undefined, url: 'http://example.com/some/path/here'});
    const res = await checkToken(cfg, req);
    expect(res).toMatchObject({
      resourceMetadataUrl: 'http://example.com/.well-known/oauth-protected-resource/some/path/here'
    });
  });

  it('should return NO_TOKEN when authorization header does not start with Bearer', async () => {
    const cfg = TH.config();
    const req = TH.incomingToolMessage({authHeader: 'foo'});
    const res = await checkToken(cfg, req);
    expect(res).toMatchObject({
      passes: false,
      problem: TokenProblem.NON_BEARER_AUTH_HEADER
    });
  });

  it('should return token data from client when token is valid', async () => {
    const tokenData = TH.tokenData();
    const cfg = TH.config({oAuthClient: TH.oAuthClient({introspectResult: tokenData})});
    const req = TH.incomingToolMessage({authHeader: 'Bearer test-access-token'});
    const res = await checkToken(cfg, req);
    expect(res).toMatchObject({
      passes: true
    });
    expect(res.data).toMatchObject(tokenData);
  });
});