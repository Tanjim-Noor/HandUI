/// <reference lib="webworker" />

import {
  FilesetResolver,
  GestureRecognizer,
  type GestureRecognizerResult,
} from '@mediapipe/tasks-vision';
import type {
  GestureName,
  Handedness,
  RawHandObservation,
  TrackerConfig,
} from '../contracts/types';
import type { WorkerRequest, WorkerResponse } from './protocol';

type MediaPipeModuleFactory = (moduleArg?: object) => Promise<unknown>;

interface MediaPipeWorkerScope extends DedicatedWorkerGlobalScope {
  ModuleFactory?: MediaPipeModuleFactory;
}

const scope = self as unknown as MediaPipeWorkerScope;
let recognizer: GestureRecognizer | undefined;

const gestureNames: Record<string, GestureName> = {
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

function normalizeHandedness(label: string): Handedness {
  const normalized = label.toLowerCase();
  return normalized === 'left' || normalized === 'right' ? normalized : 'unknown';
}

function mapResult(result: GestureRecognizerResult): readonly RawHandObservation[] {
  return result.landmarks.map((landmarks, index) => {
    const handedness = result.handedness[index]?.[0];
    const gestureCandidates = (result.gestures[index] ?? []).map((candidate) => ({
      name: gestureNames[candidate.categoryName] ?? 'none',
      confidence: candidate.score,
      source: 'model' as const,
    }));
    return {
      landmarks: landmarks.map(({ x, y, z }) => ({ x, y, z })),
      worldLandmarks: (result.worldLandmarks[index] ?? []).map(({ x, y, z }) => ({ x, y, z })),
      handedness: {
        label: normalizeHandedness(handedness?.categoryName ?? ''),
        confidence: handedness?.score ?? 0,
      },
      gestureCandidates,
    };
  });
}

async function initialize(config: TrackerConfig): Promise<number> {
  recognizer?.close();
  const started = performance.now();
  const simdSupported = await FilesetResolver.isSimdSupported();
  const loader = simdSupported
    ? await import('../../../.generated/mediapipe/vision_wasm_internal.mjs')
    : await import('../../../.generated/mediapipe/vision_wasm_nosimd_internal.mjs');
  scope.ModuleFactory = loader.default;
  const fileset = {
    wasmLoaderPath: '',
    wasmBinaryPath: `${config.wasmPath}/${
      simdSupported ? 'vision_wasm_internal.wasm' : 'vision_wasm_nosimd_internal.wasm'
    }`,
  };
  recognizer = await GestureRecognizer.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: config.modelPath, delegate: config.delegate },
    runningMode: 'VIDEO',
    numHands: config.numHands,
    minHandDetectionConfidence: config.minHandDetectionConfidence,
    minHandPresenceConfidence: config.minHandPresenceConfidence,
    minTrackingConfidence: config.minTrackingConfidence,
  });
  return performance.now() - started;
}

function post(response: WorkerResponse): void {
  scope.postMessage(response);
}

scope.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try {
    if (request.type === 'initialize') {
      post({
        type: 'ready',
        requestId: request.requestId,
        modelLoadMs: await initialize(request.config),
      });
      return;
    }
    if (request.type === 'detect') {
      if (!recognizer) throw new Error('Gesture recognizer is not initialized.');
      const started = performance.now();
      try {
        const result = recognizer.recognizeForVideo(request.bitmap, request.timestampMs);
        post({
          type: 'result',
          requestId: request.requestId,
          observations: mapResult(result),
          inferenceMs: performance.now() - started,
        });
      } finally {
        request.bitmap.close();
      }
      return;
    }
    if (request.type === 'update-config') {
      if (!recognizer) throw new Error('Gesture recognizer is not initialized.');
      await recognizer.setOptions({
        numHands: request.config.numHands,
        minHandDetectionConfidence: request.config.minHandDetectionConfidence,
        minHandPresenceConfidence: request.config.minHandPresenceConfidence,
        minTrackingConfidence: request.config.minTrackingConfidence,
      });
      post({ type: 'updated', requestId: request.requestId });
      return;
    }
    recognizer?.close();
    recognizer = undefined;
    post({ type: 'closed', requestId: request.requestId });
    scope.close();
  } catch (error) {
    if (request.type === 'detect') request.bitmap.close();
    post({
      type: 'error',
      requestId: request.requestId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
