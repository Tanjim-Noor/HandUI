import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../src/app/ErrorBoundary';
import { errorLogger } from '../src/handui/runtime/errorLogger';

function BrokenExhibit(): never {
  throw new Error('Render failed');
}

describe('error boundary', () => {
  afterEach(() => {
    cleanup();
    errorLogger.clear();
    vi.restoreAllMocks();
  });

  it('renders a recoverable local error surface and records the failure', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <BrokenExhibit />
      </ErrorBoundary>,
    );
    expect(
      screen.getByRole('heading', { name: /laboratory could not render/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload handui/i })).toBeInTheDocument();
    expect(errorLogger.getSnapshot()[0]).toMatchObject({
      code: 'react_render_error',
      severity: 'fatal',
      message: 'Render failed',
    });
  });
});
