import { describe, expect, it } from 'vitest';
import {
  boundsFromLandmarks,
  clamp,
  distance2D,
  estimateOrientation,
  handSize,
  mirrorLandmarks,
  palmCenter,
  pinchRatio,
  projectToViewport,
  shortestAngleDelta,
  subtract2D,
} from '../src/handui/math/geometry';
import { syntheticHand } from '../src/handui/testing/synthetic';

describe('geometry', () => {
  it('maps scalar and 2D helpers', () => {
    expect(clamp(8, 0, 4)).toBe(4);
    expect(clamp(-2, 0, 4)).toBe(0);
    expect(distance2D({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(subtract2D({ x: 4, y: 3 }, { x: 1, y: 1 })).toEqual({ x: 3, y: 2 });
    expect(projectToViewport({ x: 0.5, y: 0.25 }, 800, 400)).toEqual({ x: 400, y: 100 });
    expect(shortestAngleDelta(Math.PI * 0.9, -Math.PI * 0.9)).toBeCloseTo(Math.PI * 0.2);
  });

  it('derives palm values, mirrored coordinates, and bounds', () => {
    const landmarks = syntheticHand(0.3, 0.5).landmarks;
    const palm = palmCenter(landmarks);
    expect(palm.x).toBeGreaterThan(0.2);
    expect(handSize(landmarks)).toBeGreaterThan(0);
    expect(pinchRatio(landmarks)).toBeGreaterThan(0.32);
    expect(mirrorLandmarks([{ x: 0.2, y: 0.4, z: 0 }])[0]?.x).toBeCloseTo(0.8);
    const bounds = boundsFromLandmarks(landmarks);
    expect(bounds.min.x).toBeLessThan(bounds.max.x);
    expect(bounds.min.y).toBeLessThan(bounds.max.y);
  });

  it('handles missing and degenerate landmarks honestly', () => {
    expect(palmCenter([])).toEqual({ x: 0.5, y: 0.5, z: 0 });
    expect(handSize([])).toBe(0.1);
    expect(pinchRatio([])).toBe(Number.POSITIVE_INFINITY);
    expect(boundsFromLandmarks([])).toEqual({ min: { x: 0, y: 0 }, max: { x: 0, y: 0 } });
    expect(estimateOrientation([])).toBeUndefined();
    const degenerate = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
    expect(estimateOrientation(degenerate)).toBeUndefined();
  });

  it('builds an orthonormal orientation and normalized quaternion', () => {
    const orientation = estimateOrientation(syntheticHand(0.4, 0.5).worldLandmarks);
    expect(orientation).toBeDefined();
    if (!orientation) return;
    expect(
      Math.hypot(orientation.normal.x, orientation.normal.y, orientation.normal.z),
    ).toBeCloseTo(1);
    expect(
      Math.hypot(
        orientation.quaternion.x,
        orientation.quaternion.y,
        orientation.quaternion.z,
        orientation.quaternion.w,
      ),
    ).toBeCloseTo(1);
  });

  it('keeps quaternion conversion stable across 180-degree basis branches', () => {
    const basisPose = (
      x: readonly [number, number, number],
      y: readonly [number, number, number],
    ) => {
      const points = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
      points[5] = { x: x[0] / 2, y: x[1] / 2, z: x[2] / 2 };
      points[17] = { x: -x[0] / 2, y: -x[1] / 2, z: -x[2] / 2 };
      points[9] = { x: y[0], y: y[1], z: y[2] };
      return points;
    };
    const bases = [
      basisPose([1, 0, 0], [0, 1, 0]),
      basisPose([1, 0, 0], [0, -1, 0]),
      basisPose([-1, 0, 0], [0, 1, 0]),
      basisPose([-1, 0, 0], [0, -1, 0]),
    ];
    for (const basis of bases) {
      const orientation = estimateOrientation(basis);
      expect(orientation).toBeDefined();
      if (orientation)
        expect(
          Math.hypot(
            orientation.quaternion.x,
            orientation.quaternion.y,
            orientation.quaternion.z,
            orientation.quaternion.w,
          ),
        ).toBeCloseTo(1);
    }
    const missingPalm = Array.from({ length: 18 }) as { x: number; y: number; z: number }[];
    expect(palmCenter(missingPalm)).toEqual({ x: 0, y: 0, z: 0 });
  });
});
