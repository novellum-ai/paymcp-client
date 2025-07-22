import { PaymentServer, Network, Currency, AuthorizationServerUrl, ChargeResponse } from "./types.js";
import { FetchLike, OAuthDb } from "../types.js";

export class PayMcpPaymentServer implements PaymentServer {
  constructor(
    private readonly server: AuthorizationServerUrl, 
    private readonly oAuthDb: OAuthDb, 
    private readonly fetchFn: FetchLike = fetch) {
  }

  charge = async({source, destination, network, currency, amount}: 
    {source: string, destination: string, network: Network, currency: Currency, amount: BigNumber}): Promise<ChargeResponse> => {
    const body = {source, destination, network, currency, amount};
    const chargeResponse = await this.makeRequest('POST', '/charge', body);
    const json = await chargeResponse.json() as any;
    if (chargeResponse.status === 200) {
      return {success: true, requiredPayment: null};
    } else if (chargeResponse.status === 402) {
      return {success: false, requiredPayment: json};
    } else {
      throw new Error(`Unexpected status code ${chargeResponse.status} from payment server POST /charge endpoint`);
    }
  }

  createPaymentRequest = async({source, destination, network, currency, amount, resource}: 
    {source: string, destination: string, network: Network, currency: Currency, amount: BigNumber, resource: string}): Promise<string> => {
    const body = {source, destination, network, currency, amount, resource};
    const response = await this.makeRequest('POST', '/payment-request', body);
    const json = await response.json() as any;
    if (response.status !== 200) {
      throw new Error(`POST /payment-request responded with unexpected HTTP status ${response.status}`); 
    }
    if(!json.id) {
      throw new Error(`POST /payment-request response did not contain an id`);
    }
    return json.id; 
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