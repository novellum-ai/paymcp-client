import { describe, it, expect } from 'vitest';
import { generateJWT } from '../jwt';
import nacl from 'tweetnacl';
import { Keypair } from '@solana/web3.js';

function decodeB64Url(str: string) {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
}

describe('generateJWT', () => {
  it('should generate a valid JWT with default payload', async () => {
    const keypair = Keypair.generate();
    const walletId = keypair.publicKey.toBase58();
    const encryptionFunc = (msg: Uint8Array) => nacl.sign.detached(msg, keypair.secretKey);
    const jwt = await generateJWT(walletId, encryptionFunc);
    const [headerB64, payloadB64, signatureB64] = jwt.split('.');
    expect(headerB64).toBeDefined();
    expect(payloadB64).toBeDefined();
    expect(signatureB64).toBeDefined();
    const header = decodeB64Url(headerB64);
    const payload = decodeB64Url(payloadB64);
    expect(header.alg).toBe('EdDSA');
    expect(header.typ).toBe('JWT');
    expect(payload.sub).toBe(walletId);
    expect(payload.iss).toBe('paymcp.com');
    expect(payload.aud).toBe('https://api.paymcp.com');
    expect(typeof payload.iat).toBe('number');
    expect(payload.paymentIds).toBeUndefined();
    // Verify signature
    const signingInput = `${headerB64}.${payloadB64}`;
    const messageBytes = new TextEncoder().encode(signingInput);
    const signature = Buffer.from(signatureB64, 'base64url');
    const isValid = nacl.sign.detached.verify(messageBytes, signature, keypair.publicKey.toBytes());
    expect(isValid).toBe(true);
  });

  it('should include paymentIds if provided', async () => {
    const keypair = Keypair.generate();
    const walletId = keypair.publicKey.toBase58();
    const paymentIds = ['id1', 'id2'];
    const encryptionFunc = (msg: Uint8Array) => nacl.sign.detached(msg, keypair.secretKey);
    const jwt = await generateJWT(walletId, encryptionFunc, paymentIds);
    const [, payloadB64] = jwt.split('.');
    const payload = decodeB64Url(payloadB64);
    expect(payload.paymentIds).toEqual(paymentIds);
  });
}); 