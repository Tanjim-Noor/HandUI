import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { Quaternion, type Group } from 'three';
import { useHandUISession } from '../app/HandUISessionProvider';

function Instrument({ neutralSignal }: { readonly neutralSignal: number }) {
  const session = useHandUISession();
  const group = useRef<Group>(null);
  const neutral = useRef(new Quaternion());
  const stage = useRef({ x: 0, y: 0, scale: 1, rotation: 0 });
  useEffect(() => {
    const hand = session.store.getSnapshot().frame.hands[0];
    const source = hand?.orientation?.quaternion;
    if (source) neutral.current.set(source.x, source.y, source.z, source.w).invert();
  }, [neutralSignal, session]);
  useEffect(() => {
    const move = session.processor.events.on('transform:move', (event) => {
      stage.current = {
        x: event.detail.translation.x * 3,
        y: -event.detail.translation.y * 2,
        scale: event.detail.scale,
        rotation: event.detail.rotationRad,
      };
    });
    const key = (event: KeyboardEvent) => {
      const value = stage.current;
      if (event.key === 'ArrowLeft') value.x -= 0.1;
      else if (event.key === 'ArrowRight') value.x += 0.1;
      else if (event.key === 'ArrowUp') value.y += 0.1;
      else if (event.key === 'ArrowDown') value.y -= 0.1;
      else if (event.key === '+' || event.key === '=') value.scale = Math.min(2, value.scale + 0.1);
      else if (event.key === '-') value.scale = Math.max(0.5, value.scale - 0.1);
      else if (event.key.toLowerCase() === 'r') value.rotation += 0.1;
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', key);
    return () => {
      move();
      window.removeEventListener('keydown', key);
    };
  }, [session]);
  useFrame((_, delta) => {
    const hand = session.store.getSnapshot().frame.hands[0];
    if (!group.current) return;
    if (hand?.orientation) {
      const q = hand.orientation.quaternion;
      group.current.quaternion.set(q.x, q.y, q.z, q.w).premultiply(neutral.current).normalize();
    } else group.current.rotation.y += delta * 0.18;
    group.current.position.set(stage.current.x, stage.current.y, 0);
    group.current.scale.setScalar(stage.current.scale);
    group.current.rotation.z += (stage.current.rotation - group.current.rotation.z) * 0.18;
  });
  return (
    <group ref={group}>
      <mesh castShadow>
        <icosahedronGeometry args={[1.05, 1]} />
        <meshStandardMaterial color="#112b38" metalness={0.72} roughness={0.28} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.35, 0.025, 10, 96]} />
        <meshBasicMaterial color="#55e7ff" />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[1.18, 0.018, 10, 96]} />
        <meshBasicMaterial color="#b7ff52" />
      </mesh>
    </group>
  );
}

export default function OrientationDemo() {
  const [neutralSignal, setNeutralSignal] = useState(0);
  return (
    <div className="orientation-stage" aria-label="Procedural 3D hand orientation exhibit">
      <Canvas
        camera={{ position: [0, 0, 4.2], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 4, 5]} intensity={3} color="#dffbff" />
        <pointLight position={[-4, -2, 2]} intensity={8} color="#55e7ff" />
        <Instrument neutralSignal={neutralSignal} />
      </Canvas>
      <div className="orientation-copy">
        <span>D1—D4</span>
        <strong>Palm quaternion</strong>
        <small>Move palm · mouse orbit intentionally absent · replay supported</small>
        <button className="button-quiet" onClick={() => setNeutralSignal((value) => value + 1)}>
          Set neutral
        </button>
      </div>
    </div>
  );
}
