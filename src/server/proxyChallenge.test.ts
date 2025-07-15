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

  it('should write the incoming token to the oauth DB with url = \'\'', async () => {
    // Should be part of paymcp() middleware - in user.ts probably
    expect.fail('Not implemented');
  });

  it('should write the executionId to the oAuth DB when it writes the token', async () => {
    // should be part of paymcp() middleware
    // executionId might be the userId - not 100% sure, though
    expect.fail('Not implemented');
  });

  it('should allow async implementation processes to set an OAuth challenge', async () => {
    // This might be something that Turtle itself is unaware of - ie there's a sharedDB
    // so that Temporal doesn't have to have a reference to Turtle
    expect.fail('Not implemented');
  });

  it('should confirm a set OAuth challenge is still active with the resource\'s auth server', async () =>{
    // should be part of paymcp() middleware
    expect.fail('Not implemented');
  });

  it('should clear the existing OAuth challenge if the auth server says it is not longer active', async () => {
    // should be part of paymcp() middleware
    expect.fail('Not implemented');
  });

  it('should responsd with a 401 if the auth server says the challenge is still active', async() => {
    // should be part of paymcp() middleware
    expect.fail();
  });

  it('should call the async resume function when the OAuth challenge is cleared', async () => {
    // should be part of paymcp() middleware
    expect.fail('Not implemented');
  });
});