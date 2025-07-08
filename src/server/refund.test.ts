import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { paymcp } from './index.js';
import httpMocks from 'node-mocks-http';
import { mockAuthorizationServer, mockResourceServer } from '../testHelpers.js';
import fetchMock from 'fetch-mock';
import { ConsoleLogger, LogLevel } from '../logger.js';
import { BigNumber } from 'bignumber.js';
import { EventEmitter } from 'events';

describe.skip('paymcp refunds', () => {
  // Not implemented yet
});