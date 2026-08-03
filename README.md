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

## Setup

Requirements: Node 24 and pnpm 11.

```powershell
pnpm install
pnpm assets:sync
pnpm dev
```

`assets:sync` explicitly downloads the pinned MediaPipe gesture model and copies WASM files from the pinned npm dependency. After setup, runtime requests stay on the app origin.

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

## Known limitations

- Monocular depth and orientation are estimates.
- Occlusion, lighting, motion blur, and fatigue affect results.
- MediaPipe Tasks Vision is a preview API and is version-pinned.
- Mobile, Firefox, and Safari are not first-release targets.
- A live HTTPS deployment is intentionally deferred.

## Contributing

Read [AGENTS.md](AGENTS.md). Keep model boundaries intact, add replay fixtures for temporal logic, run `pnpm validate`, and document public event changes.

MIT licensed. Third-party components keep their own licenses and notices.
