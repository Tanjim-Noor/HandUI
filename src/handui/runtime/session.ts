import type { FrameMetrics, TrackerConfig } from '../contracts/types';
import { EMPTY_METRICS } from '../contracts/types';
import { HandFrameProcessor } from '../recognizers/processor';
import { syntheticSequence } from '../testing/synthetic';
import { CameraController, type CameraDevice } from '../tracking/camera';
import { MediaPipeWorkerClient } from '../tracking/workerClient';
import { errorLogger } from './errorLogger';
import { HandUIStore } from './store';

const TRACKER_CONFIG: TrackerConfig = {
  modelPath: '/vendor/mediapipe/gesture_recognizer.task',
  wasmPath: '/vendor/mediapipe/wasm',
  numHands: 2,
  delegate: 'CPU',
  minHandDetectionConfidence: 0.5,
  minHandPresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
};

const EVENT_NAMES = [
  'hand:found',
  'hand:lost',
  'gesture:start',
  'gesture:change',
  'gesture:end',
  'pinch:start',
  'pinch:end',
  'transform:start',
  'transform:end',
] as const;

export class HandUISession {
  readonly store = new HandUIStore();
  readonly processor = new HandFrameProcessor();
  readonly camera = new CameraController();
  private tracker: MediaPipeWorkerClient | undefined;
  private animationFrame = 0;
  private videoFrameCallback = 0;
  private inFlight = false;
  private disposed = false;
  private restartCount = 0;
  private droppedFrames = 0;
  private inferenceSamples: number[] = [];
  private inferenceDurations: number[] = [];
  private eventCleanups: (() => void)[] = [];
  private lastScheduledAt = 0;

  constructor() {
    for (const name of EVENT_NAMES) {
      this.eventCleanups.push(
        this.processor.events.on(name, (event) => {
          const hands = event.detail.handIds.join(', ') || 'session';
          this.store.pushEvent(`${name} · ${hands}`);
        }),
      );
    }
  }

