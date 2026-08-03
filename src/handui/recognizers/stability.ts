import type { GestureName } from '../contracts/types';

export interface StabilityConfig {
  readonly enterConfidence: number;
  readonly continueConfidence: number;
  readonly exitConfidence: number;
  readonly enterMs: number;
  readonly exitMs: number;
}

const DEFAULT_CONFIG: StabilityConfig = {
  enterConfidence: 0.75,
  continueConfidence: 0.6,
  exitConfidence: 0.55,
  enterMs: 150,
  exitMs: 100,
};

export interface GestureTransition {
  readonly kind: 'none' | 'start' | 'hold' | 'change' | 'end';
  readonly gesture: GestureName;
  readonly previousGesture?: GestureName;
}

export class GestureStabilizer {
  private stable: GestureName = 'none';
  private candidate: GestureName = 'none';
  private candidateSince = 0;
  private belowSince = 0;

  constructor(private readonly config: StabilityConfig = DEFAULT_CONFIG) {}

  update(gesture: GestureName, confidence: number, timestampMs: number): GestureTransition {
    if (this.stable === 'none') {
      if (gesture === 'none' || confidence < this.config.enterConfidence) {
        this.candidate = 'none';
        return { kind: 'none', gesture: 'none' };
      }
      if (gesture !== this.candidate) {
        this.candidate = gesture;
        this.candidateSince = timestampMs;
        return { kind: 'none', gesture: 'none' };
      }
      if (timestampMs - this.candidateSince >= this.config.enterMs) {
        this.stable = gesture;
        this.belowSince = 0;
        return { kind: 'start', gesture };
      }
      return { kind: 'none', gesture: 'none' };
    }

    if (gesture === this.stable && confidence >= this.config.continueConfidence) {
      this.belowSince = 0;
      return { kind: 'hold', gesture: this.stable };
    }

    if (
      gesture !== 'none' &&
      gesture !== this.stable &&
      confidence >= this.config.enterConfidence
    ) {
      if (gesture !== this.candidate) {
        this.candidate = gesture;
        this.candidateSince = timestampMs;
      } else if (timestampMs - this.candidateSince >= this.config.enterMs) {
        const previousGesture = this.stable;
        this.stable = gesture;
        this.belowSince = 0;
        return { kind: 'change', gesture, previousGesture };
      }
      return { kind: 'hold', gesture: this.stable };
    }

    if (confidence < this.config.exitConfidence || gesture === 'none') {
      this.belowSince ||= timestampMs;
      if (timestampMs - this.belowSince >= this.config.exitMs) {
        const previousGesture = this.stable;
        this.stable = 'none';
        this.candidate = 'none';
        this.belowSince = 0;
        return { kind: 'end', gesture: previousGesture };
      }
    }
    return { kind: 'hold', gesture: this.stable };
  }

  current(): GestureName {
    return this.stable;
  }
}
