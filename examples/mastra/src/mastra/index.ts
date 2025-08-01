#!/usr/bin/env node

import { Mastra } from '@mastra/core/mastra';
import ai from './agent.js';

export const mastra = new Mastra({
  agents: {
    ai
  },
  bundler: {
    external: ['oauth4webapi'] //, 'jose', '@solana/web3.js', '@solana/pay', 'bs58', ]
  }
})