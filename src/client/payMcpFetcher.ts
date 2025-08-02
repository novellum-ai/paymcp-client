import { BigNumber } from 'bignumber.js';
import { OAuthAuthenticationRequiredError, OAuthClient } from './oAuth.js';
import { PAYMENT_REQUIRED_ERROR_CODE, paymentRequiredError } from '../common/paymentRequiredError.js';
import { AccessToken, AuthorizationServerUrl, FetchLike, OAuthDb, PaymentRequestData, DEFAULT_AUTHORIZATION_SERVER, Logger } from '../common/types.js';
import type { PaymentMaker, ProspectivePayment } from './types.js';
import { getIsReactNative, createReactNativeSafeFetch } from './platform/index.js';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import { parsePaymentRequests, parseMcpMessages } from '../common/mcpJson.js';
import { ConsoleLogger } from '../common/logger.js';

export interface PayMcpFetcherConfig {
  // TODO: Take an Account instead of userId and paymentMakers
  userId: string;
  db: OAuthDb;
  paymentMakers: {[key: string]: PaymentMaker};
  fetchFn?: FetchLike;
  sideChannelFetch?: FetchLike;
  strict?: boolean;
  allowInsecureRequests?: boolean;
  allowedAuthorizationServers?: AuthorizationServerUrl[];
  approvePayment?: (payment: ProspectivePayment) => Promise<boolean>;
  logger?: Logger;
}

export class PayMcpFetcher {
  protected oauthClient: OAuthClient;
  protected paymentMakers: Map<string, PaymentMaker>;
  protected sideChannelFetch: FetchLike;
  protected db: OAuthDb;
  protected userId: string;
  protected allowedAuthorizationServers: AuthorizationServerUrl[];
  protected approvePayment: (payment: ProspectivePayment) => Promise<boolean>;
  protected logger: Logger;
  constructor({
    userId,
    db,
    paymentMakers,
    fetchFn = fetch,
    sideChannelFetch = fetchFn,
    strict = true,
    allowInsecureRequests = process.env.NODE_ENV === 'development',
    allowedAuthorizationServers = [DEFAULT_AUTHORIZATION_SERVER],
    approvePayment = async (): Promise<boolean> => true,
    logger = new ConsoleLogger()
  }: PayMcpFetcherConfig) {
    // Use React Native safe fetch if in React Native environment
    const safeFetchFn = getIsReactNative() ? createReactNativeSafeFetch(fetchFn) : fetchFn;
    const safeSideChannelFetch = getIsReactNative() ? createReactNativeSafeFetch(sideChannelFetch) : sideChannelFetch;
    
    // PayMcpClient should never actually use the callback url - instead of redirecting the user to 
    // an authorization url which redirects back to the callback url, PayMcpClient posts the payment
    // directly to the authorization server, then does the token exchange itself
    this.oauthClient = new OAuthClient({
      userId,
      db,
      callbackUrl: 'http://localhost:3000/unused-dummy-paymcp-callback',
      isPublic: false,
      fetchFn: safeFetchFn,
      sideChannelFetch: safeSideChannelFetch,
      strict,
      allowInsecureRequests,
      logger: logger
    });
    this.paymentMakers = new Map(Object.entries(paymentMakers));
    this.sideChannelFetch = safeSideChannelFetch;
    this.db = db;
    this.userId = userId;
    this.allowedAuthorizationServers = allowedAuthorizationServers;
    this.approvePayment = approvePayment;
    this.logger = logger;
  }

