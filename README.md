# HandUI

HandUI is a browser-local capability gallery for real-time hand tracking, gestures, motion, and spatial UI interaction through a normal webcam.

Public source: [Tanjim-Noor/HandUI](https://github.com/Tanjim-Noor/HandUI). No live deployment is provided by design.

The project is a proof of concept and learning portfolio, not a replacement for mouse, keyboard, or assistive technology. Camera frames are processed locally and are never recorded or uploaded.

## Status

Release-ready proof of concept. Supported target: current desktop Chrome and Edge.

Implemented foundation includes:

- Shared camera and MediaPipe worker runtime
- Model-neutral hand state and semantic events
- Landmark, gesture, smoothing, pointer, magnetic, and two-hand exhibits
- Lazy 3D orientation exhibit
- Synthetic replay mode for testing without a camera
- Mouse and keyboard alternatives

## Set up and run locally

### Prerequisites

- [Node.js 24](https://nodejs.org/)
- pnpm 11 (the repository pins `pnpm@11.9.0`)
- Current desktop Chrome or Microsoft Edge
- A webcam is optional because the gallery includes synthetic replay mode

If PowerShell reports that `pnpm` is not recognized, install the pinned version with npm:

```powershell
npm install --global pnpm@11.9.0
```

Close and reopen PowerShell after installation so the updated `PATH` is loaded. Then confirm the installed versions:

```powershell
node --version
pnpm --version
```

Expected major versions are Node `24` and pnpm `11`. This user-level pnpm installation does not require an administrator terminal under the default npm configuration.

### 1. Clone the repository

```powershell
git clone https://github.com/Tanjim-Noor/HandUI.git
cd HandUI
```

If the repository is already on your computer, open a terminal in its root directory instead.

### 2. Install dependencies

```powershell
pnpm install
```

### 3. Download and verify the local vision assets

```powershell
pnpm assets:sync
pnpm assets:verify
```

`assets:sync` explicitly downloads the pinned MediaPipe gesture model, copies the WASM binaries into `public/vendor/mediapipe/`, and prepares version-pinned worker loader modules under `.generated/`. These generated files are intentionally excluded from Git. The checksum verification fails if the model differs from the version recorded in `assets/manifest.json`, and asset verification fails if the loader compatibility shim is missing.

After setup, the website serves its model and WASM assets from the same origin. Camera frames are not uploaded.

### 4. Start the development website

```powershell
pnpm dev
```

Open the local URL printed by Vite, usually [http://localhost:5173](http://localhost:5173).

In the gallery:

- Select **Start camera** to grant webcam permission and run local hand tracking.
- Select **Try replay** to explore all core UI behavior without a webcam or permission prompt.
- Select **Stop** before leaving if you want to end the camera session immediately.

Camera access works on `localhost`. Any future remote host would need HTTPS.

### Production build and preview

To verify the optimized static website locally:

```powershell
pnpm build
pnpm preview
```

Open the preview URL printed in the terminal, usually [http://localhost:4173](http://localhost:4173). Stop either server with `Ctrl+C`.

### Common setup problems

- **Model or WASM file missing:** run `pnpm assets:sync`, then restart the development server.
- **Checksum verification failed:** delete only `public/vendor/mediapipe/` and rerun `pnpm assets:sync`.
- **Camera permission denied:** allow camera access in the browser site settings and reload, or use **Try replay**.
- **Camera unavailable:** close other applications using the webcam and check that Chrome or Edge can see the device.
- **Port already in use:** use the alternate URL Vite prints, or run `pnpm dev -- --port 5174`.

## Validation

```powershell
pnpm validate
pnpm test:e2e
```

## Architecture

```text
Camera → latest-frame scheduler → tracking worker → normalized hand frame
       → filters/recognizers → semantic events → interaction mapper → demo
```

MediaPipe is confined to an adapter. Demos consume normalized hand state and semantic events. See [architecture](docs/architecture.md), [event model](docs/event-model.md), and [demo authoring](docs/demo-authoring.md).

## Privacy

- No recording, upload, analytics, or cloud inference.
- Model/WASM files are same-origin at runtime.
- Camera has persistent active state and explicit stop control.
- Media tracks stop on gallery exit, page lifecycle teardown, or fatal error.
- Network privacy is enforced by CSP and tested with browser request auditing.
- Runtime errors are retained only in memory and shown in the developer panel; they are never uploaded or persisted. See [error logging](docs/error-logging.md).

## Known limitations

- Monocular depth and orientation are estimates.
- Occlusion, lighting, motion blur, and fatigue affect results.
- MediaPipe Tasks Vision is a preview API and is version-pinned.
- Mobile, Firefox, and Safari are not first-release targets.
- A live HTTPS deployment is intentionally deferred.

## Contributing

Read [AGENTS.md](AGENTS.md). Keep model boundaries intact, add replay fixtures for temporal logic, run `pnpm validate`, and document public event changes.

MIT licensed. Third-party components keep their own licenses and notices.
