import { describe, expect, it } from 'vitest';
import { EmaPointFilter, OneEuroPointFilter, slerpQuaternion } from '../src/handui/math/filters';
import { DampedSpring2D, stepSpring } from '../src/handui/interactions/spring';

describe('filters and spring', () => {
  it('smooths points with EMA and resets', () => {
    const filter = new EmaPointFilter(0.5);
    expect(filter.next({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(filter.next({ x: 1, y: 1 })).toEqual({ x: 0.5, y: 0.5 });
    filter.reset();
    expect(filter.next({ x: 1, y: 1 })).toEqual({ x: 1, y: 1 });
  });

  it('runs One Euro without overshooting a step', () => {
    const filter = new OneEuroPointFilter();
    expect(filter.next({ x: 0, y: 0 }, 0)).toEqual({ x: 0, y: 0 });
    const value = filter.next({ x: 1, y: 1 }, 16);
    expect(value.x).toBeGreaterThan(0);
    expect(value.x).toBeLessThan(1);
  });

  it('slerps normalized quaternions using short and general paths', () => {
    expect(slerpQuaternion({ x: 0, y: 0, z: 0, w: 1 }, { x: 0, y: 0, z: 0, w: 1 }, 0.5)).toEqual({
      x: 0,
      y: 0,
      z: 0,
      w: 1,
    });
    const value = slerpQuaternion({ x: 0, y: 0, z: 0, w: 1 }, { x: 0, y: 1, z: 0, w: 0 }, 0.5);
    expect(Math.hypot(value.x, value.y, value.z, value.w)).toBeCloseTo(1);
    const short = slerpQuaternion({ x: 0, y: 0, z: 0, w: 1 }, { x: 0, y: 0, z: 0, w: -1 }, 0.5);
    expect(Math.abs(short.w)).toBeCloseTo(1);
  });

  it('moves damped springs toward targets', () => {
    const state = stepSpring({ position: 0, velocity: 0 }, 1, 0.016);
    expect(state.position).toBeGreaterThan(0);
    const spring = new DampedSpring2D({ x: 0, y: 0 });
    const point = spring.step({ x: 1, y: -1 }, 0.016);
    expect(point.x).toBeGreaterThan(0);
    expect(point.y).toBeLessThan(0);
  });
});
