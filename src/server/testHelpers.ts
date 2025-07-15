import { Readable } from 'stream';
import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'http';
import { JSONRPCRequest } from '@modelcontextprotocol/sdk/types.js';
import { OAuthResourceClient } from '../oAuthResource.js';
import { vi } from 'vitest';
import { Charge, PayMcpConfig, Currency, Network, TokenCheck, TokenCheckPass, TokenCheckFail, TokenProblem, McpMethod, McpName } from './types.js';
import { DEFAULT_CONFIG } from './index.js';
import { TokenData } from '../types.js';
import { Logger } from '../logger.js';
import { BigNumber } from 'bignumber.js';

export const DESTINATION = 'testDestination';

export function charge({
    amount = BigNumber(0.01),
    currency = 'USDC',
    network = 'solana',
    destination = DESTINATION
  }: {
    amount?: BigNumber,
    currency?: Currency,
    network?: Network,
    destination?: string
  } = {}): Charge {

  return { amount, currency, network, destination };
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

export function config({
  toolPrice = BigNumber(0.01), 
  destination = DESTINATION, 
  ...rest}: Partial<PayMcpConfig> = {}): PayMcpConfig {

  return { ...DEFAULT_CONFIG, toolPrice, destination, logger: logger(), ...rest };
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
    url = 'https://example.com/', 
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
    url = 'https://example.com/',
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

export function oAuthClient({introspectResult = tokenData()}: {introspectResult?: TokenData} = {}): OAuthResourceClient {
  return {
    introspectToken: vi.fn().mockResolvedValue(introspectResult)
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
  token = tokenData(),
  passes = true,
  problem = TokenProblem.NO_TOKEN,
  resourceMetadataUrl = 'https://example.com/.well-known/oauth-protected-resource'
} : {
  token?: TokenData,
  passes?: boolean,
  problem?: TokenProblem,
  resourceMetadataUrl?: string
} = {}): TokenCheck {
  if (passes) {
    return {
      passes,
      token,
    } as TokenCheckPass;
  } else {
    return {
      passes,
      token,
      problem,
      resourceMetadataUrl
    } as TokenCheckFail;
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