export type HandId = `hand-${number}`;
export type Handedness = 'left' | 'right' | 'unknown';
export type GestureName =
  | 'none'
  | 'open-palm'
  | 'closed-fist'
  | 'pointing-up'
  | 'thumb-down'
  | 'thumb-up'
  | 'victory'
  | 'i-love-you'
  | 'pinch'
  | 'grab'
  | 'flat-hand';

export interface Point2D {
  readonly x: number;
  readonly y: number;
}

export interface Point3D extends Point2D {
  readonly z: number;
}

export type Landmark3D = Point3D;

export interface HandednessCandidate {
  readonly label: Handedness;
  readonly confidence: number;
}

export interface GestureCandidate {
  readonly name: GestureName;
  readonly confidence: number;
  readonly source: 'model' | 'landmarks';
}

export interface RawHandObservation {
  readonly landmarks: readonly Landmark3D[];
  readonly worldLandmarks: readonly Landmark3D[];
  readonly handedness: HandednessCandidate;
  readonly gestureCandidates: readonly GestureCandidate[];
}

export interface Quaternion {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
}

export interface HandOrientation {
  readonly xAxis: Point3D;
  readonly yAxis: Point3D;
  readonly normal: Point3D;
  readonly quaternion: Quaternion;
}

export interface HandBounds {
  readonly min: Point2D;
  readonly max: Point2D;
}

export interface TrackedHand {
  readonly id: HandId;
  readonly handedness: Handedness;
  readonly handednessConfidence: number;
  readonly landmarks: readonly Landmark3D[];
  readonly interactionLandmarks: readonly Landmark3D[];
  readonly worldLandmarks: readonly Landmark3D[];
  readonly palmCenter: Point3D;
  readonly pointer: Point2D;
  readonly rawPointer: Point2D;
  readonly handSize: number;
  readonly bounds: HandBounds;
  readonly orientation?: HandOrientation;
  readonly gestureCandidates: readonly GestureCandidate[];
  readonly stableGesture: GestureName;
  readonly pinchRatio: number;
  readonly pinching: boolean;
  readonly velocity: Point2D;
  readonly speed: number;
  readonly acceleration: Point2D;
  readonly directionRad: number;
  readonly motion: 'still' | 'moving';
}

export interface FrameMetrics {
  readonly cameraFps: number;
  readonly inferenceFps: number;
  readonly renderFps: number;
  readonly inferenceMs: number;
  readonly eventLatencyMs: number;
  readonly droppedFrames: number;
  readonly modelLoadMs: number;
  readonly delegate: 'CPU' | 'GPU' | 'synthetic';
}

export interface HandFrame {
  readonly timestampMs: number;
  readonly sequence: number;
  readonly hands: readonly TrackedHand[];
  readonly metrics: FrameMetrics;
}

export interface TrackerConfig {
  readonly modelPath: string;
  readonly wasmPath: string;
  readonly numHands: 1 | 2;
  readonly delegate: 'CPU' | 'GPU';
  readonly minHandDetectionConfidence: number;
  readonly minHandPresenceConfidence: number;
  readonly minTrackingConfidence: number;
}

export interface TransferableFrame {
  readonly bitmap: ImageBitmap;
  readonly timestampMs: number;
}

export interface HandTracker {
  initialize(config: TrackerConfig): Promise<void>;
  detect(frame: TransferableFrame): Promise<readonly RawHandObservation[]>;
  updateConfig(config: Partial<TrackerConfig>): Promise<void>;
  close(): Promise<void>;
}

export interface Capability {
  readonly id: string;
  readonly label: string;
  readonly stage: 'Foundations' | 'Gestures' | 'Motion' | 'Interaction' | 'Spatial';
}

export interface HandUIDemoDefinition {
  readonly id: string;
  readonly route: string;
  readonly title: string;
  readonly description: string;
  readonly capabilities: readonly Capability[];
}

export const EMPTY_METRICS: FrameMetrics = {
  cameraFps: 0,
  inferenceFps: 0,
  renderFps: 0,
  inferenceMs: 0,
  eventLatencyMs: 0,
  droppedFrames: 0,
  modelLoadMs: 0,
  delegate: 'CPU',
};

export const EMPTY_FRAME: HandFrame = {
  timestampMs: 0,
  sequence: 0,
  hands: [],
  metrics: EMPTY_METRICS,
};