  protected handlePaymentRequestError = async (paymentRequestError: McpError): Promise<boolean> => {
    if (paymentRequestError.code !== PAYMENT_REQUIRED_ERROR_CODE) {
      throw new Error(`PayMCP: expected payment required error (code ${PAYMENT_REQUIRED_ERROR_CODE}); got code ${paymentRequestError.code}`);
    }
    const paymentRequestUrl = (paymentRequestError.data as {paymentRequestUrl: string}|undefined)?.paymentRequestUrl;
    if (!paymentRequestUrl) {
      throw new Error(`PayMCP: payment requirement error does not contain a payment requirement URL`);
    }
    const paymentRequestId = (paymentRequestError.data as {paymentRequestId: string}|undefined)?.paymentRequestId;
    if (!paymentRequestId) {
      throw new Error(`PayMCP: payment requirement error does not contain a payment request ID`);
    }
    if (!this.isAllowedAuthServer(paymentRequestUrl)) {
      this.logger.info(`PayMCP: payment requirement is not allowed on this server`);
      return false;
    }

    const prRequest = await this.sideChannelFetch(paymentRequestUrl);
    if (!prRequest.ok) {
      throw new Error(`PayMCP: GET ${paymentRequestUrl} failed: ${prRequest.status} ${prRequest.statusText}`);
    }
    const paymentRequest = await prRequest.json() as PaymentRequestData;

    const requestedNetwork = paymentRequest.network;
    if (!requestedNetwork) {
      throw new Error(`Payment network not provided`);
    }

    const destination = paymentRequest.destination;
    if (!destination) {
      throw new Error(`destination not provided`);
    }

    let amount = new BigNumber(0);
    if (!paymentRequest.amount) {
      throw new Error(`amount not provided`);
    }
    try{
      amount = new BigNumber(paymentRequest.amount);
    } catch {
      throw new Error(`Invalid amount ${paymentRequest.amount}`);
    }
    if(amount.lte(0)) {
      throw new Error(`Invalid amount ${paymentRequest.amount}`);
    }

    const currency = paymentRequest.currency;
    if (!currency) {
      throw new Error(`Currency not provided`);
    }

    const paymentMaker = this.paymentMakers.get(requestedNetwork);
    if (!paymentMaker) {
      this.logger.info(`PayMCP: payment network ${requestedNetwork} not set up for this server (available networks: ${Array.from(this.paymentMakers.keys()).join(', ')})`);
      return false;
    }

    const prospectivePayment : ProspectivePayment = {
      accountId: this.userId,
      resourceUrl: paymentRequest.resource?.toString() ?? '',
      resourceName: paymentRequest.resourceName ?? '',
      network: requestedNetwork,
      currency,
      amount,
      iss: paymentRequest.iss ?? '',
    };
    if (!await this.approvePayment(prospectivePayment)){
      this.logger.info(`PayMCP: payment request denied by callback function`);
      return false;
    }

    const paymentId = await paymentMaker.makePayment(amount, currency, destination, paymentRequest.iss);
    this.logger.info(`PayMCP: made payment of ${amount} ${currency} on ${requestedNetwork}: ${paymentId}`);

    const jwt = await paymentMaker.generateJWT({paymentRequestId, codeChallenge: ''});

    // Make a fetch call to the authorization URL with the payment ID
    // redirect=false is a hack
    // The OAuth spec calls for the authorization url to return with a redirect, but fetch
    // on mobile will automatically follow the redirect (it doesn't support the redirect=manual option)
    // We want the redirect URL so we can extract the code from it, not the contents of the 
    // redirect URL (which might not even exist for agentic paymcp clients)
    //   So paymcp servers are set up to instead return a 200 with the redirect URL in the body
    // if we pass redirect=false.
    // TODO: Remove the redirect=false hack once we have a way to handle the redirect on mobile
    const response = await this.sideChannelFetch(paymentRequestUrl.toString(), {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transactionId: paymentId,
        network: requestedNetwork
      })
    });

    this.logger.debug(`PayMCP: payment was ${response.ok ? 'successfully' : 'not successfully'} PUT to ${paymentRequestUrl} : status ${response.status} ${response.statusText}`);

    if(!response.ok) {
      const msg = `PayMCP: payment to ${paymentRequestUrl} failed: HTTP ${response.status} ${await response.text()}`;
      this.logger.info(msg);
      throw new Error(msg);
    }

    return true;
  }

  protected isAllowedAuthServer = (url: string | URL): boolean => {
    const urlObj = typeof url === 'string' ? new URL(url) : url;
    const baseUrl = urlObj.origin as AuthorizationServerUrl;
    return this.allowedAuthorizationServers.includes(baseUrl);
  }

  protected makeAuthRequestWithPaymentMaker = async (oauthError: OAuthAuthenticationRequiredError, paymentMaker: PaymentMaker): Promise<string> => {
    const authorizationUrl = await this.oauthClient.makeAuthorizationUrl(
      oauthError.url, 
      oauthError.resourceServerUrl
    );

    const codeChallenge = authorizationUrl.searchParams.get('code_challenge');
    if (!codeChallenge) {
      throw new Error(`Code challenge not provided`);
    }

    if (!this.isAllowedAuthServer(authorizationUrl)) {
      throw new Error(`PayMCP: authorization server ${oauthError.url} is requesting to use ${authorizationUrl} which is not in the allowed list of authorization servers ${this.allowedAuthorizationServers.join(', ')}`);
    }

    const authToken = await paymentMaker.generateJWT({paymentRequestId: '', codeChallenge: codeChallenge});

    // Make a fetch call to the authorization URL with the payment ID
    // redirect=false is a hack
    // The OAuth spec calls for the authorization url to return with a redirect, but fetch
    // on mobile will automatically follow the redirect (it doesn't support the redirect=manual option)
    // We want the redirect URL so we can extract the code from it, not the contents of the 
    // redirect URL (which might not even exist for agentic paymcp clients)
    //   So paymcp servers are set up to instead return a 200 with the redirect URL in the body
    // if we pass redirect=false.
    // TODO: Remove the redirect=false hack once we have a way to handle the redirect on mobile
    const response = await this.sideChannelFetch(authorizationUrl.toString()+'&redirect=false', {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    // Check if we got a redirect response (301, 302, etc.) in case the server follows 
    // the OAuth spec
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location');
      if (location) {
        this.logger.info(`PayMCP: got redirect authorization code response - redirect to ${location}`);
        return location;
      } else {
        this.logger.info(`PayMCP: got redirect authorization code response, but no redirect URL in Location header`);
      }
    }
    // Handle the non-standard paymcp redirect=false hack
    if (response.ok) {
      // Handle the redirect manually
      const body = await response.json();
      const redirectUrl = body.redirect;
      if (redirectUrl) {
        this.logger.info(`PayMCP: got response.ok authorization code response - redirect to ${redirectUrl}`);
        return redirectUrl;
      } else {
        this.logger.info(`PayMCP: got authorization code response with response.ok, but no redirect URL in body`);
      }
    }

    // If we didn't get a redirect, throw an error
    throw new Error(`Expected redirect response from authorization URL, got ${response.status}`);
  }

  protected authToService = async (error: OAuthAuthenticationRequiredError): Promise<void> => {
    // TODO: We need to generalize this - we can't assume that there's a single paymentMaker for the auth flow. 
    if (this.paymentMakers.size > 1) {
      throw new Error(`PayMCP: multiple payment makers found - cannot determine which one to use for auth`);
    }

    const paymentMaker = Array.from(this.paymentMakers.values())[0];
    if (paymentMaker) {
      // We can do the full OAuth flow - we'll generate a signed JWT and call /authorize on the
      // AS to get a code, then exchange the code for an access token
      const redirectUrl = await this.makeAuthRequestWithPaymentMaker(error, paymentMaker);
      // Handle the OAuth callback
      await this.oauthClient.handleCallback(redirectUrl);
    } else {
      // Else, we'll see if we've already got an OAuth token from OUR caller (if any). 
      // If we do, we'll use it to auth to the downstream resource
      // (In pass-through scenarios, the payMcpServer() middleware stores the incoming
      // token in the DB under the '' resource URL).
      const existingToken = await this.db.getAccessToken(this.userId, '');
      if (!existingToken) {
        this.logger.info(`PayMCP: no token found for the current server - we can't exchange a token if we don't have one`);
        throw error;
      }
      const newToken = await this.exchangeToken(existingToken, error.resourceServerUrl);
      this.db.saveAccessToken(this.userId, error.resourceServerUrl, newToken);
    }
  }

  protected exchangeToken = async (myToken: AccessToken, newResourceUrl: string): Promise<AccessToken> => {
    // TODO: Do token-exchange rather than passing through our own token
    const token = Object.assign({}, myToken);
    token.resourceUrl = newResourceUrl;
    return token;
  }

  protected checkForPayMcpResponse = async (response: Response): Promise<void> => {
    const clonedResponse = response.clone();
    const body = await clonedResponse.text();
    if (body.length === 0) {
      return;
    }

    let paymentRequests: {url: AuthorizationServerUrl, id: string}[] = [];
    try {
      const json = JSON.parse(body);
      const messages = await parseMcpMessages(json);
      paymentRequests = messages.flatMap(message => parsePaymentRequests(message)).filter(pr => pr !== null);
    } catch (error) {
      this.logger.error(`PayMCP: error checking for payment requirements in MCP response: ${error}`);
      this.logger.debug(body);
    }

    if(paymentRequests.length > 1) {
      throw new Error(`PayMCP: multiple payment requirements found in MCP response. The client does not support multiple payment requirements. ${paymentRequests.map(pr => pr.url).join(', ')}`);
    }
    for (const {url, id} of paymentRequests) {
      this.logger.info(`PayMCP: payment requirement found in MCP response - ${url} - throwing payment required error`);
      throw paymentRequiredError(url, id);
    }
  }

  fetch: FetchLike = async (url, init) => {
    let response: Response | null = null;
    try {
      // Try to fetch the resource
      response = await this.oauthClient.fetch(url, init);
      await this.checkForPayMcpResponse(response);
      return response;
    } catch (error: unknown) {
      // If we get an OAuth authentication required error, handle it
      if (error instanceof OAuthAuthenticationRequiredError) {
        this.logger.info(`OAuth authentication required - PayMCP client starting oauth flow for resource metadata ${error.resourceServerUrl}`);
        await this.authToService(error); 

        // Retry the request once - we should be auth'd now
        response = await this.oauthClient.fetch(url, init);
        await this.checkForPayMcpResponse(response);
        return response;
      }

      const mcpError = error instanceof McpError ? error : null;
      if (mcpError && mcpError.code === PAYMENT_REQUIRED_ERROR_CODE) {
        if(await this.handlePaymentRequestError(mcpError)) {
          // Retry the request once - we should be auth'd now
          response = await this.oauthClient.fetch(url, init);
          await this.checkForPayMcpResponse(response);
        } else {
          this.logger.info(`PayMCP: payment request was not completed successfully`);
        }
        if(response) {
          return response;
        } else {
          throw new Error(`PayMCP: no response was generated by the fetch`);
        }
      }
      
      // If it's not an authentication or payment error, rethrow
      throw error;
    }
  }
}