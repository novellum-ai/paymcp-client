import { FetchMock } from 'fetch-mock';

export function mockResourceServer(mock: FetchMock, baseUrl: string = 'https://example.com', resourcePath: string = '/mcp', authServerUrl: string = 'https://paymcp.com') {
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

export function mockAuthorizationServer(mock: FetchMock, baseUrl: string = 'https://paymcp.com') {
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
  return mock;
}