import { useEffect, useRef } from 'react';
import { useHandUISession } from '../app/HandUISessionProvider';

const CONNECTIONS: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
];

export function LandmarkCanvas({ className }: { readonly className?: string | undefined }) {
  const session = useHandUISession();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(rect.width * scale));
      const height = Math.max(1, Math.round(rect.height * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const context = canvas.getContext('2d');
      if (!context) return;
      context.setTransform(scale, 0, 0, scale, 0, 0);
      context.clearRect(0, 0, rect.width, rect.height);
      const video = session.videoElement();
      if (video.readyState >= 2 && video.videoWidth) {
        context.save();
        context.translate(rect.width, 0);
        context.scale(-1, 1);
        context.globalAlpha = 0.44;
        context.drawImage(video, 0, 0, rect.width, rect.height);
        context.restore();
      }
      const hands = session.store.getSnapshot().frame.hands;
      for (const [handIndex, hand] of hands.entries()) {
        const hue = handIndex === 0 ? '#55e7ff' : '#b7ff52';
        context.strokeStyle = hue;
        context.lineWidth = 1.4;
        context.globalAlpha = 0.78;
        for (const [from, to] of CONNECTIONS) {
          const a = hand.interactionLandmarks[from];
          const b = hand.interactionLandmarks[to];
          if (!a || !b) continue;
          context.beginPath();
          context.moveTo(a.x * rect.width, a.y * rect.height);
          context.lineTo(b.x * rect.width, b.y * rect.height);
          context.stroke();
        }
        context.fillStyle = hue;
        for (const [index, point] of hand.interactionLandmarks.entries()) {
          context.globalAlpha = index === 8 || index === 4 ? 1 : 0.72;
          context.beginPath();
          context.arc(
            point.x * rect.width,
            point.y * rect.height,
            index === 8 ? 4.5 : 2.5,
            0,
            Math.PI * 2,
          );
          context.fill();
        }
        context.globalAlpha = 0.9;
        context.strokeRect(
          hand.bounds.min.x * rect.width,
          hand.bounds.min.y * rect.height,
          (hand.bounds.max.x - hand.bounds.min.x) * rect.width,
          (hand.bounds.max.y - hand.bounds.min.y) * rect.height,
        );
      }
      context.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [session]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label="Mirrored camera and hand landmark overlay"
    />
  );
}
