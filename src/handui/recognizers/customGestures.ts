import type { GestureCandidate, Handedness, Landmark3D } from '../contracts/types';
import { pinchRatio } from '../math/geometry';

const FINGER_JOINTS = [
  [8, 6],
  [12, 10],
  [16, 14],
  [20, 18],
] as const;

export function countExtendedFingers(
  landmarks: readonly Landmark3D[],
  handedness: Handedness,
): number {
  let count = FINGER_JOINTS.filter(([tip, pip]) => {
    const tipPoint = landmarks[tip];
    const pipPoint = landmarks[pip];
    return Boolean(tipPoint && pipPoint && tipPoint.y < pipPoint.y);
  }).length;
  const thumbTip = landmarks[4];
  const thumbJoint = landmarks[3];
  if (thumbTip && thumbJoint) {
    const extended = handedness === 'left' ? thumbTip.x > thumbJoint.x : thumbTip.x < thumbJoint.x;
    if (extended) count += 1;
  }
  return count;
}

export function customGestureCandidates(
  landmarks: readonly Landmark3D[],
  handedness: Handedness,
): readonly GestureCandidate[] {
  const fingers = countExtendedFingers(landmarks, handedness);
  const ratio = pinchRatio(landmarks);
  const candidates: GestureCandidate[] = [];
  if (ratio <= 0.32) candidates.push({ name: 'pinch', confidence: 1 - ratio, source: 'landmarks' });
  if (fingers <= 1) candidates.push({ name: 'grab', confidence: 0.82, source: 'landmarks' });
  if (fingers >= 5) candidates.push({ name: 'flat-hand', confidence: 0.8, source: 'landmarks' });
  return candidates;
}
