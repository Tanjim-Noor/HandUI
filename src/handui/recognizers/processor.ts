import { HandUIEventBus } from '../contracts/events';
import type { TransformEndReason } from '../contracts/events';
import type {
  FrameMetrics,
  GestureCandidate,
  GestureName,
  HandFrame,
  HandId,
  RawHandObservation,
  TrackedHand,
} from '../contracts/types';
import { EMPTY_METRICS } from '../contracts/types';
import { OneEuroPointFilter } from '../math/filters';
import {
  boundsFromLandmarks,
  estimateOrientation,
  handSize,
  mirrorLandmarks,
  palmCenter,
  pinchRatio,
} from '../math/geometry';
import { HandIdentityTracker } from './identity';
import { GestureStabilizer, type GestureTransition } from './stability';
import { customGestureCandidates } from './customGestures';
import { TwoHandTransformRecognizer } from './twoHandTransform';

const MODEL_GESTURES: Record<string, GestureName> = {
  None: 'none',
  Unknown: 'none',
  Closed_Fist: 'closed-fist',
  Open_Palm: 'open-palm',
  Pointing_Up: 'pointing-up',
  Thumb_Down: 'thumb-down',
  Thumb_Up: 'thumb-up',
  Victory: 'victory',
  ILoveYou: 'i-love-you',
};

interface PerHandState {
  readonly filter: OneEuroPointFilter;
  readonly stabilizer: GestureStabilizer;
  pinching: boolean;
  pinchCandidateSince: number;
  previousPointer?: { x: number; y: number; timestampMs: number };
  previousVelocity?: { x: number; y: number };
  previousMotion?: 'still' | 'moving';
  lastHoldEventMs: number;
  pendingTransition: GestureTransition;
  pendingConfidence: number;
}

function bestGesture(candidates: readonly GestureCandidate[]): GestureCandidate {
  return candidates.reduce<GestureCandidate>(
    (best, candidate) => (candidate.confidence > best.confidence ? candidate : best),
    { name: 'none', confidence: 0, source: 'model' },
  );
}

function meta(frame: HandFrame, hand: TrackedHand, confidence: number) {
  return {
    schemaVersion: 1 as const,
    timestampMs: frame.timestampMs,
    sequence: frame.sequence,
    confidence,
    handIds: [hand.id],
  };
}

export function normalizeModelGesture(label: string): GestureName {
  return MODEL_GESTURES[label] ?? 'none';
}

export class HandFrameProcessor {
  readonly events = new HandUIEventBus();
  private readonly identities = new HandIdentityTracker();
  private readonly perHand = new Map<HandId, PerHandState>();
  private readonly previousHands = new Map<HandId, TrackedHand>();
  private readonly lastSeen = new Map<HandId, number>();
  private readonly transforms = new TwoHandTransformRecognizer();
  private sequence = 0;
  private transformTarget = 'spatial-card';
  private lastFrame: HandFrame | undefined;

  process(
    observations: readonly RawHandObservation[],
    timestampMs: number,
    metrics: FrameMetrics = EMPTY_METRICS,
  ): HandFrame {
    const ids = this.identities.assign(observations, timestampMs);
    const hands = observations.map((observation, index) =>
      this.buildHand(ids[index] as HandId, observation, timestampMs),
    );
    const frame: HandFrame = { timestampMs, sequence: ++this.sequence, hands, metrics };
    this.lastFrame = frame;
    this.emitHandEvents(frame);
    this.emitTransformEvents(frame);
    for (const hand of hands) {
      this.previousHands.set(hand.id, hand);
      this.lastSeen.set(hand.id, timestampMs);
    }
    return frame;
  }

  private stateFor(id: HandId): PerHandState {
    let state = this.perHand.get(id);
    if (!state) {
      state = {
        filter: new OneEuroPointFilter(),
        stabilizer: new GestureStabilizer(),
        pinching: false,
        pinchCandidateSince: 0,
        lastHoldEventMs: 0,
        pendingTransition: { kind: 'none', gesture: 'none' },
        pendingConfidence: 0,
      };
      this.perHand.set(id, state);
    }
    return state;
  }

