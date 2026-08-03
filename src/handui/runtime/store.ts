import type { HandFrame } from '../contracts/types';
import { EMPTY_FRAME } from '../contracts/types';

export type RuntimeStatus =
  'idle' | 'requesting-camera' | 'loading-model' | 'running' | 'denied' | 'unavailable' | 'error';

export interface RuntimeSnapshot {
  readonly status: RuntimeStatus;
  readonly frame: HandFrame;
  readonly error?: string | undefined;
  readonly synthetic: boolean;
  readonly events: readonly string[];
}

export class HandUIStore {
  private snapshot: RuntimeSnapshot = {
    status: 'idle',
    frame: EMPTY_FRAME,
    synthetic: false,
    events: [],
  };
  private listeners = new Set<() => void>();

  getSnapshot = (): RuntimeSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  update(patch: Partial<RuntimeSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener();
  }

  setFrame(frame: HandFrame): void {
    this.update({ frame });
  }

  pushEvent(message: string): void {
    this.update({ events: [message, ...this.snapshot.events].slice(0, 12) });
  }

  reset(): void {
    this.snapshot = { status: 'idle', frame: EMPTY_FRAME, synthetic: false, events: [] };
    for (const listener of this.listeners) listener();
  }
}
