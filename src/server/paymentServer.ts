import { ConsoleLogger } from "../logger.js";
import { SqliteOAuthDb } from "../oAuthDb.js";
import { PayMcpConfig, PaymentServer, Network, Currency, AuthorizationServerUrl } from "./types.js";
import { FetchLike, OAuthDb } from "../types.js";
import { Logger } from "../logger.js";
import { getCharge } from "./charge.js";
import { checkToken } from "./token.js";
import { sendOAuthChallenge } from "./oAuthChallenge.js";
import { getRefunds, processRefunds } from "./refund.js";
import { parseMcpRequests } from "./http.js";
import { Request, Response, NextFunction } from "express";
import { getProtectedResourceMetadata as getPRMResponse, sendProtectedResourceMetadata } from "./protectedResourceMetadata.js";

export class PayMcpPaymentServer implements PaymentServer {
  constructor(private readonly server: AuthorizationServerUrl, private readonly oAuthDb: OAuthDb, private readonly fetchFn: FetchLike = fetch) {}

  charge = async({source, destination, network, currency, amount}: 
    {source: string, destination: string, network: Network, currency: Currency, amount: BigNumber}): Promise<boolean> => {
    const body = {source, destination, network, currency, amount};
    const chargeResponse = await this.makeRequest('/charge', 'POST', body);
    const res = await chargeResponse.json();
    if(!chargeResponse.ok) {
      this.logger.error(`Failed to charge: ${res.error}`);
      throw new Error(`Failed to charge: ${res.error}`);
    }
    return res.success;
  }

  createPaymentRequest = async({source, destination, network, currency, amount, resource}: 
    {source: string, destination: string, network: Network, currency: Currency, amount: BigNumber, resource: string}): Promise<string> => {
    const body = {source, destination, network, currency, amount, resource};
    const createPaymentRequestResponse = await this.makeRequest('/payment-request', 'POST', body);
    const res = await createPaymentRequestResponse.json();
    if(!createPaymentRequestResponse.ok) {
      throw new Error(`Failed to create payment request: ${res.error}`);
    }
    if(!res.id) {
      throw new Error(`Failed to create payment request: ${JSON.stringify(res)}`);
    }
    return res.id;
  }

  protected makeRequest = async(method: 'GET' | 'POST', path: string, body: any): Promise<Response> => {
    const url = new URL(path, this.server);
    const credentials = await this.oAuthDb.getClientCredentials(this.server);
    if(!credentials) {
      throw new Error('No client credentials found');
    }
    const response = await this.fetchFn(url, {
      method,
      headers: {
        'Authorization': `Bearer ${credentials.clientSecret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    return response;
  }
}