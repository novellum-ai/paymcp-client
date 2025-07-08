import { Request } from "express";
import { McpOperation } from "./types.js";

export function getMcpOperation(req: Request, mountPath: string): McpOperation | null {
  if (!req.path.startsWith(mountPath)) {
    return null;
  }
  const isMessage = req.method.toLowerCase() === 'post';

  if (!isMessage) {
    return null;
  } else {
    // Get the operation from the jsonRpc message
    let op = req.body.method;
    const toolName = req.body.params?.name;
    if (toolName) {
      op = `${op}:${toolName}`
    }
    if (!op) {
      return null;
    }
    return op;
  }
}