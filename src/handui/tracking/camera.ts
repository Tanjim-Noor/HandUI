export interface CameraDevice {
  readonly deviceId: string;
  readonly label: string;
}

export class CameraController {
  readonly video: HTMLVideoElement;
  private stream: MediaStream | undefined;

  constructor() {
    this.video = document.createElement('video');
    this.video.autoplay = true;
    this.video.muted = true;
    this.video.playsInline = true;
  }

  async start(deviceId?: string): Promise<MediaStream> {
    this.stop();
    const video: MediaTrackConstraints = {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30, max: 30 },
      ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' }),
    };
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: false, video });
    this.video.srcObject = this.stream;
    await this.video.play();
    return this.stream;
  }

  async devices(): Promise<readonly CameraDevice[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((device) => device.kind === 'videoinput')
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${index + 1}`,
      }));
  }

  stop(): void {
    for (const track of this.stream?.getTracks() ?? []) track.stop();
    this.stream = undefined;
    this.video.pause();
    this.video.srcObject = null;
  }

  active(): boolean {
    return this.stream?.getVideoTracks().some((track) => track.readyState === 'live') ?? false;
  }
}
