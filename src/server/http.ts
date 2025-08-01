import { IncomingMessage } from "node:http";
import getRawBody from "raw-body";
import contentType from "content-type";
import { JSONRPCRequest, isJSONRPCRequest } from "@modelcontextprotocol/sdk/types.js";
import { PayMcpConfig } from "./types.js";
import { parseMcpMessages } from "../common/mcpJson.js";

// Useful reference for dealing with low-level http requests:
// https://github.com/modelcontextprotocol/typescript-sdk/blob/c6ac083b1b37b222b5bfba5563822daa5d03372e/src/server/streamableHttp.ts#L375

// Using the same value as MCP SDK
const MAXIMUM_MESSAGE_SIZE = "4mb";

export async function parseMcpRequests(config: PayMcpConfig, requestUrl: URL, req: IncomingMessage, parsedBody?: any): Promise<JSONRPCRequest[]> {
  if (!req.method) {
    return [];
  }
  if (req.method.toLowerCase() !== 'post') {
    return [];
  }

  // The middleware has to be mounted at the root to serve the protected resource metadata,
  // but the actual MCP server it's controlling is specified by the mountPath.
  const path = requestUrl.pathname.replace(/\/$/, '');
  const mountPath = config.mountPath.replace(/\/$/, '');
  if (path !== mountPath && path !== `${mountPath}/message`) {
    config.logger.debug(`Request path (${path}) does not match the mountPath (${mountPath}), skipping MCP middleware`);
    return [];
  }

  parsedBody = parsedBody ?? await parseBody(req);
  const messages = await parseMcpMessages(parsedBody, config.logger);
  
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