import { BigNumber } from "bignumber.js";
import { Logger } from "../common/types.js";
import { OAuthDb, PaymentMaker, TokenData } from "../types.js";
import { FetchLike } from "../types.js";
import * as mcp from '@modelcontextprotocol/sdk';
import { Network, Currency } from "../common/types.js";

export type UrlString = `http://${string}` | `https://${string}`;
export type AuthorizationServerUrl = UrlString;
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
  clientInfo: mcp.Implementation;
  clientOptions: mcp.ClientOptions;
}