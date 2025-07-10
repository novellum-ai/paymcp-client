import { describe, it, expect } from 'vitest';
import { withContext, getContext } from './context.js';
import { PayMcpContext } from './types.js';

describe('AsyncLocalStorage Context', () => {
  it('should make config available within the context', () => {
    const testContext: Required<PayMcpContext> = {
      logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
    };

    withContext(testContext, () => {
      const context = getContext();
      expect(context).toBe(testContext);
    });
  });

  it('should make config available in event callbacks', () => {
    return new Promise<void>((resolve) => {
      const testContext: Required<PayMcpContext> = {
        logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
      };

      withContext(testContext, () => {
        // Simulate setting up an event listener (like res.on('finish'))
        const eventEmitter = new EventTarget();
        
        eventEmitter.addEventListener('test', () => {
          // This callback should have access to the config
          const context = getContext();
          expect(context).toBe(testContext);
          resolve();
        });

        // Trigger the event
        eventEmitter.dispatchEvent(new Event('test'));
      });
    });
  });
}); 