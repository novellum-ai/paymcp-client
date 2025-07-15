import { describe, it, expect } from 'vitest';
import { withUser, payMcpUser } from './user.js';
import { PayMcpContext } from './types.js';

describe('withUser', () => {
  it('should make config available within the context', () => {
    withUser('test-user', () => {
      const user = payMcpUser();
      expect(user).toBe('test-user');
    });
  });

  it('should make config available in event callbacks', () => {
    return new Promise<void>((resolve) => {
      withUser('test-user', () => {
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
}); 