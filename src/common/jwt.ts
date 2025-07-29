import type { CustomJWTPayload } from "./types.js";
import { SignJWT } from 'jose';

const ISSUER = 'paymcp.com';
const AUDIENCE = 'https://api.paymcp.com';

/**
 * Generate a JWT using the jose library and EdDSA (Ed25519) private key.
 * @param walletId - The subject (public key, wallet address, etc.)
 * @param privateKey - Ed25519 private key as a CryptoKey or JWK (object)
 * @param paymentIds - Optional array of payment IDs to include in the payload
 * @returns JWT string
 */
export const generateJWT = async (
  walletId: string,
  privateKey: CryptoKey | Uint8Array,
  paymentIds: string[],
  codeChallenge: string
): Promise<string> => {
  const payload: CustomJWTPayload = {
  };
  if (paymentIds && paymentIds.length > 0) payload.paymentIds = paymentIds;
  if (codeChallenge) payload.code_challenge = codeChallenge;

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'EdDSA', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(walletId)
    .setExpirationTime('2m')
    .sign(privateKey);
};