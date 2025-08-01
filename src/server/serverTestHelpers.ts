/* eslint-disable @typescript-eslint/no-explicit-any */
import { Readable } from 'stream';
import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'http';
import { JSONRPCRequest } from '@modelcontextprotocol/sdk/types.js';
import { OAuthResourceClient } from '../common/oAuthResource.js';
import { vi } from 'vitest';
import { Charge, PayMcpConfig, TokenCheck, TokenCheckPass, TokenCheckFail, TokenProblem, McpMethod, McpName, PaymentServer } from './types.js';
import { TokenData } from '../common/types.js';
import { Logger, Currency, Network } from '../common/types.js';
import { buildServerConfig } from './payMcpServer.js';
import { BigNumber } from 'bignumber.js';
import * as oauth from 'oauth4webapi';

export const DESTINATION = 'testDestination';
export const SOURCE = 'testSource';

export function charge({
    amount = BigNumber(0.01),
    currency = 'USDC',
    network = 'solana',
    destination = DESTINATION,
    source = SOURCE
  }: {
    amount?: BigNumber,
    currency?: Currency,
    network?: Network,
    destination?: string,
    source?: string
  } = {}): Charge {

  return { amount, currency, network, destination, source };
}

export const oneCentCharge = charge({amount: BigNumber(0.01)});

export const zeroCharge = charge({amount: BigNumber(0)});

export function logger(): Logger {
  return {
    debug: vi.fn().mockImplementation((msg: string) => {console.debug(msg)}),
    info: vi.fn().mockImplementation((msg: string) => {console.info(msg)}),
    warn: vi.fn().mockImplementation((msg: string) => {console.warn(msg)}),
    error: vi.fn().mockImplementation((msg: string) => {console.error(msg)}),
  };
}

export function config(args: Partial<PayMcpConfig> = {}): PayMcpConfig {
  return buildServerConfig({...args, destination: args.destination ?? DESTINATION});
}

export function paymentServer({
  charge = vi.fn().mockResolvedValue({success: true, requiredPaymentId: null}),
  createPaymentRequest = vi.fn().mockResolvedValue('test-payment-request-id')
} = {}) : PaymentServer {
  return {
    charge,
    createPaymentRequest,
  } as unknown as PaymentServer;
}

export function mcpRequest({method = 'tools/call', params = {}, id = 'call-1'}: {
  method?: McpMethod,
  params?: any,
  id?: string
} = {}): JSONRPCRequest {

  return { jsonrpc: "2.0" as const, method, params, id };
}

export function mcpToolRequest({
    toolName = 'testTool', 
    args = {paramOne: 'test'},
  }: {
    toolName?: McpName,
    args?: any,
  } = {}): JSONRPCRequest {

  return mcpRequest({method: 'tools/call', params: {name: toolName, arguments: args}});
}

export function incomingMessage({
    body = {},
    method = 'POST', 
    url = '/', 
    headers = {'content-type': 'application/json'}
  } : {
    body?: any,
    method?: 'POST' | 'GET' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS', 
    url?: string, 
    headers?: IncomingHttpHeaders
  } = {}): IncomingMessage {

  const bodyString = JSON.stringify(body);
  const stream = new Readable({
    read() {
      this.push(bodyString);
      this.push(null);
    }
  }) as IncomingMessage;
  stream.method = method;
  stream.url = url;
  stream.headers = headers;
  return stream;
}

export function incomingToolMessage({
    authHeader = undefined,
    url = '/',
  }: {
    authHeader?: string,
    url?: string,
  } = {}): IncomingMessage {

  return incomingMessage({
    body: mcpToolRequest({toolName: 'testTool'}), 
    headers: {'authorization': authHeader, 'content-type': 'application/json'},
    url
  });
}

export function oAuthClient({
  introspectResult = tokenData(),
  authorizationServer = {
    issuer: 'https://auth.paymcp.com',
  }
}: {
  introspectResult?: TokenData
  authorizationServer?: oauth.AuthorizationServer
} = {}): OAuthResourceClient {
  return {
    introspectToken: vi.fn().mockResolvedValue(introspectResult),
    authorizationServerFromUrl: vi.fn().mockResolvedValue(authorizationServer)
  } as unknown as OAuthResourceClient;
}

export function tokenData({
    active = true, 
    sub = 'test-user', 
    scope = 'tools:read', 
    aud = 'https://example.com'
  }: Partial<TokenData> = {}): TokenData {

  return { active, sub, scope, aud }
}

export function tokenCheck({
  data = tokenData(),
  token = 'test-token',
  passes = true,
  problem = TokenProblem.NO_TOKEN,
  resourceMetadataUrl = 'https://example.com/.well-known/oauth-protected-resource'
} : {
  data?: TokenData,
  token?: string | null,
  passes?: boolean,
  problem?: TokenProblem,
  resourceMetadataUrl?: string
} = {}): TokenCheck {
  if (passes) {
    return { passes, token, data, } as TokenCheckPass;
  } else {
    return { passes, token, data, problem, resourceMetadataUrl } as TokenCheckFail;
  }
}

export function serverResponse(): ServerResponse {
  return {
    getHeader: vi.fn(),
    setHeader: vi.fn(),
    writeHead: vi.fn(),
    end: vi.fn(),
  } as unknown as ServerResponse;
}