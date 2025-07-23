import { IncomingMessage } from "node:http";
import getRawBody from "raw-body";
import contentType from "content-type";
import { JSONRPCMessage, JSONRPCMessageSchema, JSONRPCRequest, isJSONRPCRequest } from "@modelcontextprotocol/sdk/types.js";
import { ZodError } from "zod";
import { PayMcpConfig } from "./types.js";

// Useful reference for dealing with low-level http requests:
// https://github.com/modelcontextprotocol/typescript-sdk/blob/c6ac083b1b37b222b5bfba5563822daa5d03372e/src/server/streamableHttp.ts#L375

// Using the same value as MCP SDK
const MAXIMUM_MESSAGE_SIZE = "4mb";

export async function parseMcpRequests(config: PayMcpConfig, requestUrl: URL, req: IncomingMessage, parsedBody?: any): Promise<JSONRPCRequest[]> {
  if (!req.method) {
    return [];
  }
  const isPost = req.method.toLowerCase() === 'post';
  if (!isPost) {
    return [];
  }

  // The middleware has to be mounted at the root to serve the protected resource metadata,
  // but the actual MCP server it's controlling is specified by the mountPath.
  let path = requestUrl.pathname;
  if (!path) {
    path = '/';
  }
  const mountPath = config.mountPath ?? '/';
  if (!path.startsWith(mountPath)) {
    return [];
  }

  parsedBody = parsedBody ?? await parseBody(req);
  let messages: JSONRPCMessage[];

  try {
    // handle batch and single messages
    if (Array.isArray(parsedBody)) {
      messages = parsedBody.map(msg => JSONRPCMessageSchema.parse(msg));
    } else {
      messages = [JSONRPCMessageSchema.parse(parsedBody)];
    }
  } catch (error) {
    // If Zod validation fails, log the error and return empty array
    if (error instanceof ZodError) {
      config.logger.warn(`Invalid JSON-RPC message format`);
      config.logger.debug(error.message);
    } else {
      config.logger.error(`Unexpected error parsing JSON-RPC messages: ${error}`);
    }
    return [];
  }

  const requests = messages.filter(msg => isJSONRPCRequest(msg));
  if (requests.length !== messages.length) {
    config.logger.debug(`Dropped ${messages.length - requests.length} MCP messages that were not MCP requests`);
  }

  return requests;
}

export async function parseBody(req: IncomingMessage): Promise<unknown> {
  try {
    const ct = req.headers["content-type"];

    let encoding = "utf-8";
    if (ct) {
      const parsedCt = contentType.parse(ct);
      encoding = parsedCt.parameters.charset ?? "utf-8";
    }
  
    const body = await getRawBody(req, {
      limit: MAXIMUM_MESSAGE_SIZE,
      encoding,
    });
    return JSON.parse(body.toString());
  } catch (error) {
    console.error(error);
    return undefined;
  }
}