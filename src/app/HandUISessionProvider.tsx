import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { HandUISession } from '../handui/runtime/session';
import type { RuntimeSnapshot } from '../handui/runtime/store';

const SessionContext = createContext<HandUISession | null>(null);

export function HandUISessionProvider({ children }: { readonly children: ReactNode }) {
  const [session] = useState(() => new HandUISession());
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const stop = () => void session.stop();
    window.addEventListener('pagehide', stop);
    return () => {
      mounted.current = false;
      window.removeEventListener('pagehide', stop);
      queueMicrotask(() => {
        if (!mounted.current) void session.dispose();
      });
    };
  }, [session]);

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useHandUISession(): HandUISession {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useHandUISession must be used inside HandUISessionProvider.');
  return session;
}

export function useHandUISnapshot(): RuntimeSnapshot {
  const session = useHandUISession();
  return useSyncExternalStore(
    session.store.subscribe,
    session.store.getSnapshot,
    session.store.getSnapshot,
  );
}
