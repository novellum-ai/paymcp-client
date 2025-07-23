import { describe, it, expect } from 'vitest';
import { withPayMcpContext, getPayMcpConfig, payMcpUser } from './payMcpContext.js';
import * as TH from './testHelpers.js';

describe('continueWithPayMcpContext', () => {
  it('should make user available within the context', () => {
    withPayMcpContext(TH.config(), new URL('https://example.com'), TH.tokenCheck(), () => {
      const user = payMcpUser();
      expect(user).toBe('test-user');
    });
  });

  it('should make config available within the context', () => {
    const config = TH.config();
    withPayMcpContext(config, new URL('https://example.com'), TH.tokenCheck(), () => {
      const config = getPayMcpConfig();
      expect(config).toBe(config);
    });
  });

  it('should make user available in event callbacks', () => {
    return new Promise<void>((resolve) => {
      withPayMcpContext(TH.config(), new URL('https://example.com'), TH.tokenCheck(), () => {
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
      const testConfig = TH.config();
      withPayMcpContext(testConfig, new URL('https://example.com'), TH.tokenCheck(), () => {
        // Simulate setting up an event listener (like res.on('finish'))
        const eventEmitter = new EventTarget();
        
        eventEmitter.addEventListener('test', () => {
          // This callback should have access to the config
          const config = getPayMcpConfig();
          expect(config).toBe(testConfig);
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
    await withPayMcpContext(cfg, new URL('https://example.com'), tokenCheck, () => {});
    const fromDb = await cfg.oAuthDb.getAccessToken(tokenCheck.data!.sub!, '');
    expect(fromDb).toMatchObject({
      accessToken: tokenCheck.token!,
      resourceUrl: ''
    });
  });

  it('should not throw an error if the token is null', async () => {
    const tokenCheck = TH.tokenCheck({token: null});
    const cfg = TH.config();
    await withPayMcpContext(cfg, new URL('https://example.com'), tokenCheck, () => {});
    const fromDb = await cfg.oAuthDb.getAccessToken(tokenCheck.data!.sub!, '');
    expect(fromDb).toBeNull();
  });
}); 