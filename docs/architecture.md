# Architecture

## Goals

HandUI separates capture, tracking, hand intelligence, semantic interaction, and rendering. Any tracker can be replaced without rewriting demos.

## Runtime

Main thread owns `getUserMedia`, the camera element, route shell, Canvas overlays, and DOM/Three rendering. A dedicated module worker owns MediaPipe creation, synchronous inference, and disposal.

Only one inference frame may be in flight. When inference is busy, the scheduler keeps at most one newer pending frame and closes anything older. Camera capture targets 1280×720 at 30 FPS; transferred inference frames use 640×360.

The worker returns `RawHandObservation[]`, not MediaPipe objects. Main-thread pure modules assign session hand IDs, normalize mirroring, derive geometry and orientation, smooth movement, stabilize gesture candidates, and emit semantic events.

## Dependency direction

```text
demos → interactions → semantic events → processed hand frames
                                         ↑
camera → worker client → tracking adapter → raw observations
```

No reverse dependencies. Model diagnostics live in runtime snapshots, not semantic event payloads.

## State

High-frequency state lives in a small external store. React uses `useSyncExternalStore` for readable diagnostics; Canvas and animation loops read snapshots directly. Camera state is shared across gallery routes.

## Rendering

- Canvas 2D: landmarks, trails, axes, and diagnostics.
- DOM/CSS: pointer targets, magnetic objects, and spatial cards.
- React Three Fiber: route-lazy procedural 3D exhibit only.

## Privacy

Runtime asset paths are same-origin. CSP limits connections. No analytics or persistence stores camera-derived data. Setup-time model download is explicit and checksum-verified.
