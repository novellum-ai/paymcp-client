import { FetchMock } from 'fetch-mock';
import { PaymentRequestError } from '../common/paymentRequestError.js';
import { DEFAULT_AUTHORIZATION_SERVER } from '../common/types.js';

export function mockResourceServer(mock: FetchMock, baseUrl: string = 'https://example.com', resourcePath: string = '/mcp', authServerUrl: string = DEFAULT_AUTHORIZATION_SERVER) {
  mock.route({
    name: `${baseUrl}/.well-known/oauth-protected-resource${resourcePath}`,
    url: `${baseUrl}/.well-known/oauth-protected-resource${resourcePath}`,
    response: {
      body: {
        resource: baseUrl + resourcePath,
        authorization_servers: [authServerUrl]
      }
    }
  });
  return mock;
}

export function payMcpErrorResponse(paymentRequestUrl: string) {
  return {
    status: 200,
    body: { 
      jsonrpc: "2.0",
      id: 1,
      content: [
        {
          type: 'text',
          text: `${PaymentRequestError.MESSAGE_PREAMBLE} Please pay at: ${paymentRequestUrl}`
        }
      ],
      isError: true
    }
  }
}

export function elicitationResponse(paymentRequestUrl: string) {
  // Based on the (still-unmerged) proposal in https://github.com/modelcontextprotocol/modelcontextprotocol/pull/887
  return { 
    jsonrpc: "2.0",
    id: 1,
    error: {
      code: -32604, // ELICITATION_REQUIRED
      message: "This request requires more information.",
      data: {
        elicitations: [
          {
            mode: "url",
            elicitionId: "test-payment-request-id",
            url: paymentRequestUrl,
            message: "This request requires more information."
          }
        ]
      }
    }
  };
}

export function mockAuthorizationServer(mock: FetchMock, baseUrl: string = DEFAULT_AUTHORIZATION_SERVER, paymentRequests: {[key: string]: BigNumber} = {}) {
  mock.get(`${baseUrl}/.well-known/oauth-authorization-server`, {
    issuer: `${baseUrl}`,
    authorization_endpoint: `${baseUrl}/authorize`,
    registration_endpoint: `${baseUrl}/register`,
    token_endpoint: `${baseUrl}/token`,
    introspection_endpoint: `${baseUrl}/introspect`
  });
  // Use the more verbose route method to name the route, so we can .modifyRoute it later
  mock.route({
    name: `${baseUrl}/token`,
    url: `${baseUrl}/token`,
    method: 'post',
    repeat: 1,
    response: {
      access_token: 'testAccessToken',
      refresh_token: 'testRefreshToken',
      token_type: 'Bearer',
      expires_in: 3600
    }
  });
  mock.route({
    name: `${baseUrl}/register`,
    url: `${baseUrl}/register`, 
    method: 'post',
    response: {
      status: 201,
      body: {
        client_id: 'testClientId',
        client_secret: 'testClientSecret',
        client_secret_expires_at: Date.now() + 1000 * 60 * 60 * 24 * 30
      }
    }
  });
  mock.route({
    name: `${baseUrl}/introspect`,
    url: `${baseUrl}/introspect`,
    method: 'post',
    repeat: 1,
    response: {
      active: true,
      client_id: 'testClientId',
      username: 'testUsername',
      sub: 'testUser'
    }
  });
  for (const [paymentRequestId, amount] of Object.entries(paymentRequests)) {
    mock.route({
      name: `get ${baseUrl}/payment-request/${paymentRequestId}`,
      url: `${baseUrl}/payment-request/${paymentRequestId}`,
      method: 'get',
      response: {
        amount,
        currency: 'USDC',
        network: 'solana',
        destination: 'testDestination',
        resourceName: 'testResourceName'
      }
    });
    mock.route({
      name: `put ${baseUrl}/payment-request/${paymentRequestId}`,
      url: `${baseUrl}/payment-request/${paymentRequestId}`,
      method: 'put',
      response: {
        status: 200
      }
    });
  }
  return mock;
}