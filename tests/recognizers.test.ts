import { describe, expect, it } from 'vitest';
import type { TrackedHand } from '../src/handui/contracts/types';
import { EMPTY_METRICS } from '../src/handui/contracts/types';
import {
  countExtendedFingers,
  customGestureCandidates,
} from '../src/handui/recognizers/customGestures';
import { HandIdentityTracker } from '../src/handui/recognizers/identity';
import { HandFrameProcessor, normalizeModelGesture } from '../src/handui/recognizers/processor';
import { GestureStabilizer } from '../src/handui/recognizers/stability';
import { TwoHandTransformRecognizer } from '../src/handui/recognizers/twoHandTransform';
import { syntheticHand } from '../src/handui/testing/synthetic';

function tracked(id: 'hand-1' | 'hand-2', x: number, y: number, pinching = true): TrackedHand {
  const raw = syntheticHand(1 - x, y, { pinch: pinching });
  return {
    id,
    handedness: id === 'hand-1' ? 'left' : 'right',
    handednessConfidence: 1,
    landmarks: raw.landmarks,
    interactionLandmarks: raw.landmarks,
    worldLandmarks: raw.worldLandmarks,
    palmCenter: { x, y, z: 0 },
    pointer: { x, y },
    rawPointer: { x, y },
    handSize: 0.2,
    bounds: { min: { x: x - 0.1, y: y - 0.1 }, max: { x: x + 0.1, y: y + 0.1 } },
    gestureCandidates: [],
    stableGesture: pinching ? 'pinch' : 'open-palm',
    pinchRatio: pinching ? 0.2 : 1,
    pinching,
    velocity: { x: 0, y: 0 },
    speed: 0,
    acceleration: { x: 0, y: 0 },
    directionRad: 0,
    motion: 'still',
  };
}

