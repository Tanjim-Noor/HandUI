import type { GestureCandidate, Landmark3D, RawHandObservation } from '../contracts/types';

const HAND_TEMPLATE: readonly Landmark3D[] = [
  { x: 0.5, y: 0.86, z: 0 },
  { x: 0.42, y: 0.76, z: -0.01 },
  { x: 0.35, y: 0.66, z: -0.02 },
  { x: 0.28, y: 0.58, z: -0.03 },
  { x: 0.2, y: 0.52, z: -0.04 },
  { x: 0.4, y: 0.59, z: -0.03 },
  { x: 0.38, y: 0.44, z: -0.04 },
  { x: 0.37, y: 0.29, z: -0.05 },
  { x: 0.36, y: 0.14, z: -0.06 },
  { x: 0.5, y: 0.56, z: -0.04 },
  { x: 0.5, y: 0.38, z: -0.05 },
  { x: 0.5, y: 0.21, z: -0.06 },
  { x: 0.5, y: 0.06, z: -0.07 },
  { x: 0.59, y: 0.59, z: -0.03 },
  { x: 0.61, y: 0.43, z: -0.04 },
  { x: 0.62, y: 0.29, z: -0.05 },
  { x: 0.63, y: 0.17, z: -0.06 },
  { x: 0.67, y: 0.65, z: -0.02 },
  { x: 0.71, y: 0.53, z: -0.03 },
  { x: 0.74, y: 0.42, z: -0.04 },
  { x: 0.77, y: 0.32, z: -0.05 },
];

function transformTemplate(
  centerX: number,
  centerY: number,
  scale: number,
  pinch: boolean,
): readonly Landmark3D[] {
  const points = HAND_TEMPLATE.map((point) => ({
    x: centerX + (point.x - 0.5) * scale,
    y: centerY + (point.y - 0.5) * scale,
    z: point.z * scale,
  }));
  if (pinch && points[4] && points[8]) points[4] = { ...points[8], x: points[8].x + 0.012 * scale };
  return points;
}

export function syntheticHand(
  centerX: number,
  centerY: number,
  options: { pinch?: boolean; gesture?: GestureCandidate['name']; mirrored?: boolean } = {},
): RawHandObservation {
  const landmarks = transformTemplate(centerX, centerY, 0.62, options.pinch ?? false);
  const worldLandmarks = landmarks.map((point) => ({
    x: point.x - centerX,
    y: centerY - point.y,
    z: point.z,
  }));
  const gesture = options.gesture ?? (options.pinch ? 'pinch' : 'open-palm');
  return {
    landmarks,
    worldLandmarks,
    handedness: { label: centerX < 0.5 ? 'right' : 'left', confidence: 0.96 },
    gestureCandidates: [
      { name: gesture, confidence: 0.96, source: gesture === 'pinch' ? 'landmarks' : 'model' },
    ],
  };
}

export function syntheticSequence(timestampMs: number): readonly RawHandObservation[] {
  const t = timestampMs / 1000;
  const leftX = 0.32 + Math.sin(t * 0.7) * 0.05;
  const rightX = 0.68 + Math.cos(t * 0.65) * 0.05;
  const pinch = Math.floor(t / 3) % 2 === 1;
  return [
    syntheticHand(leftX, 0.5 + Math.cos(t) * 0.04, {
      pinch,
      gesture: pinch ? 'pinch' : 'open-palm',
    }),
    syntheticHand(rightX, 0.5 + Math.sin(t * 0.8) * 0.04, {
      pinch,
      gesture: pinch ? 'pinch' : 'open-palm',
    }),
  ];
}