  private buildHand(id: HandId, observation: RawHandObservation, timestampMs: number): TrackedHand {
    const interactionLandmarks = mirrorLandmarks(observation.landmarks);
    const state = this.stateFor(id);
    const rawPointer = interactionLandmarks[8] ?? { x: 0.5, y: 0.5, z: 0 };
    const pointer = state.filter.next(rawPointer, timestampMs);
    const ratio = pinchRatio(interactionLandmarks);
    if (!state.pinching && ratio <= 0.32) {
      state.pinchCandidateSince ||= timestampMs;
      if (timestampMs - state.pinchCandidateSince >= 100) state.pinching = true;
    } else if (state.pinching && ratio >= 0.42) {
      state.pinching = false;
      state.pinchCandidateSince = 0;
    } else if (ratio > 0.32 && !state.pinching) state.pinchCandidateSince = 0;

    const previous = state.previousPointer;
    const dt = previous ? Math.max((timestampMs - previous.timestampMs) / 1000, 1 / 120) : 1 / 30;
    const velocity = previous
      ? { x: (pointer.x - previous.x) / dt, y: (pointer.y - previous.y) / dt }
      : { x: 0, y: 0 };
    const speed = Math.hypot(velocity.x, velocity.y);
    const previousVelocity = state.previousVelocity ?? { x: 0, y: 0 };
    const acceleration = {
      x: (velocity.x - previousVelocity.x) / dt,
      y: (velocity.y - previousVelocity.y) / dt,
    };
    const motion = speed < 0.08 ? 'still' : 'moving';
    state.previousPointer = { ...pointer, timestampMs };
    state.previousVelocity = velocity;

    const model = bestGesture(observation.gestureCandidates);
    const derivedCandidates = customGestureCandidates(
      interactionLandmarks,
      observation.handedness.label,
    );
    const candidates = state.pinching
      ? ([
          ...observation.gestureCandidates,
          ...derivedCandidates,
          { name: 'pinch', confidence: 1, source: 'landmarks' },
        ] as const)
      : [...observation.gestureCandidates, ...derivedCandidates];
    const candidate = state.pinching ? { name: 'pinch' as const, confidence: 1 } : model;
    state.pendingTransition = state.stabilizer.update(
      candidate.name,
      candidate.confidence,
      timestampMs,
    );
    state.pendingConfidence = candidate.confidence;
    const orientation = estimateOrientation(observation.worldLandmarks);

    return {
      id,
      handedness: observation.handedness.label,
      handednessConfidence: observation.handedness.confidence,
      landmarks: observation.landmarks,
      interactionLandmarks,
      worldLandmarks: observation.worldLandmarks,
      palmCenter: palmCenter(interactionLandmarks),
      pointer,
      rawPointer,
      handSize: handSize(interactionLandmarks),
      bounds: boundsFromLandmarks(interactionLandmarks),
      ...(orientation ? { orientation } : {}),
      gestureCandidates: candidates,
      stableGesture: state.stabilizer.current(),
      pinchRatio: ratio,
      pinching: state.pinching,
      velocity,
      speed,
      acceleration,
      directionRad: Math.atan2(velocity.y, velocity.x),
      motion,
    };
  }

  private emitGestureTransition(
    frame: HandFrame,
    hand: TrackedHand,
    transition: GestureTransition,
    confidence: number,
  ): void {
    if (transition.kind === 'none') return;
    const state = this.stateFor(hand.id);
    if (transition.kind === 'hold' && frame.timestampMs - state.lastHoldEventMs < 100) return;
    if (transition.kind === 'hold') state.lastHoldEventMs = frame.timestampMs;
    const detail = {
      ...meta(frame, hand, confidence),
      gesture: transition.gesture,
      ...(transition.previousGesture ? { previousGesture: transition.previousGesture } : {}),
      position: hand.pointer,
    };
    this.events.emit(`gesture:${transition.kind}`, detail);
  }

