import { describe, it, expect } from 'vitest';
import { BigNumber } from 'bignumber.js';
import { getCharge } from './charge.js';
import { mcpToolRequest, mcpRequest } from './testHelpers.js';
import { DEFAULT_CONFIG } from './index.js';

describe('getCharge', () => {
  const config = {
    price: new BigNumber(0.01),
    destination: 'testDestination',
    ...DEFAULT_CONFIG
  };

  it('should return the static price for a tool call', () => {
    const msg = mcpToolRequest({toolName: 'testTool'});
    const charge = getCharge(config, msg);
    expect(charge).toEqual({
      amount: new BigNumber(0.01),
    });
  });

  it('should return null for a non-tool call message with a static price', () => {
    const msg = mcpRequest({method: 'resources/list'});
    const charge = getCharge(config, msg);
    expect(charge).toBeNull();
  });



});