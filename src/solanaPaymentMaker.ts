import type { PaymentMaker, JWTPayload } from './types.js';
import { Keypair, Connection, PublicKey, ComputeBudgetProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import { createTransfer, ValidateTransferError as _ValidateTransferError } from "@solana/pay";
import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";
import bs58 from "bs58";
import BigNumber from "bignumber.js";

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
    // 1. Prepare JWT header and payload
    const header = { alg: 'EdDSA', typ: 'JWT' };
    const payload: JWTPayload = {
      sub: this.source.publicKey.toBase58(),
      iss: 'paymcp.com',
      aud: 'https://api.paymcp.com',
      iat: Math.floor(Date.now() / 1000),
    };
    if (paymentIds && paymentIds.length > 0) payload.paymentIds = paymentIds;
    // 2. Encode header and payload
    const enc = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const signingInput = `${enc(header)}.${enc(payload)}`;
    // 3. Sign with wallet
    const messageBytes = new TextEncoder().encode(signingInput);
    const signature = nacl.sign.detached(messageBytes, this.source.secretKey);

    // 4. Assemble JWT
    return `${signingInput}.${Buffer.from(signature).toString('base64url')}`;
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
