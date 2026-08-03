# Validation Record

Date: 2026-08-03

## Automated

- Formatting: pass.
- Oxlint: pass. Oxlint is used because the current typescript-eslint release does not yet support TypeScript 7.
- Strict TypeScript 7 project build: pass.
- Unit, replay, and component tests: 20 passed.
- Core math/recognizer coverage: 99.42% lines, 100% functions, 90.30% branches.
- Pinned model and same-origin WASM verification: pass.
- Production Vite build: pass.
- Chromium E2E: 3 passed.
- Microsoft Edge E2E: 3 passed.
- Session request audit: zero third-party HTTP requests.

## Visual and interaction QA

- Home and two-hand lab inspected in the in-app browser at 1440 x 900.
- Synthetic replay, route navigation, event diagnostics, and 3D route inspected with no console errors.
- Keyboard translation/scale/rotation and drag fallbacks passed automated browser tests.
- Compact 390 x 844 inspection showed no horizontal document overflow. Mobile remains unsupported for release.

## Hardware-dependent manual checks

Real-camera lighting, occlusion, physical handedness, camera switching, and measured inference p95 remain owner-device checks because automated validation uses deterministic replay. The UI exposes the required metrics and recovery states.
