import { describe, it, expect, vi } from 'vitest';
import { BigNumber } from 'bignumber.js';
import { getCharge } from './charge.js';
import { mcpToolRequest, mcpRequest, createIncomingMessage } from './testHelpers.js';
import { DEFAULT_CONFIG } from './index.js';
import { PayMcpConfig } from './types.js';
import { getMcpOperation } from './mcpOperation.js';
import { parseMcpRequests } from './http.js';
import { IncomingMessage } from 'http';

const staticChargeFields = {
  destination: 'testDestination',
  network: 'solana',
  currency: 'USDC',
};
const oneCentCharge = {
  amount: BigNumber(0.01),
  ...staticChargeFields
};
const zeroCharge = {
  amount: BigNumber(0),
  ...staticChargeFields
}

function config(toolPrice: PayMcpConfig['toolPrice']): PayMcpConfig {
  return {
    toolPrice,
    destination: 'testDestination',
    ...DEFAULT_CONFIG
  };
}

describe('getCharge', () => {
  it('should return the price for a tool call with a static price', async () => {
    const cfg = config(BigNumber(0.01));
    const req = createIncomingMessage(mcpToolRequest({toolName: 'testTool'}));
    const msg = (await parseMcpRequests(cfg, req, '/'))[0];
    const charge = await getCharge(cfg, req, msg);
    expect(charge).toEqual(oneCentCharge);
  });

  it('should return 0 for a non-tool call message with a static price', async () => {
    const cfg = config(BigNumber(0.01));
    const req = createIncomingMessage(mcpRequest({method: 'resources/list'}));
    const msg = (await parseMcpRequests(cfg, req, '/'))[0];
    const charge = await getCharge(cfg, req, msg);
    expect(charge).toEqual(zeroCharge);
  });

  it('should return the price for a tool call with a price in a price map', async () => {
    const cfg = config({'testTool': BigNumber(0.01)});
    const req = createIncomingMessage(mcpToolRequest({toolName: 'testTool'}));
    const msg = (await parseMcpRequests(cfg, req, '/'))[0];
    const charge = await getCharge(cfg, req, msg);
    expect(charge).toEqual(oneCentCharge)
  });

  it('should return 0 for a tool call with a price NOT in a price map', async () => {
    const cfg = config({'testTool': BigNumber(0.01)});
    const req = createIncomingMessage(mcpToolRequest({toolName: 'anotherTool'}));
    const msg = (await parseMcpRequests(cfg, req, '/'))[0];
    const charge = await getCharge(cfg, req, msg);
    expect(charge).toEqual(zeroCharge);
  });

  it('should return 0 for a NON-tool call with a price NOT in a price map', async () => {
    const cfg = config({'testTool': BigNumber(0.01)});
    const req = createIncomingMessage(mcpRequest({method: 'resources/list'}));
    const msg = (await parseMcpRequests(cfg, req, '/'))[0];
    const charge = await getCharge(cfg, req, msg);
    expect(charge).toEqual(zeroCharge);
  });

  it('should return the price for a tool call with a matching wildcard price in a price map', async () => {
    const cfg = config({'*': BigNumber(0.01)});
    const req = createIncomingMessage(mcpToolRequest({toolName: 'testTool'}));
    const msg = (await parseMcpRequests(cfg, req, '/'))[0];
    const charge = await getCharge(cfg, req, msg);
    expect(charge).toEqual(oneCentCharge);
  });

  it('should override a matching wildcard price with a specific match', async () => {
    const cfg = config({'*': BigNumber(0.02), 'testTool': BigNumber(0.01)});
    const req = createIncomingMessage(mcpToolRequest({toolName: 'testTool'}));
    const msg = (await parseMcpRequests(cfg, req, '/'))[0];
    const charge = await getCharge(cfg, req, msg);
    expect(charge).toEqual(oneCentCharge);
  });

  it('should override a matching wildcard price with a specific match with value 0', async () => {
    const cfg = config({'*': BigNumber(0.01), 'testTool': BigNumber(0)});
    const req = createIncomingMessage(mcpToolRequest({toolName: 'testTool'}));
    const msg = (await parseMcpRequests(cfg, req, '/'))[0];
    const charge = await getCharge(cfg, req, msg);
    expect(charge).toEqual(zeroCharge);
  });

  it('should not support substring wildcard matches and log a warning', async () => {
    const cfg = config({'testTool': BigNumber(0.01), 'test*': BigNumber(0.02)});
    const req = createIncomingMessage(mcpToolRequest({toolName: 'testTool'}));
    const msg = (await parseMcpRequests(cfg, req, '/'))[0];
    const charge = await getCharge(cfg, req, msg);
    expect(charge).toEqual(oneCentCharge);
  });

  it('should return the computed price for a price function', async () => {
    const priceFn = vi.fn().mockResolvedValue(BigNumber(0.01)) as unknown as (req: IncomingMessage, toolName: string, args: any) => Promise<BigNumber>;
    const cfg = config(priceFn);
    const req = createIncomingMessage(mcpToolRequest({toolName: 'testTool'}));
    const msg = (await parseMcpRequests(cfg, req, '/'))[0];
    const charge = await getCharge(cfg, req, msg);
    expect(charge).toEqual(oneCentCharge);
    expect(priceFn).toHaveBeenCalled();
  });

  it('should return 0 and log a warning if the tool call does not have a .name parameter', async () => {
    const cfg = config(BigNumber(0.01));
    // This is invalid - tools/call requires a .name parameter
    const req = createIncomingMessage(mcpRequest({method: 'tools/call', params: {}}));
    const msg = (await parseMcpRequests(cfg, req, '/'))[0];
    const charge = await getCharge(cfg, req, msg);
    expect(charge).toEqual(zeroCharge);
  });
});