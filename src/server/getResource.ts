import { PayMcpConfig } from "./types.js";

export function getPath(url: URL): string {
  const fullPath = url.pathname.replace(/^\/$/, '');
  return fullPath;
}

export function getResource(config: PayMcpConfig, requestUrl: URL): URL {
  if (config.resource) {
    return new URL(config.resource);
  }
  const url = new URL(`${requestUrl.protocol}//${requestUrl.host}${requestUrl.pathname}`);

  const fullPath = getPath(url);
  // If this is a PRM path, conver the it into the path for the resource this is the metadata for
  const resourcePath = fullPath.replace('/.well-known/oauth-protected-resource', '').replace(/\/$/, '');

  const resource = new URL(`${requestUrl.protocol}//${requestUrl.host}${resourcePath}`);
  return resource;
}