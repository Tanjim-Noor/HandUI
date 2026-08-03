export interface SpringState {
  position: number;
  velocity: number;
}

export function stepSpring(
  state: SpringState,
  target: number,
  dt: number,
  stiffness = 150,
  damping = 18,
): SpringState {
  const acceleration = stiffness * (target - state.position) - damping * state.velocity;
  const velocity = state.velocity + acceleration * dt;
  return { position: state.position + velocity * dt, velocity };
}

export class DampedSpring2D {
  private x: SpringState;
  private y: SpringState;

  constructor(position: { readonly x: number; readonly y: number }) {
    this.x = { position: position.x, velocity: 0 };
    this.y = { position: position.y, velocity: 0 };
  }

  step(target: { readonly x: number; readonly y: number }, dt: number) {
    this.x = stepSpring(this.x, target.x, dt);
    this.y = stepSpring(this.y, target.y, dt);
    return { x: this.x.position, y: this.y.position };
  }
}
