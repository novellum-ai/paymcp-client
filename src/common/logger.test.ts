import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConsoleLogger } from './logger.js';
import { LogLevel } from './types.js';

describe('ConsoleLogger', () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log with prefix', () => {
    const logger = new ConsoleLogger({prefix: '[prefix]'});
    logger.info('test message');
    expect(consoleSpy.info).toHaveBeenCalledWith('[prefix] test message');
  });
  
  it('should log expected lines at level debug', () => {
    const logger = new ConsoleLogger();
    logger.level = LogLevel.DEBUG;
    
    logger.debug('debug message');
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');
    
    expect(consoleSpy.debug).toHaveBeenCalledWith('[paymcp] debug message');
    expect(consoleSpy.info).toHaveBeenCalledWith('[paymcp] info message');
    expect(consoleSpy.warn).toHaveBeenCalledWith('[paymcp] warn message');
    expect(consoleSpy.error).toHaveBeenCalledWith('[paymcp] error message');
  });

  it('should log expected lines at level info', () => {
    const logger = new ConsoleLogger();
    logger.level = LogLevel.INFO;
    
    logger.debug('debug message');
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');
    
    expect(consoleSpy.debug).not.toHaveBeenCalled();
    expect(consoleSpy.info).toHaveBeenCalledWith('[paymcp] info message');
    expect(consoleSpy.warn).toHaveBeenCalledWith('[paymcp] warn message');
    expect(consoleSpy.error).toHaveBeenCalledWith('[paymcp] error message');
  });

  it('should log expected lines at level warn', () => {
    const logger = new ConsoleLogger();
    logger.level = LogLevel.WARN;
    
    logger.debug('debug message');
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');
    
    expect(consoleSpy.debug).not.toHaveBeenCalled();
    expect(consoleSpy.info).not.toHaveBeenCalled();
    expect(consoleSpy.warn).toHaveBeenCalledWith('[paymcp] warn message');
    expect(consoleSpy.error).toHaveBeenCalledWith('[paymcp] error message');
  });

  it('should log expected lines at level error', () => {
    const logger = new ConsoleLogger();
    logger.level = LogLevel.ERROR;
    
    logger.debug('debug message');
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');
    
    expect(consoleSpy.debug).not.toHaveBeenCalled();
    expect(consoleSpy.info).not.toHaveBeenCalled();
    expect(consoleSpy.warn).not.toHaveBeenCalled();
    expect(consoleSpy.error).toHaveBeenCalledWith('[paymcp] error message');
  });

  it('should respect level changes', () => {
    const logger = new ConsoleLogger();
    
    logger.level = LogLevel.WARN;
    logger.info('test message');
    expect(consoleSpy.info).not.toHaveBeenCalled();
    
    logger.level = LogLevel.INFO;
    
    logger.info('another message');
    expect(consoleSpy.info).toHaveBeenCalledWith('[paymcp] another message');
  });
});