describe('recognizers', () => {
  it('keeps deterministic hand IDs through brief misses and expires them', () => {
    const identities = new HandIdentityTracker();
    const first = syntheticHand(0.3, 0.5);
    expect(identities.assign([first], 0)).toEqual(['hand-1']);
    identities.assign([], 100);
    expect(identities.assign([syntheticHand(0.32, 0.5)], 200)).toEqual(['hand-1']);
    identities.assign([], 500);
    expect(identities.assign([first], 501)).toEqual(['hand-2']);
    expect(identities.activeIds()).toEqual(['hand-2']);
    identities.reset();
    expect(identities.activeIds()).toEqual([]);
    const crossing = new HandIdentityTracker();
    const firstPair = crossing.assign([syntheticHand(0.25, 0.5), syntheticHand(0.75, 0.5)], 0);
    const crossedPair = crossing.assign([syntheticHand(0.7, 0.5), syntheticHand(0.3, 0.5)], 30);
    expect(new Set(crossedPair)).toEqual(new Set(firstPair));
  });

  it('debounces, holds, changes, and ends gestures', () => {
    const stability = new GestureStabilizer();
    expect(stability.update('open-palm', 0.9, 0).kind).toBe('none');
    expect(stability.update('open-palm', 0.9, 151).kind).toBe('start');
    expect(stability.current()).toBe('open-palm');
    expect(stability.update('open-palm', 0.8, 170).kind).toBe('hold');
    expect(stability.update('closed-fist', 0.9, 180).kind).toBe('hold');
    expect(stability.update('closed-fist', 0.9, 340)).toMatchObject({
      kind: 'change',
      previousGesture: 'open-palm',
    });
    expect(stability.update('none', 0, 350).kind).toBe('hold');
    expect(stability.update('none', 0, 451).kind).toBe('end');
    const rejected = new GestureStabilizer();
    expect(rejected.update('victory', 0.4, 0).kind).toBe('none');
    rejected.update('victory', 0.9, 10);
    expect(rejected.update('thumb-up', 0.9, 20).kind).toBe('none');
  });

  it('derives finger, pinch, grab, and flat-hand candidates', () => {
    const open = syntheticHand(0.3, 0.5);
    expect(countExtendedFingers(open.landmarks, 'right')).toBeGreaterThanOrEqual(4);
    expect(
      customGestureCandidates(open.landmarks, 'right').some((item) => item.name === 'flat-hand'),
    ).toBe(true);
    const pinch = syntheticHand(0.3, 0.5, { pinch: true });
    expect(
      customGestureCandidates(pinch.landmarks, 'right').some((item) => item.name === 'pinch'),
    ).toBe(true);
    const folded = pinch.landmarks.map((point, index) =>
      [8, 12, 16, 20].includes(index) ? { ...point, y: 0.9 } : point,
    );
    expect(customGestureCandidates(folded, 'unknown').some((item) => item.name === 'grab')).toBe(
      true,
    );
  });

  it('produces clamped translate, scale, rotation, release, and loss transitions', () => {
    const recognizer = new TwoHandTransformRecognizer();
    expect(recognizer.update([], 0).phase).toBe('idle');
    expect(
      recognizer.update([tracked('hand-1', 0.3, 0.5), tracked('hand-2', 0.7, 0.5)], 10).phase,
    ).toBe('start');
    const moved = recognizer.update([tracked('hand-1', 0.2, 0.4), tracked('hand-2', 0.9, 0.7)], 20);
    expect(moved.phase).toBe('move');
    expect(moved.value?.scale).toBeLessThanOrEqual(2);
    expect(moved.value?.translation.x).toBeCloseTo(0.05);
    expect(
      recognizer.update([tracked('hand-1', 0.2, 0.4), tracked('hand-2', 0.9, 0.7, false)], 30),
    ).toMatchObject({ phase: 'end', reason: 'released' });
    recognizer.update([tracked('hand-1', 0.3, 0.5), tracked('hand-2', 0.7, 0.5)], 40);
    expect(recognizer.update([], 100).phase).toBe('idle');
    expect(recognizer.update([], 351)).toMatchObject({ phase: 'end', reason: 'tracking-lost' });
    expect(recognizer.cancel()).toBe(false);
  });

  it('emits stable frame and semantic lifecycle from replay', () => {
    const processor = new HandFrameProcessor();
    const events: string[] = [];
    const offFound = processor.events.on('hand:found', () => events.push('found'));
    const offStart = processor.events.on('gesture:start', () => events.push('start'));
    const raw = syntheticHand(0.3, 0.5, { gesture: 'open-palm' });
    const first = processor.process([raw], 0, EMPTY_METRICS);
    const second = processor.process([raw], 160, EMPTY_METRICS);
    expect(first.hands[0]?.id).toBe(second.hands[0]?.id);
    expect(second.hands[0]?.acceleration).toBeDefined();
    expect(events).toContain('found');
    expect(events).toContain('start');
    processor.process([], 200, EMPTY_METRICS);
    expect(events.filter((item) => item === 'found')).toHaveLength(1);
    processor.process([], 500, EMPTY_METRICS);
    processor.reset();
    offFound();
    offStart();
  });

  it('normalizes every canned model label and rejects unknown labels', () => {
    expect(normalizeModelGesture('Closed_Fist')).toBe('closed-fist');
    expect(normalizeModelGesture('Open_Palm')).toBe('open-palm');
    expect(normalizeModelGesture('Pointing_Up')).toBe('pointing-up');
    expect(normalizeModelGesture('Thumb_Down')).toBe('thumb-down');
    expect(normalizeModelGesture('Thumb_Up')).toBe('thumb-up');
    expect(normalizeModelGesture('Victory')).toBe('victory');
    expect(normalizeModelGesture('ILoveYou')).toBe('i-love-you');
    expect(normalizeModelGesture('not-a-label')).toBe('none');
  });

  it('emits pinch, motion, bilateral transform, and explicit cancellation events', () => {
    const processor = new HandFrameProcessor();
    const events: string[] = [];
    const cleanups = [
      processor.events.on('pinch:start', () => events.push('pinch:start')),
      processor.events.on('pinch:move', () => events.push('pinch:move')),
      processor.events.on('pinch:end', () => events.push('pinch:end')),
      processor.events.on('transform:start', () => events.push('transform:start')),
      processor.events.on('transform:move', () => events.push('transform:move')),
      processor.events.on('transform:end', (event) =>
        events.push(`transform:end:${event.detail.reason}`),
      ),
      processor.events.on('motion:change', () => events.push('motion:change')),
      processor.events.on('hand:lost', () => events.push('hand:lost')),
      processor.events.on('hand:orientation', () => events.push('orientation')),
    ];
    const pinchedA = syntheticHand(0.3, 0.5, { pinch: true });
    const pinchedB = syntheticHand(0.7, 0.5, { pinch: true });
    processor.process([pinchedA, pinchedB], 100);
    processor.process([pinchedA, pinchedB], 201);
    processor.process(
      [syntheticHand(0.2, 0.4, { pinch: true }), syntheticHand(0.8, 0.6, { pinch: true })],
      235,
    );
    processor.setTransformTarget('test-target');
    processor.endTransform('cancelled');
    processor.process([syntheticHand(0.2, 0.4), syntheticHand(0.8, 0.6)], 260);
    processor.process([], 300);
    processor.process([], 600);
    expect(events).toContain('pinch:start');
    expect(events).toContain('pinch:move');
    expect(events).toContain('pinch:end');
    expect(events).toContain('transform:start');
    expect(events).toContain('transform:move');
    expect(events).toContain('transform:end:cancelled');
    expect(events).toContain('motion:change');
    expect(events).toContain('orientation');
    expect(events).toContain('hand:lost');
    processor.endTransform('released');
    for (const cleanup of cleanups) cleanup();
  });

  it('handles missing landmark and candidate data with neutral fallbacks', () => {
    const processor = new HandFrameProcessor();
    const frame = processor.process(
      [
        {
          landmarks: [],
          worldLandmarks: [],
          handedness: { label: 'unknown', confidence: 0.2 },
          gestureCandidates: [],
        },
      ],
      10,
    );
    expect(frame.hands[0]).toMatchObject({ rawPointer: { x: 0.5, y: 0.5 }, handedness: 'unknown' });
    expect(frame.hands[0]?.orientation).toBeUndefined();
  });
});
