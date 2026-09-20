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
- GitHub Actions `validate`: pass on public `main` (run 30831791444).

## Visual and interaction QA

- Home and two-hand lab inspected in the in-app browser at 1440 x 900.
- Synthetic replay, route navigation, event diagnostics, and 3D route inspected with no console errors.
- Keyboard translation/scale/rotation and drag fallbacks passed automated browser tests.
- Compact 390 x 844 inspection showed no horizontal document overflow. Mobile remains unsupported for release.

## Hardware-dependent manual checks

Real-camera lighting, occlusion, physical handedness, camera switching, and measured inference p95 remain owner-device checks because automated validation uses deterministic replay. The UI exposes the required metrics and recovery states.

## 2026-08-04 startup and logging regression

- Fixed the development CSP conflict with the Vite React Refresh inline preamble while retaining the strict production policy.
- Fixed shared-session disposal during React Strict Mode effect replay.
- Added bounded local error records, global browser handlers, camera/worker logging, a React error boundary, and developer-panel diagnostics.
- Development browser check passed on the reported port `5173`: meaningful HandUI content, two synthetic hands, favicon present, and no relevant console warnings or errors.
- Canonical `pnpm validate` passed with 26 unit/replay/component tests and 3 Chromium E2E tests.

## 2026-08-04 MediaPipe development-loader regression

- Reproduced Vite rejecting `public/vendor/mediapipe/wasm/vision_wasm_internal.js?import` during camera startup.
- Confirmed that the pinned MediaPipe 1.0.1 loader requires classic-script debug-hook scoping even when adapted for a module worker.
- `assets:sync` now creates verified ESM-compatible loader inputs under ignored `.generated/`; runtime model and WASM requests remain same-origin.
- Added a fake-camera Chromium E2E that initializes the real worker, reaches the active tracking state, checks the local error log, audits third-party requests, and stops the session.
- Development page check on port `5173` passed without Vite overlay or console warnings/errors. Automated fake-camera worker initialization passed against both the development server and the production preview build.
