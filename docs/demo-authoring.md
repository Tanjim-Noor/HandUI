# Demo authoring

Each exhibit exports a `HandUIDemoDefinition` and a lazy React component.

Requirements:

1. Declare needed capabilities.
2. Read shared runtime state; never initialize camera or tracker.
3. Keep gesture/math logic outside JSX.
4. Provide a concise input → processing → output explanation.
5. Use shared stage, metrics, controls, and developer-panel components.
6. Provide mouse or keyboard fallback where practical.
7. Add unit/replay tests for new recognizers and component tests for state transitions.
8. Clean animation frames, listeners, subscriptions, and renderer resources.

Avoid importing from other demos. Shared behavior belongs in `src/handui` or `src/ui`.
