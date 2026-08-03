import type { GestureName, HandId, Point2D } from './types';

export interface HandUIEventMeta {
  readonly schemaVersion: 1;
  readonly timestampMs: number;
  readonly sequence: number;
  readonly confidence: number;
  readonly handIds: readonly HandId[];
}

export interface HandEventDetail extends HandUIEventMeta {
  readonly position: Point2D;
}

export interface GestureEventDetail extends HandUIEventMeta {
  readonly gesture: GestureName;
  readonly previousGesture?: GestureName;
  readonly position: Point2D;
}

export interface MotionEventDetail extends HandUIEventMeta {
  readonly motion: 'still' | 'moving';
  readonly speed: number;
}

export type TransformEndReason =
  'released' | 'tracking-lost' | 'cancelled' | 'camera-stopped' | 'route-change';

export interface TransformEventDetail extends HandUIEventMeta {
  readonly targetId: string;
  readonly midpoint: Point2D;
  readonly translation: Point2D;
  readonly scale: number;
  readonly rotationRad: number;
  readonly reason?: TransformEndReason;
}

export interface HandUIEventMap {
  'hand:found': HandEventDetail;
  'hand:lost': HandEventDetail;
  'hand:move': HandEventDetail;
  'hand:orientation': HandEventDetail;
  'motion:change': MotionEventDetail;
  'gesture:start': GestureEventDetail;
  'gesture:hold': GestureEventDetail;
  'gesture:change': GestureEventDetail;
  'gesture:end': GestureEventDetail;
  'pinch:start': GestureEventDetail;
  'pinch:move': GestureEventDetail;
  'pinch:end': GestureEventDetail;
  'transform:start': TransformEventDetail;
  'transform:move': TransformEventDetail;
  'transform:end': TransformEventDetail;
}

export class HandUIEventBus extends EventTarget {
  emit<K extends keyof HandUIEventMap>(type: K, detail: HandUIEventMap[K]): boolean {
    return this.dispatchEvent(new CustomEvent(type, { detail, cancelable: true }));
  }

  on<K extends keyof HandUIEventMap>(
    type: K,
    listener: (event: CustomEvent<HandUIEventMap[K]>) => void,
    options?: AddEventListenerOptions,
  ): () => void {
    const wrapped = listener as EventListener;
    this.addEventListener(type, wrapped, options);
    return () => this.removeEventListener(type, wrapped, options);
  }
}
