import { vi } from 'vitest';
import type { AppState } from '../lib/types';
import type { SyncBackend, SyncUser } from '../sync/backend';

/** An in-memory "cloud" for tests. Several devices can share one `cloud` map. */
export function memoryBackend(cloud = new Map<string, AppState>(), signedIn: string | null = null) {
  let user: SyncUser | null = signedIn ? { id: signedIn, email: signedIn } : null;
  const listeners = new Set<(u: SyncUser | null) => void>();
  const backend = {
    init: vi.fn(async () => user),
    onSignIn: (cb: (u: SyncUser | null) => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    sendLink: vi.fn(async (email: string) => {
      backend.lastLinkTo = email;
    }),
    /** Test helper: what opening the email link does. */
    openLink(email: string) {
      user = { id: email, email };
      listeners.forEach((cb) => cb(user));
    },
    signOut: vi.fn(async () => {
      user = null;
      listeners.forEach((cb) => cb(null));
    }),
    pull: vi.fn(async (u: SyncUser) => structuredClone(cloud.get(u.id) ?? null)),
    push: vi.fn(async (u: SyncUser, s: AppState) => {
      cloud.set(u.id, structuredClone(s));
    }),
    lastLinkTo: '',
  };
  return { backend: backend as typeof backend & SyncBackend, cloud };
}
