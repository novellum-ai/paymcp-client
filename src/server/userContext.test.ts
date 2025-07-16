import { describe, it, expect } from 'vitest';
import { continueWithUserContext, payMcpUser } from './userContext.js';
import * as TH from './testHelpers.js';

describe('continueWithUserContext', () => {
  it('should make config available within the context', () => {
    continueWithUserContext(TH.config(), TH.tokenCheck(), () => {
      const user = payMcpUser();
      expect(user).toBe('test-user');
    });
  });

  it('should make config available in event callbacks', () => {
    return new Promise<void>((resolve) => {
      continueWithUserContext(TH.config(), TH.tokenCheck(), () => {
        // Simulate setting up an event listener (like res.on('finish'))
        const eventEmitter = new EventTarget();
        
        eventEmitter.addEventListener('test', () => {
          // This callback should have access to the config
          const user = payMcpUser();
          expect(user).toBe('test-user');
          resolve();
        });

        // Trigger the event
        eventEmitter.dispatchEvent(new Event('test'));
      });
    });
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

  it('should not throw an error if the token is null', () => {
    expect.fail('Not implemented');
  });
}); 