import { describe, it, expect } from 'vitest';
import { SolanaPaymentMaker } from './solanaPaymentMaker';
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";

describe('solanaPaymentMaker.generateJWT', () => {
  it('should generate a valid JWT with default payload', async () => {
    const keypair = Keypair.generate();
    const paymentMaker = new SolanaPaymentMaker('https://example.com', bs58.encode(keypair.secretKey));
    const jwt = await paymentMaker.generateJWT({});

    // JWT format: header.payload.signature (all base64url)
    const [headerB64, payloadB64, signatureB64] = jwt.split('.');
    expect(headerB64).toBeDefined();
    expect(payloadB64).toBeDefined();
    expect(signatureB64).toBeDefined();

    // Decode header and payload
    const decodeB64Url = (str: string) => {
      // Pad string for base64 decoding
      let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      return JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
    };
    const header = decodeB64Url(headerB64);
    const payload = decodeB64Url(payloadB64);

    expect(header.alg).toBe('EdDSA');
    expect(header.typ).toBe('JWT');
    expect(payload.sub).toBe(keypair.publicKey.toBase58());
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
    const paymentMaker = new SolanaPaymentMaker('https://example.com', bs58.encode(keypair.secretKey));
    const paymentIds = ['id1', 'id2'];
    const jwt = await paymentMaker.generateJWT({paymentIds});
    const [, payloadB64] = jwt.split('.');
    const decodeB64Url = (str: string) => {
      let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      return JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
    };
    const payload = decodeB64Url(payloadB64);
    expect(payload.paymentIds).toEqual(paymentIds);
  });
});

