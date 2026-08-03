import type {
  HandTracker,
  RawHandObservation,
  TrackerConfig,
  TransferableFrame,
} from '../contracts/types';
import type { WorkerRequest, WorkerResponse } from './protocol';

interface PendingRequest {
  readonly resolve: (response: WorkerResponse) => void;
  readonly reject: (error: Error) => void;
}

type WorkerRequestWithoutId = WorkerRequest extends infer Request
  ? Request extends WorkerRequest
    ? Omit<Request, 'requestId'>
    : never
  : never;

export class MediaPipeWorkerClient implements HandTracker {
  private worker: Worker | undefined;
  private nextRequestId = 1;
  private readonly pending = new Map<number, PendingRequest>();
  modelLoadMs = 0;
  lastInferenceMs = 0;

  async initialize(config: TrackerConfig): Promise<void> {
    this.terminate();
    this.worker = new Worker(new URL('./mediapipe.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) =>
      this.handleResponse(event.data);
    this.worker.onerror = (event) =>
      this.failAll(new Error(event.message || 'Tracking worker failed.'));
    const response = await this.request({ type: 'initialize', config });
    if (response.type !== 'ready') throw new Error('Unexpected worker initialization response.');
    this.modelLoadMs = response.modelLoadMs;
  }

  async detect(frame: TransferableFrame): Promise<readonly RawHandObservation[]> {
    const response = await this.request(
      { type: 'detect', bitmap: frame.bitmap, timestampMs: frame.timestampMs },
      [frame.bitmap],
    );
    if (response.type !== 'result') throw new Error('Unexpected worker detection response.');
    this.lastInferenceMs = response.inferenceMs;
    return response.observations;
  }

  async updateConfig(config: Partial<TrackerConfig>): Promise<void> {
    const response = await this.request({ type: 'update-config', config });
    if (response.type !== 'updated') throw new Error('Unexpected worker update response.');
  }

  async close(): Promise<void> {
    if (!this.worker) return;
    try {
      await this.request({ type: 'close' });
    } finally {
      this.terminate();
    }
  }

  private request(
    request: WorkerRequestWithoutId,
    transfer: readonly Transferable[] = [],
  ): Promise<WorkerResponse> {
    if (!this.worker) return Promise.reject(new Error('Tracking worker is unavailable.'));
    const requestId = this.nextRequestId++;
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      this.worker?.postMessage({ ...request, requestId } as WorkerRequest, [...transfer]);
    });
  }

  private handleResponse(response: WorkerResponse): void {
    const pending = this.pending.get(response.requestId);
    if (!pending) return;
    this.pending.delete(response.requestId);
    if (response.type === 'error') pending.reject(new Error(response.message));
    else pending.resolve(response);
  }

  private failAll(error: Error): void {
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }

  private terminate(): void {
    this.worker?.terminate();
    this.worker = undefined;
    this.failAll(new Error('Tracking worker terminated.'));
  }
}
