import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { payMcpServer } from './payMcpServer.js';
import * as TH from './serverTestHelpers.js';
import { SqliteOAuthDb } from '../common/oAuthDb.js';
import express from 'express';
import request from 'supertest';
import { PaymentRequestError } from '../common/paymentRequestError.js';

describe('paymcp', () => {
  it('should run code at request start and finish', async () => {
    const logger = TH.logger();
    const router = payMcpServer(TH.config({
      logger, 
      oAuthClient: TH.oAuthClient({introspectResult: TH.tokenData({active: true})})
    }));

    const app = express();
    app.use(express.json());
    app.use(router);
    
    // Add a test endpoint
    app.post('/', (req, res) => {
      res.json({ success: true });
    });

    const response = await request(app)
      .post('/')
      .set('Content-Type', 'application/json')
      .set('Authorization', 'Bearer test-access-token')
      .send(TH.mcpToolRequest());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true });
    expect(logger.debug).toHaveBeenCalledWith('Request started - POST /');
    expect(logger.debug).toHaveBeenCalledWith('Request finished for user test-user - POST /');
  });

  it('should run code at start and finish if sending an OAuth challenge', async () => {
    const badToken = TH.tokenData({active: false});
    const logger = TH.logger();
    const router = payMcpServer(TH.config({
      logger, 
      oAuthClient: TH.oAuthClient({introspectResult: badToken})
    }));

    const app = express();
    app.use(express.json());
    app.use(router);
    
    // Add a test endpoint
    app.post('/', (req, res) => {
      res.json({ success: true });
    });

    const response = await request(app)
      .post('/')
      .set('Content-Type', 'application/json')
      .set('Authorization', 'Bearer test-access-token')
      .send(TH.mcpToolRequest());

    expect(response.status).toBe(401);
    expect(logger.debug).toHaveBeenCalledWith('Request started - POST /');
    expect(logger.debug).toHaveBeenCalledWith('Request finished - POST /');
  });

  it('should save the oAuth token in the DB if it is active', async () => {
    const goodToken = TH.tokenData({active: true, sub: 'test-user'});
    const oAuthDb = new SqliteOAuthDb({ db: ':memory:' });
    const router = payMcpServer(TH.config({
      oAuthClient: TH.oAuthClient({introspectResult: goodToken}),
      oAuthDb
    }));

    const app = express();
    app.use(express.json());
    app.use(router);
    
    // Add a test endpoint
    app.post('/', (req, res) => {
      res.json({ success: true });
    });

    const response = await request(app)
      .post('/')
      .set('Content-Type', 'application/json')
      .set('Authorization', 'Bearer self-access-token')
      .send(TH.mcpToolRequest());

    expect(response.status).toBe(200);
    // payMcpServer stores the oAuth token that was used to auth to ITSELF under the url ''
    const tokenFromDb = await oAuthDb.getAccessToken('test-user', '');
    expect(tokenFromDb).toMatchObject({
      accessToken: 'self-access-token',
      resourceUrl: ''
    });
  });
  
  it('should return an OAuth challenge if token not active', async () => {
    const badToken = TH.tokenData({active: false});
    const router = payMcpServer(TH.config({
      oAuthClient: TH.oAuthClient({introspectResult: badToken})
    }));

    const app = express();
    app.use(express.json());
    app.use(router);
    
    // Add a test endpoint
    app.post('/', (req, res) => {
      res.json({ success: true });
    });

    const response = await request(app)
      .post('/')
      .set('Content-Type', 'application/json')
      .set('Authorization', 'Bearer test-access-token')
      .send(TH.mcpToolRequest());

    expect(response.status).toBe(401);
    expect(response.headers['www-authenticate']).toMatch(/Bearer resource_metadata="http:\/\/127\.0\.0\.1:\d+\/.well-known\/oauth-protected-resource\/"/);
  });

  it('should return an elicitation error if payment exception is throw by route code', async () => {
    const goodToken = TH.tokenData({active: true, sub: 'test-user'});
    const config = TH.config({
      oAuthClient: TH.oAuthClient({introspectResult: goodToken}),
    });
    const router = payMcpServer(config);

    const app = express();
    app.use(express.json());
    app.use(router);
    
    // Add a test endpoint
    app.post('/', (req, res) => {
      // In the real world, the MCP SDK is running the tool code, which is what will throw these
      // errors. But as of the writing of this test, the MCP SDK doesn't intercept these
      // errors, it just lets them bubble up
      throw new PaymentRequestError(config.server, 'test-payment-request-id');
    });

    const response = await request(app)
      .post('/')
      .set('Content-Type', 'application/json')
      .set('Authorization', 'Bearer self-access-token')
      .send(TH.mcpToolRequest());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ 
      "jsonrpc": "2.0",
        "id": 2,
        "error": {
          "code": -32604, // ELICITATION_REQUIRED
          "message": "This request requires more information.",
          "data": {
            "elicitations": [
              {
                "mode": "url",
                "elicitionId": "test-payment-request-id",
                "url": "http://127.0.0.1:62050/payment-request",
                "message": "This request requires more information."
              }
            ]
          }
        }
    });
  });

  it('should not intercept non-MCP requests', async () => {
    const router = payMcpServer({
      destination: 'test-destination',
    });

    const app = express();
    app.use(express.json());
    app.use(router);
    
    // Add a test endpoint
    app.get('/non-mcp', (req, res) => {
      res.json({ success: true });
    });

    const response = await request(app)
      .get('/non-mcp');

    // The middleware should allow the request to pass through to the endpoint
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true });
  });

  it('serves PRM endpoint', async () => {
    const router = payMcpServer({
      destination: 'test-destination',
    });

    const app = express();
    app.use(express.json());
    app.use(router);

    const response = await request(app)
      .get('/.well-known/oauth-protected-resource');

    expect(response.status).toBe(200);
    // Check the response data
    expect(response.body).toMatchObject({
      resource: expect.stringMatching(/^http:\/\/127\.0\.0\.1:\d+\/$/),
      resource_name: 'A PayMcp Server',
      authorization_servers: ['https://auth.paymcp.com'],
      bearer_methods_supported: ['header'],
      scopes_supported: ['read', 'write'],
    });
  });
});