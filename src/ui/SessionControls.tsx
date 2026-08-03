import { useEffect, useState } from 'react';
import { useHandUISession, useHandUISnapshot } from '../app/HandUISessionProvider';
import type { CameraDevice } from '../handui/tracking/camera';

export function SessionControls() {
  const session = useHandUISession();
  const snapshot = useHandUISnapshot();
  const [devices, setDevices] = useState<readonly CameraDevice[]>([]);

  useEffect(() => {
    if (snapshot.status === 'running' && !snapshot.synthetic)
      void session.devices().then(setDevices);
  }, [session, snapshot.status, snapshot.synthetic]);

  const busy = snapshot.status === 'requesting-camera' || snapshot.status === 'loading-model';
  return (
    <div className="session-controls" aria-label="Tracking session controls">
      <span className={`status-dot status-${snapshot.status}`} aria-hidden="true" />
      <span className="status-copy">
        {busy
          ? 'Preparing local vision'
          : snapshot.synthetic
            ? 'Synthetic replay'
            : snapshot.status}
      </span>
      {devices.length > 1 && !snapshot.synthetic ? (
        <select
          aria-label="Camera device"
          onChange={(event) => void session.startCamera(event.target.value)}
        >
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>
      ) : null}
      {snapshot.status !== 'running' ? (
        <button
          className="button-primary"
          onClick={() => void session.startCamera()}
          disabled={busy}
        >
          Start camera
        </button>
      ) : (
        <button className="button-quiet" onClick={() => void session.stop()}>
          Stop
        </button>
      )}
      {!snapshot.synthetic ? (
        <button className="button-quiet" onClick={() => session.startSynthetic()}>
          Try replay
        </button>
      ) : null}
    </div>
  );
}
