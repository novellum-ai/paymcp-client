import { describe, it, expect, vi } from 'vitest';
import { BigNumber } from 'bignumber.js';
import { getCharge } from './charge.js';
import * as TH from './testHelpers.js'
import { parseMcpRequests } from './http.js';
import { IncomingMessage } from 'http';
import { withContext } from './context.js';

describe('getCharge', () => {
  it('should return the price for a tool call with a static price', async () => {
    const cfg = TH.config({toolPrice: BigNumber(0.01)});
    const req = TH.incomingMessage({
      body: TH.mcpToolRequest({toolName: 'testTool'})
    });
    const msg = (await parseMcpRequests(cfg, req))[0];
    const charge = await getCharge(cfg, req, msg);
    expect(charge).toEqual(TH.oneCentCharge);
  });

  it('should return 0 for a non-tool call message with a static price', async () => {
    const cfg = TH.config({toolPrice: BigNumber(0.01)});
    const req = TH.incomingMessage({
      body: TH.mcpRequest({method: 'resources/list'})
    });
    const msg = (await parseMcpRequests(cfg, req))[0];
    const charge = await getCharge(cfg, req, msg);
    expect(charge).toEqual(TH.zeroCharge);
  });

  it('should return the price for a tool call with a price in a price map', async () => {
    const cfg = TH.config({toolPrice: {'testTool': BigNumber(0.01)}});
    const req = TH.incomingMessage({
      body: TH.mcpToolRequest({toolName: 'testTool'})
    });
    const msg = (await parseMcpRequests(cfg, req))[0];
    const charge = await getCharge(cfg, req, msg);
    expect(charge).toEqual(TH.oneCentCharge)
  });

  it('should return 0 for a tool call with a price NOT in a price map', async () => {
    const cfg = TH.config({toolPrice: {'testTool': BigNumber(0.01)}});
    const req = TH.incomingMessage({
      body: TH.mcpToolRequest({toolName: 'anotherTool'})
    });
    const msg = (await parseMcpRequests(cfg, req))[0];
    const charge = await getCharge(cfg, req, msg);
    expect(charge).toEqual(TH.zeroCharge);
  });

  it('should return 0 for a NON-tool call with a price NOT in a price map', async () => {
    const cfg = TH.config({toolPrice: {'testTool': BigNumber(0.01)}});
    const req = TH.incomingMessage({
      body: TH.mcpRequest({method: 'resources/list'})
    });
    const msg = (await parseMcpRequests(cfg, req))[0];
    const charge = await getCharge(cfg, req, msg);
    expect(charge).toEqual(TH.zeroCharge);
  });

  it('should return the price for a tool call with a matching wildcard price in a price map', async () => {
    const cfg = TH.config({toolPrice: {'*': BigNumber(0.01)}});
    const req = TH.incomingMessage({
      body: TH.mcpToolRequest({toolName: 'testTool'})
    });
    const msg = (await parseMcpRequests(cfg, req))[0];
    const charge = await getCharge(cfg, req, msg);
    expect(charge).toEqual(TH.oneCentCharge);
  });

  it('should override a matching wildcard price with a specific match', async () => {
    const cfg = TH.config({toolPrice: {'*': BigNumber(0.02), 'testTool': BigNumber(0.01)}});
    const req = TH.incomingMessage({
      body: TH.mcpToolRequest({toolName: 'testTool'})
    });
    const msg = (await parseMcpRequests(cfg, req))[0];
    const charge = await getCharge(cfg, req, msg);
    expect(charge).toEqual(TH.oneCentCharge);
  });

  it('should override a matching wildcard price with a specific match with value 0', async () => {
    const cfg = TH.config({toolPrice: {'*': BigNumber(0.01), 'testTool': BigNumber(0)}});
    const req = TH.incomingMessage({
      body: TH.mcpToolRequest({toolName: 'testTool'})
    });
    const msg = (await parseMcpRequests(cfg, req))[0];
    const charge = await getCharge(cfg, req, msg);
    expect(charge).toEqual(TH.zeroCharge);
  });

  it('should not support substring wildcard matches and log a warning', async () => {
    const cfg = TH.config({toolPrice: {'testTool': BigNumber(0.01), 'test*': BigNumber(0.02)}});
    const req = TH.incomingMessage({
      body: TH.mcpToolRequest({toolName: 'testTool'})
    });
    const msg = (await parseMcpRequests(cfg, req))[0];
    const charge = await getCharge(cfg, req, msg);
    expect(charge).toEqual(TH.oneCentCharge);
  });

  it('should return the computed price for a price function', async () => {
    const priceFn = vi.fn().mockResolvedValue(BigNumber(0.01)) as unknown as (req: IncomingMessage, toolName: string, args: any) => Promise<BigNumber>;
    const cfg = TH.config({toolPrice: priceFn});
    const req = TH.incomingMessage({
      body: TH.mcpToolRequest({toolName: 'testTool'})
    });
    const msg = (await parseMcpRequests(cfg, req))[0];
    const charge = await getCharge(cfg, req, msg);
    expect(charge).toEqual(TH.oneCentCharge);
    expect(priceFn).toHaveBeenCalled();
  });

  it('should return 0 and log a warning if the tool call does not have a .name parameter', async () => {
    const cfg = TH.config({toolPrice: BigNumber(0.01)});
    // This is invalid - tools/call requires a .name parameter
    const req = TH.incomingMessage({
      body: TH.mcpRequest({method: 'tools/call', params: {}})
    });
    const msg = (await parseMcpRequests(cfg, req))[0];
    const charge = await getCharge(cfg, req, msg);
    expect(charge).toEqual(TH.zeroCharge);
  });

  it('should return 0 and log an error on a negative charge value', async () => {
    const cfg = TH.config({toolPrice: BigNumber(-0.01)});
    const req = TH.incomingMessage({
      body: TH.mcpToolRequest({toolName: 'testTool'})
    });
    const msg = (await parseMcpRequests(cfg, req))[0];
    await withContext(cfg, async () => {
      const charge = await getCharge(cfg, req, msg);
      expect(charge).toEqual(TH.zeroCharge);
    });
    expect(cfg.logger.error).toHaveBeenCalledWith('Charge amount must be non-negative, but received -0.01. Returning 0 instead.');
  });
});