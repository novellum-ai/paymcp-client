import type { JWTPayload } from "./types";

const ISSUER = 'paymcp.com';
const AUDIENCE = 'https://api.paymcp.com';

const encodeObject = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url');

export const generateJWT = async(walletId: string, encryptionFunc: (message: Uint8Array) => Uint8Array, paymentIds?: string[]): Promise<string> => {
    // 1. Prepare JWT header and payload
    const header = { alg: 'EdDSA', typ: 'JWT' };
    
    const payload: JWTPayload = {
      sub: walletId,
      iss: ISSUER,
      aud: AUDIENCE,
      iat: Math.floor(Date.now() / 1000),
    };
    if (paymentIds && paymentIds.length > 0) payload.paymentIds = paymentIds;

    const signingInput = `${encodeObject(header)}.${encodeObject(payload)}`;
    const messageBytes = new TextEncoder().encode(signingInput);
    const signature = encryptionFunc(messageBytes);

    // 4. Assemble JWT
    return `${signingInput}.${Buffer.from(signature).toString('base64url')}`;
  }