  async startCamera(deviceId?: string): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.store.update({
        status: 'unavailable',
        error: 'Camera APIs are unavailable in this browser.',
      });
      return;
    }
    await this.stop(false);
    this.store.update({ status: 'requesting-camera', error: undefined, synthetic: false });
    try {
      await this.camera.start(deviceId);
      this.store.update({ status: 'loading-model' });
      await this.initializeTracker();
      this.store.update({ status: 'running' });
      this.scheduleVideoFrame();
    } catch (error) {
      this.camera.stop();
      const denied =
        error instanceof DOMException &&
        (error.name === 'NotAllowedError' || error.name === 'SecurityError');
      errorLogger.capture(denied ? 'camera_permission_denied' : 'camera_start_failed', error, {
        severity: denied ? 'warning' : 'error',
        context: { requestedDevice: deviceId ? 'selected' : 'default' },
      });
      this.store.update({
        status: denied ? 'denied' : 'error',
        error: denied
          ? 'Camera permission was not granted.'
          : error instanceof Error
            ? error.message
            : String(error),
      });
    }
  }

  startSynthetic(): void {
    void this.stop(false).then(() => {
      this.store.update({ status: 'running', synthetic: true, error: undefined });
      const started = performance.now();
      const tick = (now: number) => {
        if (this.disposed || !this.store.getSnapshot().synthetic) return;
        const frame = this.processor.process(syntheticSequence(now - started), now, {
          ...EMPTY_METRICS,
          cameraFps: 30,
          inferenceFps: 30,
          renderFps: 60,
          inferenceMs: 4,
          eventLatencyMs: 6,
          delegate: 'synthetic',
        });
        this.store.setFrame(frame);
        this.animationFrame = requestAnimationFrame(tick);
      };
      this.animationFrame = requestAnimationFrame(tick);
    });
  }

  async stop(
    reset = true,
    reason: 'camera-stopped' | 'route-change' = 'camera-stopped',
  ): Promise<void> {
    this.processor.endTransform(reason);
    cancelAnimationFrame(this.animationFrame);
    this.cancelVideoFrame();
    this.camera.stop();
    const tracker = this.tracker;
    this.tracker = undefined;
    if (tracker) await tracker.close().catch(() => undefined);
    this.inFlight = false;
    this.restartCount = 0;
    this.processor.reset();
    if (reset) this.store.reset();
    else this.store.update({ synthetic: false });
  }

  async devices(): Promise<readonly CameraDevice[]> {
    return this.camera.devices();
  }

  videoElement(): HTMLVideoElement {
    return this.camera.video;
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    await this.stop();
    for (const cleanup of this.eventCleanups) cleanup();
    this.eventCleanups = [];
  }

  private async initializeTracker(): Promise<void> {
    const tracker = new MediaPipeWorkerClient();
    await tracker.initialize(TRACKER_CONFIG);
    this.tracker = tracker;
  }

  private scheduleVideoFrame(): void {
    const video = this.camera.video;
    const callback = (now: number, _metadata: VideoFrameCallbackMetadata) => {
      this.videoFrameCallback = 0;
      const average = this.inferenceDurations.length
        ? this.inferenceDurations.reduce((sum, duration) => sum + duration, 0) /
          this.inferenceDurations.length
        : 0;
      const interval = average > 50 ? 1000 / 15 : average > 33 ? 1000 / 20 : 0;
      if (now - this.lastScheduledAt >= interval) {
        this.lastScheduledAt = now;
        void this.processVideoFrame(now);
      } else this.droppedFrames += 1;
      if (this.camera.active()) this.scheduleVideoFrame();
    };
    this.videoFrameCallback = video.requestVideoFrameCallback(callback);
  }

  private cancelVideoFrame(): void {
    if (this.videoFrameCallback)
      this.camera.video.cancelVideoFrameCallback(this.videoFrameCallback);
    this.videoFrameCallback = 0;
  }

  private async processVideoFrame(timestampMs: number): Promise<void> {
    if (this.inFlight || !this.tracker || !this.camera.active()) {
      this.droppedFrames += 1;
      return;
    }
    this.inFlight = true;
    try {
      const bitmap = await createImageBitmap(this.camera.video, {
        resizeWidth: 640,
        resizeHeight: 360,
        resizeQuality: 'medium',
      });
      const observations = await this.tracker.detect({ bitmap, timestampMs });
      const now = performance.now();
      this.inferenceSamples.push(now);
      this.inferenceSamples = this.inferenceSamples.filter((sample) => now - sample <= 1000);
      this.inferenceDurations.push(this.tracker.lastInferenceMs);
      this.inferenceDurations = this.inferenceDurations.slice(-30);
      const metrics: FrameMetrics = {
        cameraFps: 30,
        inferenceFps: this.inferenceSamples.length,
        renderFps: 60,
        inferenceMs: this.tracker.lastInferenceMs,
        eventLatencyMs: Math.max(0, now - timestampMs),
        droppedFrames: this.droppedFrames,
        modelLoadMs: this.tracker.modelLoadMs,
        delegate: 'CPU',
      };
      this.store.setFrame(this.processor.process(observations, now, metrics));
      this.restartCount = 0;
    } catch (error) {
      await this.handleTrackingFailure(error);
    } finally {
      this.inFlight = false;
    }
  }

  private async handleTrackingFailure(error: unknown): Promise<void> {
    if (this.restartCount === 0 && this.camera.active()) {
      this.restartCount = 1;
      errorLogger.capture('tracking_worker_restart', error, {
        severity: 'warning',
        context: { attempt: 1 },
      });
      await this.tracker?.close().catch(() => undefined);
      try {
        await this.initializeTracker();
        this.store.pushEvent('tracking worker restarted');
        return;
      } catch {
        // Fall through to the recoverable fatal state.
      }
    }
    this.camera.stop();
    errorLogger.capture('tracking_fatal', error, { severity: 'fatal' });
    this.store.update({
      status: 'error',
      error: `Tracking stopped: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
