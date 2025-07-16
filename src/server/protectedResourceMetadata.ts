import { PayMcpConfig, ProtectedResourceMetadata } from "./types.js";
import { IncomingMessage, ServerResponse } from "http";

export function sendProtectedResourceMetadata(res: ServerResponse, metadata: ProtectedResourceMetadata | null): boolean {
  if (!metadata) {
    return false;
  }
  res.setHeader('Content-Type', 'application/json');
  res.writeHead(200);
  res.end(JSON.stringify(metadata));
  return true;
}

function getPath(req: IncomingMessage): string {
  const url = new URL(req.url || '');
  const fullPath = url.pathname.replace(/^\/$/, '');
  return fullPath;
}

export function getResource(req: IncomingMessage): string {
  const url = new URL(req.url || '');
  const protocol = url.protocol;
  const host = url.host;

  const fullPath = getPath(req);
  // If this is a PRM path, conver the it into the path for the resource this is the metadata for
  const resourcePath = fullPath.replace('/.well-known/oauth-protected-resource', '').replace(/\/$/, '');

  const resource = `${protocol}//${host}${resourcePath}`;
  return resource;
}

export function getProtectedResourceMetadata(config: PayMcpConfig, req: IncomingMessage): ProtectedResourceMetadata | null {
  if (isProtectedResourceMetadataRequest(config, req)) {
    const resource = getResource(req);
    return {
      resource,
      resource_name: config.payeeName || resource,
      authorization_servers: [config.server],
      bearer_methods_supported: ['header'],
      scopes_supported: ['read', 'write'],
    };
  }
  return null;
}

function isProtectedResourceMetadataRequest(config: PayMcpConfig, req: IncomingMessage): boolean {
  const path = getPath(req);
  if (!path.startsWith('/.well-known/oauth-protected-resource')) {
    return false;
  }
  const resourcePath = path.replace('/.well-known/oauth-protected-resource', '').replace(/\/$/, '');
  const mountPath = config.mountPath.replace(/\/$/, '');
  if (resourcePath === mountPath) {
    return true;
  }
  if (resourcePath === `${mountPath}/message`) {
    return true;
  }
  return false;
}