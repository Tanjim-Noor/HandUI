export type ErrorSeverity = 'warning' | 'error' | 'fatal';

export interface ClientErrorRecord {
  readonly id: string;
  readonly timestamp: string;
  readonly severity: ErrorSeverity;
  readonly code: string;
  readonly message: string;
  readonly stack?: string | undefined;
  readonly context?: Readonly<Record<string, string | number | boolean | null>> | undefined;
}

interface CaptureOptions {
  readonly severity?: ErrorSeverity;
  readonly context?: Readonly<Record<string, string | number | boolean | null>>;
}

const MAX_RECORDS = 50;

function normalizeError(error: unknown): { message: string; stack?: string | undefined } {
  if (error instanceof Error) return { message: error.message, stack: error.stack };
  if (typeof error === 'string') return { message: error };
  try {
    return { message: JSON.stringify(error) ?? String(error) };
  } catch {
    return { message: String(error) };
  }
}

export class ClientErrorLogger {
  private records: readonly ClientErrorRecord[] = [];
  private readonly listeners = new Set<() => void>();
  private nextId = 1;
  private globalCleanup: (() => void) | undefined;

  getSnapshot = (): readonly ClientErrorRecord[] => this.records;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  capture(code: string, error: unknown, options: CaptureOptions = {}): ClientErrorRecord {
    const normalized = normalizeError(error);
    const record: ClientErrorRecord = {
      id: `HUI-${String(this.nextId++).padStart(4, '0')}`,
      timestamp: new Date().toISOString(),
      severity: options.severity ?? 'error',
      code,
      message: normalized.message,
      ...(normalized.stack ? { stack: normalized.stack } : {}),
      ...(options.context ? { context: options.context } : {}),
    };
    this.records = [record, ...this.records].slice(0, MAX_RECORDS);
    const method = record.severity === 'warning' ? console.warn : console.error;
    method(`[HandUI:${record.code}] ${record.message}`, {
      id: record.id,
      severity: record.severity,
      context: record.context,
      stack: record.stack,
    });
    for (const listener of this.listeners) listener();
    return record;
  }

  clear(): void {
    this.records = [];
    for (const listener of this.listeners) listener();
  }

  installGlobalHandlers(target: Window = window): () => void {
    if (this.globalCleanup) return this.globalCleanup;
    const onError = (event: ErrorEvent) => {
      this.capture('window_error', event.error ?? event.message, {
        severity: 'fatal',
        context: { filename: event.filename, line: event.lineno, column: event.colno },
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      this.capture('unhandled_rejection', event.reason, { severity: 'fatal' });
    };
    const onPolicyViolation = (event: SecurityPolicyViolationEvent) => {
      this.capture('csp_violation', `Blocked ${event.blockedURI || 'inline content'}`, {
        severity: 'fatal',
        context: {
          directive: event.effectiveDirective,
          disposition: event.disposition,
          sourceFile: event.sourceFile,
          line: event.lineNumber,
        },
      });
    };
    target.addEventListener('error', onError);
    target.addEventListener('unhandledrejection', onRejection);
    target.addEventListener('securitypolicyviolation', onPolicyViolation);
    this.globalCleanup = () => {
      target.removeEventListener('error', onError);
      target.removeEventListener('unhandledrejection', onRejection);
      target.removeEventListener('securitypolicyviolation', onPolicyViolation);
      this.globalCleanup = undefined;
    };
    return this.globalCleanup;
  }
}

export const errorLogger = new ClientErrorLogger();
