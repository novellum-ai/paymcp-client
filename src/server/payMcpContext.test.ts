import { describe, it, expect } from 'vitest';
import { withPayMcpContext, getPayMcpConfig, payMcpUser } from './payMcpContext.js';
import * as TH from './testHelpers.js';

describe('continueWithPayMcpContext', () => {
  it('should make user available within the context', () => {
    withPayMcpContext(TH.config(), TH.tokenCheck(), () => {
      const user = payMcpUser();
      expect(user).toBe('test-user');
    });
  });

  it('should make config available within the context', () => {
    withPayMcpContext(TH.config(), TH.tokenCheck(), () => {
      const config = getPayMcpConfig();
      expect(config).toBe(TH.config());
    });
  });

  it('should make config available in event callbacks', () => {
    return new Promise<void>((resolve) => {
      withPayMcpContext(TH.config(), TH.tokenCheck(), () => {
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

  it('should make config available in event callbacks', () => {
    return new Promise<void>((resolve) => {
      withPayMcpContext(TH.config(), TH.tokenCheck(), () => {
        // Simulate setting up an event listener (like res.on('finish'))
        const eventEmitter = new EventTarget();
        
        eventEmitter.addEventListener('test', () => {
          // This callback should have access to the config
          const config = getPayMcpConfig();
          expect(config).toBe(TH.config());
          resolve();
        });
        
        // Trigger the event
        eventEmitter.dispatchEvent(new Event('test'));
      });
    });
  });

  it('should write the incoming token to the oauth DB with url = \'\'', async () => {
    const tokenCheck = TH.tokenCheck();
    const cfg = TH.config();
    await withPayMcpContext(cfg, tokenCheck, () => {});
    const fromDb = await cfg.oAuthDb.getAccessToken(tokenCheck.data!.sub!, '');
    expect(fromDb).toMatchObject({
      accessToken: tokenCheck.token!,
      resourceUrl: ''
    });
  });

  it('should not throw an error if the token is null', async () => {
    const tokenCheck = TH.tokenCheck({token: null});
    const cfg = TH.config();
    await withPayMcpContext(cfg, tokenCheck, () => {});
    const fromDb = await cfg.oAuthDb.getAccessToken(tokenCheck.data!.sub!, '');
    expect(fromDb).toBeNull();
  });
}); 