import { PayMcpConfig, ProtectedResourceMetadata } from "./types.js";
import { IncomingMessage, ServerResponse } from "http";

export function sendProtectedResourceMetadata(res: ServerResponse, metadata: ProtectedResourceMetadata) {
  res.setHeader('Content-Type', 'application/json');
  res.writeHead(200);
  res.end(JSON.stringify(metadata));
}

export function getProtectedResourceMetadata(config: PayMcpConfig, req: IncomingMessage): ProtectedResourceMetadata | null {
  const url = new URL(req.url || '');
  const protocol = url.protocol;
  const host = url.host;
  const fullPath = url.pathname.replace(/^\/$/, '');

  if (isProtectedResourceMetadataRequest(config, fullPath)) {
    const resourcePath = fullPath.replace('/.well-known/oauth-protected-resource', '').replace(/\/$/, '');
    const resource = `${protocol}//${host}${resourcePath}`;
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

function isProtectedResourceMetadataRequest(config: PayMcpConfig, path: string): boolean {
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