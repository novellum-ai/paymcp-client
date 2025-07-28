import { BigNumber } from "bignumber.js";
import { AuthorizationServerUrl, Currency, Logger, Network, UrlString } from "../common/types.js";
import { OAuthDb, PaymentMaker } from "../types.js";
import { FetchLike } from "../types.js";
import { ClientOptions } from "@modelcontextprotocol/sdk/client/index.js";

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
  clientInfo: {
    name: string;
    version: string;
  };
  clientOptions: ClientOptions;
}