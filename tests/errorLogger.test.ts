import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClientErrorLogger } from '../src/handui/runtime/errorLogger';

describe('client error logger', () => {
  afterEach(() => vi.restoreAllMocks());

  it('creates structured, bounded, observable records', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const logger = new ClientErrorLogger();
    const listener = vi.fn();
    const unsubscribe = logger.subscribe(listener);
    const record = logger.capture('camera_failed', new Error('Camera unavailable'), {
      severity: 'warning',
      context: { requestedDevice: 'default' },
    });
    expect(record).toMatchObject({
      id: 'HUI-0001',
      severity: 'warning',
      code: 'camera_failed',
      message: 'Camera unavailable',
    });
    expect(logger.getSnapshot()).toHaveLength(1);
    expect(listener).toHaveBeenCalledOnce();
    logger.clear();
    expect(logger.getSnapshot()).toEqual([]);
    unsubscribe();
  });

  it('normalizes non-Error values and caps records at fifty', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logger = new ClientErrorLogger();
    for (let index = 0; index < 55; index += 1) logger.capture('test', { index });
    expect(logger.getSnapshot()).toHaveLength(50);
    expect(logger.getSnapshot()[0]?.message).toBe('{"index":54}');
    const circular: { self?: unknown } = {};
    circular.self = circular;
    expect(logger.capture('circular', circular).message).toBe('[object Object]');
  });

  it('captures global errors once and removes handlers cleanly', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logger = new ClientErrorLogger();
    const cleanup = logger.installGlobalHandlers(window);
    expect(logger.installGlobalHandlers(window)).toBe(cleanup);
    window.dispatchEvent(
      new ErrorEvent('error', {
        error: new Error('Global failure'),
        filename: 'app.ts',
        lineno: 12,
        colno: 3,
      }),
    );
    expect(logger.getSnapshot()[0]).toMatchObject({ code: 'window_error', severity: 'fatal' });

    const rejection = new Event('unhandledrejection');
    Object.defineProperty(rejection, 'reason', { value: new Error('Rejected operation') });
    window.dispatchEvent(rejection);
    expect(logger.getSnapshot()[0]).toMatchObject({
      code: 'unhandled_rejection',
      severity: 'fatal',
    });

    const violation = new Event('securitypolicyviolation');
    Object.defineProperties(violation, {
      blockedURI: { value: 'inline' },
      effectiveDirective: { value: 'script-src' },
      disposition: { value: 'enforce' },
      sourceFile: { value: 'index.html' },
      lineNumber: { value: 4 },
    });
    window.dispatchEvent(violation);
    expect(logger.getSnapshot()[0]).toMatchObject({ code: 'csp_violation', severity: 'fatal' });

    cleanup();
    window.dispatchEvent(new ErrorEvent('error', { message: 'Ignored after cleanup' }));
    expect(logger.getSnapshot()).toHaveLength(3);
  });
});
