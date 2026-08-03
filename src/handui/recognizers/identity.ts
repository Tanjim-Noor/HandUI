import type { HandId, Point2D, RawHandObservation } from '../contracts/types';
import { distance2D, palmCenter } from '../math/geometry';

interface Track {
  readonly id: HandId;
  readonly position: Point2D;
  readonly handedness: string;
  readonly lastSeenMs: number;
}

export class HandIdentityTracker {
  private tracks = new Map<HandId, Track>();
  private nextId = 1;

  assign(observations: readonly RawHandObservation[], timestampMs: number): readonly HandId[] {
    for (const [id, track] of this.tracks) {
      if (timestampMs - track.lastSeenMs > 250) this.tracks.delete(id);
    }

    const available = [...this.tracks.values()];
    const assigned = new Set<HandId>();
    const result: HandId[] = [];

    for (const observation of observations) {
      const position = palmCenter(observation.landmarks);
      let best: Track | undefined;
      let bestCost = Number.POSITIVE_INFINITY;
      for (const track of available) {
        if (assigned.has(track.id)) continue;
        const mismatch = track.handedness === observation.handedness.label ? 0 : 0.35;
        const cost = distance2D(track.position, position) + mismatch;
        if (cost < bestCost && cost < 0.7) {
          best = track;
          bestCost = cost;
        }
      }
      const id = best?.id ?? (`hand-${this.nextId++}` as HandId);
      assigned.add(id);
      this.tracks.set(id, {
        id,
        position,
        handedness: observation.handedness.label,
        lastSeenMs: timestampMs,
      });
      result.push(id);
    }
    return result;
  }

  activeIds(): readonly HandId[] {
    return [...this.tracks.keys()];
  }

  reset(): void {
    this.tracks.clear();
    this.nextId = 1;
  }
}
