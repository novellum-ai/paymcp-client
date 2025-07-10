import type { PaymentMaker } from './types.js';
import { Keypair, Connection, PublicKey, ComputeBudgetProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import { createTransfer, ValidateTransferError as _ValidateTransferError } from "@solana/pay";
import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";
import bs58 from "bs58";
import BigNumber from "bignumber.js";
import { generateJWT } from './jwt.js';
import { importJWK } from 'jose';

// this is a global public key for USDC on the solana mainnet
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

export const ValidateTransferError = _ValidateTransferError;

export class SolanaPaymentMaker implements PaymentMaker {
  private connection: Connection;
  private source: Keypair;

  constructor(solanaEndpoint: string, sourceSecretKey: string) {
    if (!solanaEndpoint) {
      throw new Error('Solana endpoint is required');
    }
    if (!sourceSecretKey) {
      throw new Error('Source secret key is required');
    }
    this.connection = new Connection(solanaEndpoint, { commitment: 'confirmed' });
    this.source = Keypair.fromSecretKey(bs58.decode(sourceSecretKey));
  }
  
  generateJWT = async(paymentIds?: string[]): Promise<string> => {
    // Solana/Web3.js secretKey is 64 bytes: 
    // first 32 bytes are the private scalar, last 32 are the public key.
    // JWK expects only the 32-byte private scalar for 'd'
    const jwk = {
      kty: 'OKP',
      crv: 'Ed25519',
      d: Buffer.from(this.source.secretKey.slice(0, 32)).toString('base64url'),
      x: Buffer.from(this.source.publicKey.toBytes()).toString('base64url'),
    };
    const privateKey = await importJWK(jwk, 'EdDSA');
    return generateJWT(this.source.publicKey.toBase58(), privateKey, paymentIds);
  }

  makePayment = async (amount: BigNumber, currency: string, receiver: string): Promise<string> => {
    if (currency !== 'usdc') {
      throw new Error('Only usdc currency is supported');
    }

    const receiverKey = new PublicKey(receiver);

    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: 10000,
    });
    
    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 20000,
    });
  
    let transaction = await createTransfer(
      this.connection,
      this.source.publicKey,
      {
        amount: amount,
        recipient: receiverKey,
        splToken: USDC_MINT,
      }
    );
    
    transaction.add(modifyComputeUnits);
    transaction.add(addPriorityFee);

    const transactionHash = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [this.source],
    );
    return transactionHash;
  }

  signBySource = async (requestId: string, transactionId: string): Promise<string> => {
    console.log("GENERATING SIGNATURE", requestId, transactionId, this.source.publicKey.toBase58());
    // https://solana.com/developers/cookbook/wallets/sign-message
    const messageBytes = naclUtil.decodeUTF8(requestId + transactionId);
    const signature = nacl.sign.detached(messageBytes, this.source.secretKey);
    const res = Buffer.from(signature).toString('base64');
    return res;
  }
}
