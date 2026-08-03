import type { RawHandObservation, TrackerConfig } from '../contracts/types';

export type WorkerRequest =
  | { readonly type: 'initialize'; readonly requestId: number; readonly config: TrackerConfig }
  | {
      readonly type: 'detect';
      readonly requestId: number;
      readonly bitmap: ImageBitmap;
      readonly timestampMs: number;
    }
  | {
      readonly type: 'update-config';
      readonly requestId: number;
      readonly config: Partial<TrackerConfig>;
    }
  | { readonly type: 'close'; readonly requestId: number };

export type WorkerResponse =
  | { readonly type: 'ready'; readonly requestId: number; readonly modelLoadMs: number }
  | {
      readonly type: 'result';
      readonly requestId: number;
      readonly observations: readonly RawHandObservation[];
      readonly inferenceMs: number;
    }
  | { readonly type: 'updated' | 'closed'; readonly requestId: number }
  | { readonly type: 'error'; readonly requestId: number; readonly message: string };
