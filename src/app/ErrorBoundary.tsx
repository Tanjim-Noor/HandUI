import { Component, type ErrorInfo, type ReactNode } from 'react';
import { errorLogger } from '../handui/runtime/errorLogger';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly errorId?: string | undefined;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {};

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { errorId: 'pending' };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    const record = errorLogger.capture('react_render_error', error, {
      severity: 'fatal',
      context: { componentStack: info.componentStack ?? 'unavailable' },
    });
    this.setState({ errorId: record.id });
  }

  override render() {
    if (this.state.errorId) {
      return (
        <main className="fatal-error" role="alert">
          <p className="eyebrow">HandUI runtime error</p>
          <h1>The laboratory could not render.</h1>
          <p>
            The failure was logged locally as <code>{this.state.errorId}</code>. Camera frames and
            diagnostics were not uploaded.
          </p>
          <button className="button-primary" onClick={() => window.location.reload()}>
            Reload HandUI
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
