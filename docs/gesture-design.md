# Gesture design

Gestures are optional, visible, recoverable inputs. Every required exhibit provides conventional fallback controls.

## Defaults

- Candidate entry: confidence 0.75 for 150 ms.
- Continuation: 0.60; exit below 0.55 for 100 ms.
- Pinch entry: thumb-index distance divided by palm width ≤0.32.
- Pinch exit: ratio ≥0.42; minimum stability 100 ms.
- Hold events: maximum 10 Hz.

Named configuration lives in the runtime and appears in developer controls. Hysteresis prevents threshold chatter. Camera loss and route changes end active interactions with explicit reasons.

## Two hands

Both stable pinches engage a target. Midpoint translates, hand-distance ratio scales, and connecting-vector angle rotates. Releasing or losing either hand ends the transform.

Do not describe gesture control as universally faster or more accessible. Avoid long arm holds and hidden gestures.
