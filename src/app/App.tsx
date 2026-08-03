import { lazy, Suspense, useEffect } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { useHandUISession, useHandUISnapshot } from './HandUISessionProvider';
import { demoById, demos } from '../demos/registry';
import { CapabilityRail } from '../ui/CapabilityRail';
import { DemoOverlay } from '../ui/DemoOverlay';
import { DeveloperPanel } from '../ui/DeveloperPanel';
import { LandmarkCanvas } from '../ui/LandmarkCanvas';
import { SessionControls } from '../ui/SessionControls';
import styles from './App.module.css';

const OrientationDemo = lazy(() => import('../demos/OrientationDemo'));

function Header() {
  return (
    <header className={styles.header}>
      <Link to="/" className={styles.brand}>
        <span>H</span>HandUI <small>/ lab 01</small>
      </Link>
      <nav>
        <NavLink to="/gallery/landmarks">Gallery</NavLink>
        <NavLink to="/architecture">Architecture</NavLink>
        <NavLink to="/privacy">Privacy</NavLink>
      </nav>
      <a href="https://github.com/Tanjim-Noor/HandUI" className={styles.source}>
        View source ↗
      </a>
    </header>
  );
}

function Home() {
  const session = useHandUISession();
  useEffect(() => session.startSynthetic(), [session]);
  return (
    <main className={styles.home}>
      <section className={styles.hero}>
        <p className="eyebrow">Browser-local spatial interaction</p>
        <h1>
          Control the interface
          <br />
          <em>with your hands.</em>
        </h1>
        <p>
          A capability gallery for learning what hand tracking can—and cannot—do inside a modern
          browser. Frames stay on this device.
        </p>
        <div>
          <Link className="button-primary" to="/gallery/landmarks">
            Enter the lab
          </Link>
          <Link className="button-quiet" to="/architecture">
            Inspect architecture
          </Link>
        </div>
      </section>
      <section className={styles.preview}>
        <LandmarkCanvas className={styles.previewCanvas} />
        <div className={styles.previewGrid} />
        <div className={styles.previewLabel}>
          <span>LIVE / REPLAY READY</span>
          <strong>Two-hand observation field</strong>
        </div>
      </section>
      <section className={styles.capabilityStrip}>
        {demos.slice(0, 4).map((demo) => (
          <Link to={demo.route} key={demo.id}>
            <span>{demo.capabilities[0]?.id}</span>
            <strong>{demo.title}</strong>
            <small>{demo.description}</small>
          </Link>
        ))}
      </section>
    </main>
  );
}

function Gallery() {
  const { demoId } = useParams();
  const demo = demoById(demoId);
  const session = useHandUISession();
  const snapshot = useHandUISnapshot();
  const spatial = demo.id === 'orientation';
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      if (event.key === 'Escape') session.processor.endTransform('cancelled');
    };
    window.addEventListener('keydown', cancel);
    return () => {
      window.removeEventListener('keydown', cancel);
      session.processor.endTransform('route-change');
    };
  }, [demo.id, session]);
  return (
    <main className={styles.gallery}>
      <CapabilityRail />
      <section className={styles.lab}>
        <div className={styles.labIntro}>
          <div>
            <p className="eyebrow">{demo.capabilities.map((item) => item.id).join(' / ')}</p>
            <h1>{demo.title}</h1>
            <p>{demo.description}</p>
          </div>
          <SessionControls />
        </div>
        {snapshot.error ? (
          <div className="error-banner">
            <strong>Session needs attention.</strong> {snapshot.error}{' '}
            <button onClick={() => session.startSynthetic()}>Use replay</button>
          </div>
        ) : null}
        <div className={styles.stage}>
          {spatial ? (
            <Suspense
              fallback={<div className="stage-loader">Loading route-local 3D renderer…</div>}
            >
              <OrientationDemo />
            </Suspense>
          ) : (
            <>
              <LandmarkCanvas className={styles.stageCanvas} />
              <div className={styles.stageGrid} />
              <DemoOverlay demo={demo} />
            </>
          )}
          <div className={styles.stageCorner}>
            MIRRORED INTERACTION SPACE
            <br />
            640 × 360 INFERENCE
          </div>
        </div>
        <footer className={styles.stageFooter}>
          <span>Camera frames never leave this tab</span>
          <span>
            {snapshot.frame.hands.length} hands · {snapshot.frame.metrics.delegate}
          </span>
          <span>ESC cancels transforms</span>
        </footer>
      </section>
      <DeveloperPanel />
    </main>
  );
}

function Architecture() {
  return (
    <main className={styles.article}>
      <p className="eyebrow">Model-neutral by construction</p>
      <h1>
        One sensing pipeline.
        <br />
        Many interaction surfaces.
      </h1>
      <p className={styles.lede}>
        Camera frames cross into a dedicated worker. Only normalized observations return to the main
        thread, where deterministic recognizers emit renderer-neutral events.
      </p>
      <div className={styles.flow}>
        {[
          'Camera + rVFC',
          'Latest frame worker',
          'MediaPipe adapter',
          'Geometry + stability',
          'Semantic events',
          'DOM / Canvas / 3D',
        ].map((item, index) => (
          <div key={item}>
            <span>0{index + 1}</span>
            <strong>{item}</strong>
          </div>
        ))}
      </div>
      <Link className="button-primary" to="/gallery/landmarks">
        Open diagnostics
      </Link>
    </main>
  );
}

function Privacy() {
  return (
    <main className={styles.article}>
      <p className="eyebrow">Zero-third-party camera session</p>
      <h1>
        Your camera is an input,
        <br />
        not a data source.
      </h1>
      <p className={styles.lede}>
        HandUI does not record, upload, persist, analyze, or instrument camera frames. The pinned
        gesture model and WASM files are copied during setup and served from this same origin at
        runtime.
      </p>
      <div className={styles.privacyGrid}>
        <article>
          <span>01</span>
          <h2>On-device inference</h2>
          <p>A dedicated browser worker runs every recognition pass locally.</p>
        </article>
        <article>
          <span>02</span>
          <h2>No telemetry</h2>
          <p>No analytics, backend, account, cookies, or behavioral recording.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Visible lifecycle</h2>
          <p>A persistent indicator and stop control expose camera state.</p>
        </article>
      </div>
    </main>
  );
}

function Lifecycle() {
  const location = useLocation();
  const session = useHandUISession();
  useEffect(() => {
    if (!location.pathname.startsWith('/gallery') && location.pathname !== '/')
      void session.stop(true, 'route-change');
  }, [location.pathname, session]);
  return null;
}

export default function App() {
  return (
    <div className={styles.app}>
      <Lifecycle />
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/gallery/:demoId" element={<Gallery />} />
        <Route path="/architecture" element={<Architecture />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <div className={styles.scanline} aria-hidden="true" />
    </div>
  );
}
