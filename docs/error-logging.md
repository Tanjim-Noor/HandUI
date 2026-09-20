# Error Logging

HandUI records browser errors in a bounded, in-memory log. It does not send logs to a server, persist them, or include camera frames and landmarks.

## Captured failures

- Global JavaScript errors.
- Unhandled promise rejections.
- Content Security Policy violations.
- React render failures through the root error boundary.
- Camera permission and startup failures.
- Tracking-worker restart and terminal failures.

Each record contains a session-local ID, ISO timestamp, severity, stable error code, message, optional stack, and small non-frame context fields. The newest 50 records are retained. Reloading the page clears them.

The developer panel shows the five newest records and provides a local clear action. Full structured records are also written to the browser console with a `[HandUI:<code>]` prefix.

## Security policy

The production preview keeps a strict script policy: same-origin scripts plus WebAssembly evaluation. Vite development requires an inline React Refresh preamble, so only the local development server adds `unsafe-inline` and localhost WebSocket connections. The production policy never receives those development allowances.
