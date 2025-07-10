import { describe, it, expect } from 'vitest';
import { BigNumber } from 'bignumber.js';
import { getCharge } from './charge.js';
import { mcpToolRequest, mcpRequest } from './testHelpers.js';
import { DEFAULT_CONFIG } from './index.js';

describe.skip('getCharge', () => {
  const config = {
    price: new BigNumber(0.01),
    destination: 'testDestination',
    ...DEFAULT_CONFIG
  };
  const staticChargeFields = {
    destination: config.destination,
    network: config.network,
    currency: config.currency,
  };
  const oneCent = {
    amount: new BigNumber(0.01),
    ...staticChargeFields
  };

  it('should return the price for a tool call with a static price', () => {
    const msg = mcpToolRequest({toolName: 'testTool'});
    const charge = getCharge(config, msg);
    expect(charge).toEqual(oneCent);
  });

  it('should return null for a non-tool call message with a static price', () => {
    const msg = mcpRequest({method: 'resources/list'});
    const charge = getCharge(config, msg);
    expect(charge).toBeNull();
  });

  it('should return the price for a tool call with a price in a price map', () => {
    expect.fail('Not implemented');
  });

  it('should return XX for a tool call with a price NOT in a price map', () => {
    expect.fail('Not implemented');
  });

  it('should return the price for a NON-tool call with a price in a price map', () => {
    expect.fail('Not implemented');
  });

  it('should return XX for a NON-tool call with a price NOT in a price map', () => {
    expect.fail('Not implemented');
  });

  it('should return the price for a tool call with a matching wildcard price in a price map', () => {
    expect.fail('Not implemented');
  });

  it('should return XX for a tool call with a NON-matching wildcard price in a price map', () => {
    expect.fail('Not implemented');
  });

  it('should return the price for a tool call with a matching global wildcard price in a price map', () => {
    expect.fail('Not implemented');
  });

  it('should return the price for a NON-tool call with a matching global wildcard price in a price map', () => {
    expect.fail('Not implemented');
  });

  it('should override a matching wildcard price with a specific match', () => {
    expect.fail('Not implemented');
  });

  it('should override a matching global wildcard price with a specific match', () => {
    expect.fail('Not implemented');

  });
  it('should override a matching global wildcard price with a wildcard match', () => {
    expect.fail('Not implemented');
  });

  it('should override a matching wildcard price with a specific match with value null', () => {
    expect.fail('Not implemented');
  });

  it('should override a matching global wildcard price with a specific match with value null', () => {
    expect.fail('Not implemented');
  });

  it('should override a matching global wildcard price with a wildcard match with value null', () => {
    expect.fail('Not implemented');
  });

  it('should not allow substring wildcard matches', () => {
    expect.fail('Not implemented');
  });

  it('should return the computed price for a price function', () => {
    expect.fail('Not implemented');
  });
});