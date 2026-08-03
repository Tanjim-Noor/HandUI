import { useEffect, useRef, useState } from 'react';
import { useHandUISession, useHandUISnapshot } from '../app/HandUISessionProvider';
import type { HandUIDemoDefinition } from '../handui/contracts/types';
import { DampedSpring2D } from '../handui/interactions/spring';

function SpatialCard() {
  const session = useHandUISession();
  const cardRef = useRef<HTMLDivElement>(null);
  const transform = useRef({ x: 0, y: 0, scale: 1, rotation: 0 });

  useEffect(() => {
    const render = () => {
      const value = transform.current;
      if (cardRef.current)
        cardRef.current.style.transform = `translate3d(${value.x}px, ${value.y}px, 0) rotate(${value.rotation}rad) scale(${value.scale})`;
    };
    const move = session.processor.events.on('transform:move', (event) => {
      transform.current = {
        x: event.detail.translation.x * 420,
        y: event.detail.translation.y * 260,
        scale: event.detail.scale,
        rotation: event.detail.rotationRad,
      };
      render();
    });
    const key = (event: KeyboardEvent) => {
      const value = transform.current;
      if (event.key === 'ArrowLeft') value.x -= 10;
      else if (event.key === 'ArrowRight') value.x += 10;
      else if (event.key === 'ArrowUp') value.y -= 10;
      else if (event.key === 'ArrowDown') value.y += 10;
      else if (event.key === '+' || event.key === '=') value.scale = Math.min(2, value.scale + 0.1);
      else if (event.key === '-') value.scale = Math.max(0.5, value.scale - 0.1);
      else if (event.key.toLowerCase() === 'r') value.rotation += 0.12;
      else return;
      event.preventDefault();
      render();
    };
    window.addEventListener('keydown', key);
    return () => {
      move();
      window.removeEventListener('keydown', key);
    };
  }, [session]);

  return (
    <div ref={cardRef} className="spatial-card" tabIndex={0}>
      <span>Captured object</span>
      <strong>Pinch + move</strong>
      <small>Arrows move · +/− scale · R rotates</small>
    </div>
  );
}

function MagneticObject() {
  const session = useHandUISession();
  const objectRef = useRef<HTMLButtonElement>(null);
  const spring = useRef(new DampedSpring2D({ x: 0.5, y: 0.54 }));
  const target = useRef({ x: 0.5, y: 0.54 });
  useEffect(() => {
    let raf = 0;
    let previous = performance.now();
    const frame = (now: number) => {
      const hand = session.store.getSnapshot().frame.hands[0];
      if (hand?.stableGesture === 'closed-fist') target.current = hand.pointer;
      const point = spring.current.step(target.current, Math.min((now - previous) / 1000, 0.05));
      previous = now;
      if (objectRef.current)
        objectRef.current.style.transform = `translate(${(point.x - 0.5) * 360}px, ${(point.y - 0.54) * 220}px)`;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [session]);
  return (
    <button
      ref={objectRef}
      className="magnetic-orb"
      onPointerMove={(event) => {
        if (event.buttons)
          target.current = { x: event.clientX / innerWidth, y: event.clientY / innerHeight };
      }}
    >
      <span>F1</span>Attract
    </button>
  );
}

function PointerTarget() {
  const session = useHandUISession();
  const { frame } = useHandUISnapshot();
  const [activations, setActivations] = useState(0);
  const pointer = frame.hands[0]?.pointer;
  const active = pointer
    ? pointer.x > 0.38 && pointer.x < 0.62 && pointer.y > 0.32 && pointer.y < 0.7
    : false;
  const activeRef = useRef(active);
  activeRef.current = active;
  useEffect(
    () =>
      session.processor.events.on('pinch:start', () => {
        if (activeRef.current) setActivations((value) => value + 1);
      }),
    [session],
  );
  return (
    <>
      <button
        className={`pointer-target ${active ? 'hovered' : ''}`}
        onClick={() => setActivations((value) => value + 1)}
      >
        <span>{active ? 'Ready' : 'Acquire target'}</span>
        <strong>Pinch or click</strong>
        <small>{activations} activations</small>
      </button>
      {pointer ? (
        <span
          className="virtual-pointer"
          style={{ left: `${pointer.x * 100}%`, top: `${pointer.y * 100}%` }}
        />
      ) : null}
    </>
  );
}

function DragTarget() {
  const session = useHandUISession();
  const objectRef = useRef<HTMLButtonElement>(null);
  const position = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const render = () => {
    if (objectRef.current)
      objectRef.current.style.transform = `translate(${position.current.x}px, ${position.current.y}px)`;
  };
  useEffect(() => {
    const start = session.processor.events.on('pinch:start', () => {
      dragging.current = true;
    });
    const move = session.processor.events.on('pinch:move', (event) => {
      if (!dragging.current) return;
      position.current = {
        x: (event.detail.position.x - 0.5) * 420,
        y: (event.detail.position.y - 0.5) * 240,
      };
      render();
    });
    const end = session.processor.events.on('pinch:end', () => {
      dragging.current = false;
    });
    return () => {
      start();
      move();
      end();
    };
  }, [session]);
  return (
    <button
      ref={objectRef}
      className="drag-object"
      draggable
      onDragEnd={(event) => {
        position.current = {
          x: event.clientX - innerWidth / 2,
          y: event.clientY - innerHeight / 2,
        };
        render();
      }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 30 : 10;
        if (event.key === 'ArrowLeft') position.current.x -= step;
        else if (event.key === 'ArrowRight') position.current.x += step;
        else if (event.key === 'ArrowUp') position.current.y -= step;
        else if (event.key === 'ArrowDown') position.current.y += step;
        else return;
        event.preventDefault();
        render();
      }}
    >
      <span>E4 / movable</span>
      <strong>Grab this module</strong>
      <small>Pinch, mouse drag, or arrow keys</small>
    </button>
  );
}

export function DemoOverlay({ demo }: { readonly demo: HandUIDemoDefinition }) {
  const { frame } = useHandUISnapshot();
  const hand = frame.hands[0];
  if (demo.id === 'two-hand' || demo.id === 'showcase') return <SpatialCard />;
  if (demo.id === 'drag') return <DragTarget />;
  if (demo.id === 'magnetic') return <MagneticObject />;
  if (demo.id === 'pointer') return <PointerTarget />;
  if (demo.id === 'gestures')
    return (
      <div className="gesture-badge">
        <span>Stable gesture</span>
        <strong>{hand?.stableGesture ?? 'waiting'}</strong>
        <small>
          {hand
            ? `${(hand.gestureCandidates[0]?.confidence ?? 0).toFixed(2)} confidence`
            : 'show one or two hands'}
        </small>
      </div>
    );
  if (demo.id === 'motion')
    return (
      <div className="motion-readout">
        <span>velocity x {hand?.velocity.x.toFixed(2) ?? '—'}</span>
        <span>velocity y {hand?.velocity.y.toFixed(2) ?? '—'}</span>
        <strong>{hand?.speed.toFixed(2) ?? '0.00'} u/s</strong>
      </div>
    );
  return (
    <div className="tracking-label">
      <span>{frame.hands.length}/2 hands</span>
      <strong>
        {hand ? `${hand.handedness} hand · derived bounds` : 'Bring hands into frame'}
      </strong>
    </div>
  );
}
