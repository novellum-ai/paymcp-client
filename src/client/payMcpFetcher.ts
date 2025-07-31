import { BigNumber } from 'bignumber.js';
import { OAuthAuthenticationRequiredError, OAuthClient } from './oAuth.js';
import { PaymentRequestError } from '../common/paymentRequestError.js';
import { AccessToken, AuthorizationServerUrl, FetchLike, OAuthDb, PaymentRequestData, DEFAULT_AUTHORIZATION_SERVER } from '../common/types.js';
import type { PaymentMaker, ProspectivePayment } from './types.js';
import { getIsReactNative, createReactNativeSafeFetch } from './platform/index.js';

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
}

export class PayMcpFetcher {
  protected oauthClient: OAuthClient;
  protected paymentMakers: Map<string, PaymentMaker>;
  protected sideChannelFetch: FetchLike;
  protected db: OAuthDb;
  protected userId: string;
  protected allowedAuthorizationServers: AuthorizationServerUrl[];
  protected approvePayment: (payment: ProspectivePayment) => Promise<boolean>;

  constructor({
    userId,
    db,
    paymentMakers,
    fetchFn = fetch,
    sideChannelFetch = fetchFn,
    strict = true,
    allowInsecureRequests = process.env.NODE_ENV === 'development',
    allowedAuthorizationServers = [DEFAULT_AUTHORIZATION_SERVER],
    approvePayment = async (payment: ProspectivePayment): Promise<boolean> => { return payment.amount.lte(BigNumber(1)) }
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
      allowInsecureRequests
    });
    this.paymentMakers = new Map(Object.entries(paymentMakers));
    this.sideChannelFetch = safeSideChannelFetch;
    this.db = db;
    this.userId = userId;
    this.allowedAuthorizationServers = allowedAuthorizationServers;
    this.approvePayment = approvePayment;
  }

  protected handlePaymentRequestError = async (paymentRequestError: PaymentRequestError): Promise<boolean> => {
    if (!this.isAllowedAuthServer(paymentRequestError.paymentRequestUrl)) {
      console.log(`PayMCP: payment request is not allowed on this server`);
      return false;
    }

    const prRequest = await this.sideChannelFetch(paymentRequestError.paymentRequestUrl);
    if (!prRequest.ok) {
      throw new Error(`PayMCP: payment request failed: ${prRequest.status} ${prRequest.statusText}`);
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
    } catch (e) {
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
      // TODO: replace console.log with logger throughout /client
      console.log(`PayMCP: payment network ${requestedNetwork} not set up for this server (available networks: ${Array.from(this.paymentMakers.keys()).join(', ')})`);
      return false;
    }

    const prospectivePayment = {
      accountId: this.userId,
      resourceUrl: paymentRequest.resource?.toString() ?? '',
      resourceName: paymentRequest.resourceName ?? '',
      network: requestedNetwork,
      currency,
      amount
    };
    if (!await this.approvePayment(prospectivePayment)){
      console.log(`PayMCP: payment request denied by callback function`);
      return false;
    }

    const paymentId = await paymentMaker.makePayment(amount, currency, destination, paymentRequest.resourceName);
    console.log(`PayMCP: made payment of ${amount} ${currency} on ${requestedNetwork}: ${paymentId}`);

    const jwt = await paymentMaker.generateJWT({paymentIds: [paymentId]});

    // Make a fetch call to the authorization URL with the payment ID
    // redirect=false is a hack
    // The OAuth spec calls for the authorization url to return with a redirect, but fetch
    // on mobile will automatically follow the redirect (it doesn't support the redirect=manual option)
    // We want the redirect URL so we can extract the code from it, not the contents of the 
    // redirect URL (which might not even exist for agentic paymcp clients)
    //   So paymcp servers are set up to instead return a 200 with the redirect URL in the body
    // if we pass redirect=false.
    // TODO: Remove the redirect=false hack once we have a way to handle the redirect on mobile
    const response = await this.sideChannelFetch(paymentRequestError.paymentRequestUrl.toString(), {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${jwt}`
      }
    });

    console.log(`PayMCP: payment was successfully PUT to ${paymentRequestError.paymentRequestUrl}: ${response.ok}`);

    if(!response.ok) {
      const msg = `PayMCP: payment request failed: ${response.status} ${response.statusText}`;
      console.log(msg);
      throw new Error(msg);
    }

    return true;
  }

  protected isAllowedAuthServer = (url: string): boolean => {
    const urlObj = new URL(url);
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

    if (!this.isAllowedAuthServer(authorizationUrl.toString())) {
      throw new Error(`PayMCP: authorization server ${oauthError.url} is not allowed`);
    }

    const authToken = await paymentMaker.generateJWT({codeChallenge: codeChallenge});

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
        console.log(`PayMCP: got redirect authorization code response - redirect to ${location}`);
        return location;
      } else {
        console.log(`PayMCP: got redirect authorization code response, but no redirect URL in Location header`);
      }
    }
    // Handle the non-standard paymcp redirect=false hack
    if (response.ok) {
      // Handle the redirect manually
      const body = await response.json();
      const redirectUrl = body.redirect;
      if (redirectUrl) {
        console.log(`PayMCP: got response.ok authorization code response - redirect to ${redirectUrl}`);
        return redirectUrl;
      } else {
        console.log(`PayMCP: got authorization code response with response.ok, but no redirect URL in body`);
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
        console.log(`PayMCP: no token found for the current server - we can't exchange a token if we don't have one`);
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

  protected checkForPayMcpUrl = (text: string): void => {
    const paymentRequestUrl = /(http[^ ]+)\/payment-request\/([^ ]+)/.exec(text);
    if (paymentRequestUrl) {
      const id = paymentRequestUrl[2];
      const url = paymentRequestUrl[1] as AuthorizationServerUrl;
      if(this.isAllowedAuthServer(url)) {
        throw new PaymentRequestError(url as AuthorizationServerUrl, id);
      } else {
        console.log(`PayMCP: payment request error found in MCP response - ${url} - but the server is not an allowed paymcp authorization server`);
      }
    }
  }

  protected checkForPayMcpError = async (response: Response): Promise<void> => {
    const clonedResponse = response.clone();
    const body = await clonedResponse.json();

    // Handle PaymentRequestError
    if (body.isError && body.content.length > 0 && body.content[0].type === 'text') {
      const text = body.content[0].text;
      if (text.startsWith(PaymentRequestError.MESSAGE_PREAMBLE)) {
        this.checkForPayMcpUrl(text);
      }
    }
    // Handle Elicitations
    if (body.error && body.error.code === -32604 && body.error.data && body.error.data.elicitations) {
      const elicitations = body.error.data.elicitations;
      for (const elicitation of elicitations) {
        if (elicitation.mode === 'url') {
          this.checkForPayMcpUrl(elicitation.url);
        }
      }
    }
  }

  fetch: FetchLike = async (url, init) => {
    let response: Response | null = null;
    try {
      // Try to fetch the resource
      response = await this.oauthClient.fetch(url, init);
      await this.checkForPayMcpError(response);
      return response;
    } catch (error: unknown) {
      // If we get an OAuth authentication required error, handle it
      if (error instanceof OAuthAuthenticationRequiredError) {
        console.log(`OAuth authentication required - PayMCP client starting oauth flow for resource metadata ${error.resourceServerUrl}`);
        await this.authToService(error); 

        try {
          // Retry the request once - we should be auth'd now
          response = await this.oauthClient.fetch(url, init);
          await this.checkForPayMcpError(response);
          return response;
        } catch (authRetryError: unknown) {
          // If the retry throws, it might be because we needed to auth AND make a payment
          // In this case, we should still try to make a payment if the retry fails
          error = authRetryError;
        }
      }

      if (error instanceof PaymentRequestError) {
        console.log(`Payment request error - PayMCP client starting payment flow for payment request ${error.paymentRequestUrl}`);
        if(await this.handlePaymentRequestError(error)) {
          // Retry the request once - we should be auth'd now
          response = await this.oauthClient.fetch(url, init);
          await this.checkForPayMcpError(response);
        } else {
          console.log(`PayMCP: payment request was not completed successfully`);
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