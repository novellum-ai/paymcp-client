export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export type Logger = {
  debug: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

export type UrlString = `http://${string}` | `https://${string}`;
export type AuthorizationServerUrl = UrlString;

export type Currency = 'USDC';
export type Network = 'solana';

export type PaymentRequestData = {
  amount: BigNumber;
  currency: Currency;
  network: Network;
  destination: string;
  source: string;
  resource: URL;
  resourceName: string;
}


export type CustomJWTPayload = {
  paymentIds?: string[];
  // TODO: Change to codeChallenge - we'll also need to update the validation in 
  // paymcp's payment-request-put handler
  code_challenge?: string;
}

export type ClientCredentials = {
  clientId: string,
  clientSecret: string,
  redirectUri: string
};

export type PKCEValues = {
  codeVerifier: string,
  codeChallenge: string,
  resourceUrl: string,
  url: string
};

export type AccessToken = {
  accessToken: string,
  refreshToken?: string,
  expiresAt?: number,
  resourceUrl: string
};

export interface OAuthResourceDb {
  getClientCredentials(serverUrl: string): Promise<ClientCredentials | null>;
  saveClientCredentials(serverUrl: string, credentials: ClientCredentials): Promise<void>;
  close(): Promise<void>;
}

export interface OAuthDb extends OAuthResourceDb {
  getPKCEValues(userId: string, state: string): Promise<PKCEValues | null>;
  savePKCEValues(userId: string, state: string, values: PKCEValues): Promise<void>;
  getAccessToken(userId: string, url: string): Promise<AccessToken | null>;
  saveAccessToken(userId: string, url: string, token: AccessToken): Promise<void>;
}

export type TokenData = {
  active: boolean,
  scope?: string,
  sub?: string,
  aud?: string|string[],
}

// This should match MCP SDK's version, however they don't export it
export type FetchLike = (url: string | URL, init?: RequestInit) => Promise<Response>;

export type RequirePaymentConfig = {
  price: BigNumber;
  getExistingPaymentId?: () => Promise<string | null>;
}
