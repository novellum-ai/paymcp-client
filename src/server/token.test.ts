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
    const res = await checkToken(cfg, req, []);
    expect(res).toMatchObject({
      passes: true,
      token: tokenData,
    });
  });

  it('should call token introspection when MCP tool call request comes in with Authorization header', async () => {
    const tokenData = TH.tokenData();
    const oAuthClient = TH.oAuthClient({introspectResult: tokenData});
    const cfg = TH.config({oAuthClient});
    const req = TH.incomingToolMessage({authHeader: 'Bearer test-access-token'});
    const res = await checkToken(cfg, req, []);
    expect(res).toMatchObject({
      passes: true,
      token: tokenData,
    });
    expect(oAuthClient.introspectToken).toHaveBeenCalledWith(
      'https://auth.paymcp.com',
      'test-access-token',
      {charge: '0'}
    );
    expect(oAuthClient.introspectToken).toHaveBeenCalledTimes(1);
  });

  it('should return NO_TOKEN when no authorization header is present', async () => {
    const cfg = TH.config();
    const req = TH.incomingToolMessage({authHeader: undefined});
    const res = await checkToken(cfg, req, []);
    expect(res).toMatchObject({
      passes: false,
      problem: TokenProblem.NO_TOKEN,
      token: null,
    });
  });

  it('should return a Protected Resource Metadata URL in the WWW-Authenticate header', async () => {
    const cfg = TH.config();
    const req = TH.incomingToolMessage({authHeader: undefined, url: 'https://example.com/'});
    const res = await checkToken(cfg, req, []);
    expect(res).toMatchObject({
      resourceMetadataUrl: 'https://example.com/.well-known/oauth-protected-resource/'
    });
  });

  it('should use the same protocol as the request for the Protected Resource Metadata URL', async () => {
    const cfg = TH.config();
    const req = TH.incomingToolMessage({authHeader: undefined, url: 'http://example.com/'});
    const res = await checkToken(cfg, req, []);
    expect(res).toMatchObject({
      resourceMetadataUrl: 'http://example.com/.well-known/oauth-protected-resource/'
    });
  });

  it('should set Protected Resource Metadata URL to path matching the request path', async () => {
    const cfg = TH.config();
    const req = TH.incomingToolMessage({authHeader: undefined, url: 'http://example.com/some/path/here'});
    const res = await checkToken(cfg, req, []);
    expect(res).toMatchObject({
      resourceMetadataUrl: 'http://example.com/.well-known/oauth-protected-resource/some/path/here'
    });
  });

  it('should return NO_TOKEN when authorization header does not start with Bearer', async () => {
    const cfg = TH.config();
    const req = TH.incomingToolMessage({authHeader: 'foo'});
    const res = await checkToken(cfg, req, []);
    expect(res).toMatchObject({
      passes: false,
      problem: TokenProblem.NON_BEARER_AUTH_HEADER
    });
  });

  it('should return token data from client when token is valid', async () => {
    const tokenData = TH.tokenData();
    const cfg = TH.config({oAuthClient: TH.oAuthClient({introspectResult: tokenData})});
    const req = TH.incomingToolMessage({authHeader: 'Bearer test-access-token'});
    const res = await checkToken(cfg, req, []);
    expect(res).toMatchObject({
      passes: true
    });
    expect(res.token).toMatchObject(tokenData);
  });

  it('should pass charge parameter in introspection call when charge is passed', async () => {
    const oAuthClient = TH.oAuthClient();
    const cfg = TH.config({oAuthClient});
    const req = TH.incomingToolMessage({authHeader: 'Bearer test-access-token'});
    const res = await checkToken(cfg, req, [TH.oneCentCharge]);
    expect(oAuthClient.introspectToken).toHaveBeenCalledWith(
      'https://auth.paymcp.com',
      'test-access-token',
      {charge: '0.01'}
    );
    expect(oAuthClient.introspectToken).toHaveBeenCalledTimes(1);
  });

  it('should coalesce multiple charges into a single charge parameter', async () => {
    const oAuthClient = TH.oAuthClient();
    const cfg = TH.config({oAuthClient});
    const req = TH.incomingToolMessage({authHeader: 'Bearer test-access-token'});
    const res = await checkToken(cfg, req, [TH.oneCentCharge, TH.charge({amount: BigNumber(0.02)})]);
    expect(oAuthClient.introspectToken).toHaveBeenCalledWith(
      'https://auth.paymcp.com',
      'test-access-token',
      {charge: '0.03'}
    );
    expect(oAuthClient.introspectToken).toHaveBeenCalledTimes(1);
  });

  it('charges with multiple destinations should throw (the API should not allow this configuation)', async () => {
    const oAuthClient = TH.oAuthClient();
    const cfg = TH.config({oAuthClient});
    const req = TH.incomingToolMessage({authHeader: 'Bearer test-access-token'});
    const hetrogeneousCharges = [
      TH.oneCentCharge, 
      TH.charge({amount: BigNumber(0.02), destination: 'another-destination'})
    ];
    expect(() => checkToken(cfg, req, hetrogeneousCharges)).rejects.toThrow('Charges with multiple destinations are not allowed');
  });

  it('charges with multiple currencies should throw (the API should not allow this configuation)', async () => {
    const oAuthClient = TH.oAuthClient();
    const cfg = TH.config({oAuthClient});
    const req = TH.incomingToolMessage({authHeader: 'Bearer test-access-token'});
    const hetrogeneousCharges = [
      TH.oneCentCharge, 
      // We only support USDC today, but force a different currency for when we add more
      TH.charge({amount: BigNumber(0.02), currency: 'CAD' as Currency})
    ];
    expect(() => checkToken(cfg, req, hetrogeneousCharges)).rejects.toThrow('Charges with multiple currencies are not allowed');
  });

  it('charges with multiple networks should throw (the API should not allow this configuation)', async () => {
    const oAuthClient = TH.oAuthClient();
    const cfg = TH.config({oAuthClient});
    const req = TH.incomingToolMessage({authHeader: 'Bearer test-access-token'});
    const hetrogeneousCharges = [
      TH.oneCentCharge, 
      // We only support Solana today, but force a different network for when we add more
      TH.charge({amount: BigNumber(0.02), network: 'another-network' as Network})
    ];
    expect(() => checkToken(cfg, req, hetrogeneousCharges)).rejects.toThrow('Charges with multiple networks are not allowed');
  });
});