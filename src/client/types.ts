import { BigNumber } from "bignumber.js";
import { AuthorizationServerUrl, Currency, Logger, Network, UrlString } from "../common/types.js";
import { OAuthDb, FetchLike } from "../common/types.js";
import { ClientOptions } from "@modelcontextprotocol/sdk/client/index.js";
import { Implementation } from "@modelcontextprotocol/sdk/types.js";

type AccountPrefix = Network;
export type AccountIdString = `${AccountPrefix}${string}`;

export type Account = {
  accountId: string;
  paymentMakers: {[key: string]: PaymentMaker};
}

export type ProspectivePayment = {
  accountId: string;
  resourceUrl: string;
  toolName: string;
  network: Network;
  currency: Currency;
  amount: BigNumber;
}

export type ClientConfig = {
  mcpServer: UrlString;
  account: Account;
  allowedAuthorizationServers: AuthorizationServerUrl[];
  approvePayment: (payment: ProspectivePayment) => Promise<boolean>;
  oAuthDb: OAuthDb;
  fetchFn: FetchLike;
  oAuthChannelFetch: FetchLike;
  allowHttp: boolean;
  logger: Logger;
  clientInfo: Implementation;
  clientOptions: ClientOptions;
}

export interface PaymentMaker {
  makePayment: (amount: BigNumber, currency: string, receiver: string, resourceName?: string) => Promise<string>;
  generateJWT: (params: {paymentIds?: string[], codeChallenge?: string}) => Promise<string>;
}