  private emitHandEvents(frame: HandFrame): void {
    const currentIds = new Set(frame.hands.map((hand) => hand.id));
    for (const [id, previous] of this.previousHands) {
      const lastSeen = this.lastSeen.get(id) ?? frame.timestampMs;
      if (!currentIds.has(id) && frame.timestampMs - lastSeen > 250) {
        this.events.emit('hand:lost', { ...meta(frame, previous, 0), position: previous.pointer });
        this.perHand.delete(id);
        this.previousHands.delete(id);
        this.lastSeen.delete(id);
      }
    }

    for (const hand of frame.hands) {
      const previous = this.previousHands.get(hand.id);
      const confidence = hand.gestureCandidates[0]?.confidence ?? hand.handednessConfidence;
      this.events.emit(previous ? 'hand:move' : 'hand:found', {
        ...meta(frame, hand, confidence),
        position: hand.pointer,
      });
      if (hand.orientation)
        this.events.emit('hand:orientation', {
          ...meta(frame, hand, confidence),
          position: hand.pointer,
        });

      const state = this.stateFor(hand.id);
      if (state.previousMotion && state.previousMotion !== hand.motion) {
        this.events.emit('motion:change', {
          ...meta(frame, hand, confidence),
          motion: hand.motion,
          speed: hand.speed,
        });
      }
      state.previousMotion = hand.motion;

      const wasPinching = previous?.pinching ?? false;
      if (!wasPinching && hand.pinching) {
        this.events.emit('pinch:start', {
          ...meta(frame, hand, 1),
          gesture: 'pinch',
          position: hand.pointer,
        });
      } else if (wasPinching && hand.pinching) {
        this.events.emit('pinch:move', {
          ...meta(frame, hand, 1),
          gesture: 'pinch',
          position: hand.pointer,
        });
      } else if (wasPinching && !hand.pinching) {
        this.events.emit('pinch:end', {
          ...meta(frame, hand, 1),
          gesture: 'pinch',
          position: hand.pointer,
        });
      }

      this.emitGestureTransition(frame, hand, state.pendingTransition, state.pendingConfidence);
      state.pendingTransition = { kind: 'none', gesture: hand.stableGesture };
    }
  }

  private emitTransformEvents(frame: HandFrame): void {
    const transition = this.transforms.update(frame.hands, frame.timestampMs);
    if (transition.phase === 'idle') return;
    if (transition.phase === 'end') {
      this.events.emit('transform:end', {
        schemaVersion: 1,
        timestampMs: frame.timestampMs,
        sequence: frame.sequence,
        confidence: 0,
        handIds: [],
        targetId: this.transformTarget,
        midpoint: { x: 0.5, y: 0.5 },
        translation: { x: 0, y: 0 },
        scale: 1,
        rotationRad: 0,
        reason: transition.reason ?? 'released',
      });
      return;
    }
    const value = transition.value;
    if (!value) return;
    this.events.emit(`transform:${transition.phase}`, {
      schemaVersion: 1,
      timestampMs: frame.timestampMs,
      sequence: frame.sequence,
      confidence: Math.min(
        ...frame.hands.filter((hand) => value.handIds.includes(hand.id)).map(() => 1),
      ),
      handIds: value.handIds,
      targetId: this.transformTarget,
      midpoint: value.midpoint,
      translation: value.translation,
      scale: value.scale,
      rotationRad: value.rotationRad,
    });
  }

  setTransformTarget(targetId: string): void {
    this.transformTarget = targetId;
  }

  endTransform(reason: TransformEndReason): void {
    if (!this.transforms.cancel()) return;
    const frame = this.lastFrame;
    this.events.emit('transform:end', {
      schemaVersion: 1,
      timestampMs: frame?.timestampMs ?? performance.now(),
      sequence: frame?.sequence ?? this.sequence,
      confidence: 0,
      handIds: frame?.hands.map((hand) => hand.id) ?? [],
      targetId: this.transformTarget,
      midpoint: { x: 0.5, y: 0.5 },
      translation: { x: 0, y: 0 },
      scale: 1,
      rotationRad: 0,
      reason,
    });
  }

  reset(): void {
    this.identities.reset();
    this.perHand.clear();
    this.previousHands.clear();
    this.lastSeen.clear();
    this.transforms.cancel();
    this.sequence = 0;
    this.lastFrame = undefined;
  }
}
