import type {
  HandBounds,
  HandOrientation,
  Landmark3D,
  Point2D,
  Point3D,
  Quaternion,
} from '../contracts/types';

const PALM_INDICES = [0, 5, 9, 13, 17] as const;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function distance2D(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function subtract2D(a: Point2D, b: Point2D): Point2D {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function palmCenter(landmarks: readonly Landmark3D[]): Point3D {
  if (landmarks.length < 18) return { x: 0.5, y: 0.5, z: 0 };
  const sum = PALM_INDICES.reduce(
    (acc, index) => {
      const point = landmarks[index];
      if (!point) return acc;
      return { x: acc.x + point.x, y: acc.y + point.y, z: acc.z + point.z };
    },
    { x: 0, y: 0, z: 0 },
  );
  return {
    x: sum.x / PALM_INDICES.length,
    y: sum.y / PALM_INDICES.length,
    z: sum.z / PALM_INDICES.length,
  };
}

export function handSize(landmarks: readonly Landmark3D[]): number {
  const indexMcp = landmarks[5];
  const pinkyMcp = landmarks[17];
  if (!indexMcp || !pinkyMcp) return 0.1;
  return Math.max(distance2D(indexMcp, pinkyMcp), 0.001);
}

export function pinchRatio(landmarks: readonly Landmark3D[]): number {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  if (!thumbTip || !indexTip) return Number.POSITIVE_INFINITY;
  return distance2D(thumbTip, indexTip) / handSize(landmarks);
}

export function boundsFromLandmarks(landmarks: readonly Landmark3D[]): HandBounds {
  if (landmarks.length === 0) return { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } };
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const point of landmarks) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
}

export function mirrorLandmarks(landmarks: readonly Landmark3D[]): readonly Landmark3D[] {
  return landmarks.map((point) => ({ x: 1 - point.x, y: point.y, z: point.z }));
}

export function projectToViewport(point: Point2D, width: number, height: number): Point2D {
  return { x: point.x * width, y: point.y * height };
}

function vector(a: Point3D, b: Point3D): Point3D {
  return { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
}

function normalize(value: Point3D): Point3D | undefined {
  const length = Math.hypot(value.x, value.y, value.z);
  if (length < 1e-6) return undefined;
  return { x: value.x / length, y: value.y / length, z: value.z / length };
}

function cross(a: Point3D, b: Point3D): Point3D {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

function matrixToQuaternion(xAxis: Point3D, yAxis: Point3D, zAxis: Point3D): Quaternion {
  const m00 = xAxis.x;
  const m01 = yAxis.x;
  const m02 = zAxis.x;
  const m10 = xAxis.y;
  const m11 = yAxis.y;
  const m12 = zAxis.y;
  const m20 = xAxis.z;
  const m21 = yAxis.z;
  const m22 = zAxis.z;
  const trace = m00 + m11 + m22;
  let x: number;
  let y: number;
  let z: number;
  let w: number;
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2;
    w = 0.25 * s;
    x = (m21 - m12) / s;
    y = (m02 - m20) / s;
    z = (m10 - m01) / s;
  } else if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
    w = (m21 - m12) / s;
    x = 0.25 * s;
    y = (m01 + m10) / s;
    z = (m02 + m20) / s;
  } else if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
    w = (m02 - m20) / s;
    x = (m01 + m10) / s;
    y = 0.25 * s;
    z = (m12 + m21) / s;
  } else {
    const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
    w = (m10 - m01) / s;
    x = (m02 + m20) / s;
    y = (m12 + m21) / s;
    z = 0.25 * s;
  }
  const length = Math.hypot(x, y, z, w) || 1;
  return { x: x / length, y: y / length, z: z / length, w: w / length };
}

export function estimateOrientation(
  worldLandmarks: readonly Landmark3D[],
): HandOrientation | undefined {
  const wrist = worldLandmarks[0];
  const index = worldLandmarks[5];
  const middle = worldLandmarks[9];
  const pinky = worldLandmarks[17];
  if (!wrist || !index || !middle || !pinky) return undefined;
  const xAxis = normalize(vector(pinky, index));
  const towardFingers = normalize(vector(wrist, middle));
  if (!xAxis || !towardFingers) return undefined;
  const normal = normalize(cross(xAxis, towardFingers));
  if (!normal) return undefined;
  const yAxis = normalize(cross(normal, xAxis));
  if (!yAxis) return undefined;
  return { xAxis, yAxis, normal, quaternion: matrixToQuaternion(xAxis, yAxis, normal) };
}

export function shortestAngleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}
