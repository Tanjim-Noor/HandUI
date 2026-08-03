import type { HandId, Point2D, TrackedHand } from '../contracts/types';
import { clamp, distance2D, shortestAngleDelta, subtract2D } from '../math/geometry';

export interface TransformSnapshot {
  readonly handIds: readonly [HandId, HandId];
  readonly midpoint: Point2D;
  readonly translation: Point2D;
  readonly scale: number;
  readonly rotationRad: number;
}

interface Baseline {
  readonly handIds: readonly [HandId, HandId];
  readonly midpoint: Point2D;
  readonly distance: number;
  readonly angle: number;
}

function relation(a: TrackedHand, b: TrackedHand) {
  const midpoint = { x: (a.pointer.x + b.pointer.x) / 2, y: (a.pointer.y + b.pointer.y) / 2 };
  return {
    midpoint,
    distance: distance2D(a.pointer, b.pointer),
    angle: Math.atan2(b.pointer.y - a.pointer.y, b.pointer.x - a.pointer.x),
  };
}

export class TwoHandTransformRecognizer {
  private baseline: Baseline | undefined;
  private missingSince: number | undefined;

  update(
    hands: readonly TrackedHand[],
    timestampMs = 0,
  ): {
    phase: 'idle' | 'start' | 'move' | 'end';
    value?: TransformSnapshot;
    reason?: 'released' | 'tracking-lost';
  } {
    const pinching = hands.filter((hand) => hand.pinching);
    if (pinching.length < 2) {
      const hadBaseline = this.baseline !== undefined;
      if (hadBaseline && hands.length < 2) {
        this.missingSince ??= timestampMs;
        if (timestampMs - this.missingSince <= 250) return { phase: 'idle' };
      }
      this.baseline = undefined;
      this.missingSince = undefined;
      return hadBaseline
        ? { phase: 'end', reason: hands.length < 2 ? 'tracking-lost' : 'released' }
        : { phase: 'idle' };
    }
    const first = pinching[0];
    const second = pinching[1];
    if (!first || !second) return { phase: 'idle' };
    this.missingSince = undefined;
    const current = relation(first, second);
    if (!this.baseline) {
      this.baseline = {
        handIds: [first.id, second.id],
        midpoint: current.midpoint,
        distance: Math.max(current.distance, 0.001),
        angle: current.angle,
      };
      return {
        phase: 'start',
        value: {
          handIds: this.baseline.handIds,
          midpoint: current.midpoint,
          translation: { x: 0, y: 0 },
          scale: 1,
          rotationRad: 0,
        },
      };
    }
    const value: TransformSnapshot = {
      handIds: this.baseline.handIds,
      midpoint: current.midpoint,
      translation: subtract2D(current.midpoint, this.baseline.midpoint),
      scale: clamp(current.distance / this.baseline.distance, 0.5, 2),
      rotationRad: shortestAngleDelta(this.baseline.angle, current.angle),
    };
    return { phase: 'move', value };
  }

  cancel(): boolean {
    const active = this.baseline !== undefined;
    this.baseline = undefined;
    this.missingSince = undefined;
    return active;
  }
}
