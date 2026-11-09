import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useStore } from '../state/store';
import { loadBackend, syncConfigured, type SyncBackend, type SyncUser } from './backend';
import { createSyncEngine } from './engine';

/** Wait this long after the last change before syncing, so a burst of taps becomes one upload. */
export const SYNC_DELAY_MS = 2000;

export type SyncStatus = 'off' | 'loading' | 'signed-out' | 'link-sent' | 'syncing' | 'synced' | 'error';

type SyncContextValue = {
  status: SyncStatus;
  user: SyncUser | null;
  linkEmail: string;
  error: string | null;
  lastSynced: number | null;
  sendLink: (email: string) => Promise<void>;
  /** Returns false (with `codeError` set) when the code is wrong or expired. */
  verifyCode: (code: string) => Promise<boolean>;
  codeError: string | null;
  cancelLink: () => void;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
};

const SyncContext = createContext<SyncContextValue | null>(null);

const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Signs in with an email link and keeps this device's progress in step with the cloud copy. */
export function SyncProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useStore();
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const configured = syncConfigured();
  const [backend, setBackend] = useState<SyncBackend | null>(null);
  const [user, setUser] = useState<SyncUser | null>(null);
  const [status, setStatus] = useState<SyncStatus>(configured ? 'loading' : 'off');
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [linkEmail, setLinkEmail] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  const engine = useMemo(
    () => backend && createSyncEngine({
      backend,
      getState: () => stateRef.current,
      applyRemote: (remote) => dispatch({ type: 'MERGE_REMOTE', remote }),
    }),
    [backend, dispatch],
  );

  useEffect(() => {
    if (!configured) return;
    let alive = true;
    let unsubscribe = () => {};
    void loadBackend().then(async (b) => {
      if (!alive) return;
      if (!b) return setStatus('off');
      unsubscribe = b.onSignIn((u) => {
        if (!alive) return;
        setUser(u);
        if (!u) setStatus('signed-out');
      });
      setBackend(b);
      try {
        const u = await b.init();
        if (!alive) return;
        setUser(u);
        if (!u) setStatus('signed-out');
      } catch (e) {
        if (alive) {
          setError(messageOf(e));
          setStatus('error');
        }
      }
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [configured]);

  const syncNow = useCallback(async () => {
    if (!engine || !user) return;
    setStatus('syncing');
    try {
      await engine.sync(user);
      setError(null);
      setLastSynced(Date.now());
      setStatus('synced');
    } catch (e) {
      setError(messageOf(e));
      setStatus('error');
    }
  }, [engine, user]);

  // Sync as soon as someone is signed in (on opening the app, or right after the email link).
  useEffect(() => {
    if (user && engine) void syncNow();
  }, [user, engine, syncNow]);

  // Sync shortly after any change on this device.
  useEffect(() => {
    if (!user || !engine || !engine.hasUnsynced(state)) return;
    const t = setTimeout(() => void syncNow(), SYNC_DELAY_MS);
    return () => clearTimeout(t);
  }, [state, user, engine, syncNow]);

  // Sync when coming back to the app or back online (picks up changes made on the other device).
  useEffect(() => {
    if (!user) return;
    const onBack = () => {
      if (document.visibilityState === 'visible') void syncNow();
    };
    document.addEventListener('visibilitychange', onBack);
    window.addEventListener('online', onBack);
    return () => {
      document.removeEventListener('visibilitychange', onBack);
      window.removeEventListener('online', onBack);
    };
  }, [user, syncNow]);

  const value = useMemo<SyncContextValue>(() => ({
    status, user, linkEmail, error, lastSynced, syncNow,
    async sendLink(email) {
      if (!backend) return;
      setError(null);
      try {
        await backend.sendLink(email);
        setLinkEmail(email);
        setStatus('link-sent');
      } catch (e) {
        setError(messageOf(e));
        setStatus('error');
      }
    },
    async verifyCode(code) {
      if (!backend) return false;
      setCodeError(null);
      try {
        await backend.verifyCode(linkEmail, code);
        return true;
      } catch {
        setCodeError('That code didn’t work. Check it, or send yourself a new email.');
        return false;
      }
    },
    codeError,
    cancelLink() {
      setLinkEmail('');
      setError(null);
      setStatus('signed-out');
    },
    async signOut() {
      await backend?.signOut();
      setUser(null);
      setLastSynced(null);
      setError(null);
      setStatus('signed-out');
    },
  }), [status, user, linkEmail, error, lastSynced, syncNow, backend, codeError]);

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

const OFF: SyncContextValue = {
  status: 'off', user: null, linkEmail: '', error: null, lastSynced: null,
  sendLink: async () => {}, verifyCode: async () => false, codeError: null, cancelLink: () => {}, signOut: async () => {}, syncNow: async () => {},
};

/** Sync state for a page; outside a SyncProvider (e.g. a page tested on its own) sync is simply off. */
export function useSync(): SyncContextValue {
  return useContext(SyncContext) ?? OFF;
}
