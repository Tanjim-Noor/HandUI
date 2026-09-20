import { describe, expect, it } from 'vitest';
import { developmentSecurityHeaders, productionSecurityHeaders } from '../vite.config';

describe('Vite security headers', () => {
  it('allows the React Refresh preamble only in development', () => {
    expect(developmentSecurityHeaders['Content-Security-Policy']).toContain(
      "script-src 'self' 'unsafe-inline'",
    );
    expect(developmentSecurityHeaders['Content-Security-Policy']).toContain('ws://localhost:*');
    expect(productionSecurityHeaders['Content-Security-Policy']).not.toContain(
      "script-src 'self' 'unsafe-inline'",
    );
    expect(productionSecurityHeaders['Content-Security-Policy']).toContain("connect-src 'self'");
  });
});
