# Semantic event model

HandUI uses typed, cancelable `CustomEvent` objects dispatched by a dedicated `EventTarget`.

Current schema version: `1`.

```text
hand:found        hand:lost       hand:move
hand:orientation motion:change
gesture:start     gesture:hold    gesture:change     gesture:end
pinch:start       pinch:move      pinch:end
transform:start   transform:move  transform:end
```

Every detail includes schema version, monotonic timestamp, frame sequence, confidence, and session-scoped hand IDs. Coordinates remain normalized until viewport projection.

`preventDefault()` prevents downstream interaction mapping for that dispatch. It never suppresses sensing, state updates, or other listeners.

`transform:*` adds target, midpoint, translation, scale, rotation, and an end reason. MediaPipe result objects never cross this boundary.
