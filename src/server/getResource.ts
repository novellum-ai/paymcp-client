import { PayMcpConfig } from "./types.js";
import { IncomingMessage } from "http";

export function getPath(req: IncomingMessage): string {
  const url = new URL(req.url || '');
  const fullPath = url.pathname.replace(/^\/$/, '');
  return fullPath;
}

export function getResource(config: PayMcpConfig, req: IncomingMessage): string {
  if (config.resource) {
    return config.resource;
  }
  const url = new URL(req.url || '');
  const protocol = url.protocol;
  const host = url.host;

  const fullPath = getPath(req);
  // If this is a PRM path, conver the it into the path for the resource this is the metadata for
  const resourcePath = fullPath.replace('/.well-known/oauth-protected-resource', '').replace(/\/$/, '');

  const resource = `${protocol}//${host}${resourcePath}`;
  return resource;
}