# HandUI agent guide

HandUI is a browser-local React/TypeScript gallery for webcam hand interaction.

## Boundaries

- UI and demos depend on model-neutral `src/handui/contracts`, never MediaPipe types.
- Only `src/handui/tracking/mediapipe` and its worker may import `@mediapipe/tasks-vision`.
- Camera/model initialization belongs to the shared session, never individual demos.
- Pure geometry, filters, recognizers, and transforms require fixture-based unit tests.
- High-frequency values use runtime snapshots, refs, Canvas, or CSS transforms—not React state per frame.
- Three.js code stays lazy inside spatial demo modules.
- Do not add backends, telemetry, analytics, overlapping state/animation libraries, or runtime CDN assets.
- Public event contracts require documentation and an ADR before incompatible changes.
- Stop camera tracks, workers, animation frames, WebGL resources, and subscriptions on teardown.

## Commands

```text
pnpm install
pnpm assets:sync
pnpm dev
pnpm validate
pnpm test:e2e
```

Keep changes scoped. Update relevant docs and propose a focused commit message after each major batch.
