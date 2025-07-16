import { describe, it, expect } from 'vitest';
import * as TH from './testHelpers.js';
import { checkToken } from './token.js';
import { TokenProblem } from './types.js';
import { sendOAuthChallenge } from './oAuthChallenge.js';

describe('proxyChallenge', () => {

  it('if the route throws an OAuthAuthenticationRequiredError, middleware should send a 401', async () =>{
    // We'll do this instead of having the middleware explicitly check for a proxied 401
    // It thus becomes the responsibility of the MCP logic to throw the error, and for it
    // to check the state that could lead to that being required.

    // The middleware's responsibility is to set the token for the request where an async
    // process can find it - ie in the OAuth DB 
    expect.fail('Not implemented');
  });

});