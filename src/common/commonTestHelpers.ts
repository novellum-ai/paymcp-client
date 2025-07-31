import { Readable } from 'stream';
import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'http';
import { UrlString } from './types.js';
import { JSONRPCRequest, JSONRPCResponse, Result, CallToolResult, ContentBlock, JSONRPCError } from '@modelcontextprotocol/sdk/types.js';
import { PAYMENT_REQUIRED_ERROR_CODE, paymentRequiredError } from './paymentRequiredError';

export const DESTINATION = 'testDestination';
export const SOURCE = 'testSource';


export function mcpResponse({id = 1, result = mcpToolResult()}: {
  id?: number,
  result?: Result
} = {}): JSONRPCResponse {
  return { jsonrpc: "2.0" as const, id, result };
}

export function mcpToolResult({
    content = [{type: 'text', text: 'tool-result'}],
    structuredContent = undefined,
    isError = false
  }: {
    content?: ContentBlock[],
    structuredContent?: any,
    isError?: boolean,
  } = {}): CallToolResult {
    return {content, structuredContent, isError};
}

export function mcpToolErrorResponse({
  content = [{type: 'text', text: 'tool-error'}],
  structuredContent = undefined,
}: {
  content?: ContentBlock[],
  structuredContent?: any,
} = {}): JSONRPCResponse {
  const result = mcpToolResult({isError: true, content, structuredContent});
  return mcpResponse({result});
}

export function paymentRequiredMessage(paymentUrl: UrlString, id: string): string {
  const err = paymentRequiredError(paymentUrl, id);
  return err.message;
}

export function mcpErrorResponse({id = 1, code = -32000, message = 'test error', data = undefined} : {
  id?: number,
  code?: number,
  message?: string,
  data?: any
}): JSONRPCError {
  return {
    jsonrpc: '2.0' as const,
    id,
    error: { code, message, data }
  }
}

export function mcpElicitationRequiredErrorResponse({id = 1, message = 'test error', elicitationId = '123', url = 'https://paymcp.com/payment-request/123', data = {}} : {
  id?: number,
  message?: string,
  elicitationId?: string,
  url?: string
  data?: any
}): JSONRPCError {
  // Code as per https://github.com/modelcontextprotocol/modelcontextprotocol/pull/887
  const code = -32604;
  const elicitationData = {elicitations: [{mode: 'url', elicitationId, url}]}
  return mcpErrorResponse({id, code, message, data: {...data, ...elicitationData}});
}