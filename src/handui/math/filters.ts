import type { Point2D, Quaternion } from '../contracts/types';

export class EmaPointFilter {
  private value: Point2D | undefined;

  constructor(private alpha = 0.35) {}

  next(point: Point2D): Point2D {
    if (!this.value) this.value = point;
    else {
      this.value = {
        x: this.alpha * point.x + (1 - this.alpha) * this.value.x,
        y: this.alpha * point.y + (1 - this.alpha) * this.value.y,
      };
    }
    return this.value;
  }

  reset(): void {
    this.value = undefined;
  }
}

class LowPassFilter {
  private value?: number;

  next(value: number, alpha: number): number {
    this.value = this.value === undefined ? value : alpha * value + (1 - alpha) * this.value;
    return this.value;
  }
}

export class OneEuroPointFilter {
  private readonly x = new LowPassFilter();
  private readonly y = new LowPassFilter();
  private readonly dx = new LowPassFilter();
  private readonly dy = new LowPassFilter();
  private previous?: { point: Point2D; timestampMs: number };

  constructor(
    private minCutoff = 1,
    private beta = 0.007,
    private derivativeCutoff = 1,
  ) {}

  private alpha(cutoff: number, dt: number): number {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  next(point: Point2D, timestampMs: number): Point2D {
    if (!this.previous) {
      this.previous = { point, timestampMs };
      return { x: this.x.next(point.x, 1), y: this.y.next(point.y, 1) };
    }
    const dt = Math.max((timestampMs - this.previous.timestampMs) / 1000, 1 / 120);
    const velocity = {
      x: (point.x - this.previous.point.x) / dt,
      y: (point.y - this.previous.point.y) / dt,
    };
    const derivativeAlpha = this.alpha(this.derivativeCutoff, dt);
    const edx = this.dx.next(velocity.x, derivativeAlpha);
    const edy = this.dy.next(velocity.y, derivativeAlpha);
    const cutoffX = this.minCutoff + this.beta * Math.abs(edx);
    const cutoffY = this.minCutoff + this.beta * Math.abs(edy);
    const result = {
      x: this.x.next(point.x, this.alpha(cutoffX, dt)),
      y: this.y.next(point.y, this.alpha(cutoffY, dt)),
    };
    this.previous = { point, timestampMs };
    return result;
  }
}

export function slerpQuaternion(a: Quaternion, b: Quaternion, t: number): Quaternion {
  let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
  const target = dot < 0 ? { x: -b.x, y: -b.y, z: -b.z, w: -b.w } : b;
  dot = Math.abs(dot);
  if (dot > 0.9995) {
    const result = {
      x: a.x + t * (target.x - a.x),
      y: a.y + t * (target.y - a.y),
      z: a.z + t * (target.z - a.z),
      w: a.w + t * (target.w - a.w),
    };
    const length = Math.hypot(result.x, result.y, result.z, result.w) || 1;
    return {
      x: result.x / length,
      y: result.y / length,
      z: result.z / length,
      w: result.w / length,
    };
  }
  const theta = Math.acos(dot);
  const sinTheta = Math.sin(theta);
  const fromWeight = Math.sin((1 - t) * theta) / sinTheta;
  const toWeight = Math.sin(t * theta) / sinTheta;
  return {
    x: a.x * fromWeight + target.x * toWeight,
    y: a.y * fromWeight + target.y * toWeight,
    z: a.z * fromWeight + target.z * toWeight,
    w: a.w * fromWeight + target.w * toWeight,
  };
}
