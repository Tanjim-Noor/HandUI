# Testing

## Local gates

Run `pnpm validate` after each change batch. It checks formatting, lint, types, coverage, assets, production build, and Chromium E2E. Run `pnpm test:e2e` to repeat rendered flows in both Chromium and installed desktop Edge.

## Layers

- Unit: coordinates, geometry, filters, identity, temporal stability, transforms, springs, quaternions.
- Replay: deterministic normalized hand sequences without webcam hardware.
- Component: camera states, controls, developer panel, fallback inputs.
- Browser: app identity, routes, worker assets, synthetic demo, privacy request allowlist.
- Manual: lighting, distance, handedness, speed, occlusion, two-hand crossing, camera selection.

Pure math and recognizer coverage gates: 90% lines/functions and 85% branches.

## Manual performance targets

- Median render loop at least 55 FPS.
- p95 inference at most 50 ms at adaptive rate.
- p95 frame-to-event latency at most 100 ms.
- No queued stale frames or resources after stop/unmount.
