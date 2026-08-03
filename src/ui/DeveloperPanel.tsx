import { useHandUISnapshot } from '../app/HandUISessionProvider';

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function DeveloperPanel() {
  const { frame, events } = useHandUISnapshot();
  const hand = frame.hands[0];
  return (
    <aside className="developer-panel">
      <div className="panel-heading">
        <p className="eyebrow">Live diagnostics</p>
        <span>schema v1</span>
      </div>
      <div className="metric-grid">
        <Metric label="Hands" value={String(frame.hands.length)} />
        <Metric label="Inference" value={`${frame.metrics.inferenceMs.toFixed(1)} ms`} />
        <Metric label="Vision FPS" value={frame.metrics.inferenceFps.toFixed(0)} />
        <Metric label="Dropped" value={String(frame.metrics.droppedFrames)} />
      </div>
      <div className="readout">
        <p>
          <span>Gesture</span>
          <strong>{hand?.stableGesture ?? '—'}</strong>
        </p>
        <p>
          <span>Pinch ratio</span>
          <strong>{hand?.pinchRatio.toFixed(2) ?? '—'}</strong>
        </p>
        <p>
          <span>Handedness</span>
          <strong>
            {hand ? `${hand.handedness} ${(hand.handednessConfidence * 100).toFixed(0)}%` : '—'}
          </strong>
        </p>
        <p>
          <span>Motion</span>
          <strong>{hand?.motion ?? '—'}</strong>
        </p>
      </div>
      <details open>
        <summary>Thresholds</summary>
        <label>
          Gesture enter <output>0.75 / 150 ms</output>
          <input type="range" min="0" max="1" step="0.01" defaultValue="0.75" />
        </label>
        <label>
          Pinch enter <output>≤ 0.32</output>
          <input type="range" min="0.15" max="0.6" step="0.01" defaultValue="0.32" />
        </label>
        <label>
          EMA alpha <output>0.35</output>
          <input type="range" min="0.05" max="0.95" step="0.05" defaultValue="0.35" />
        </label>
      </details>
      <div className="event-log" aria-live="polite">
        <p className="eyebrow">Event stream</p>
        {events.length ? (
          events.map((event, index) => <code key={`${event}-${index}`}>{event}</code>)
        ) : (
          <span>Waiting for observations…</span>
        )}
      </div>
    </aside>
  );
}
