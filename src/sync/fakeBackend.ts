import type { AppState } from '../lib/types';
import type { SyncBackend, SyncUser } from './backend';

/**
 * Browser tests only (built with VITE_SYNC_BACKEND=fake): "sending a link" signs in at once, and progress is
 * stored at /__fake-sync/<email>, which the tests answer themselves to play the cloud for two devices.
 */
const KEY = 'xuehai.fakeSyncUser';
const listeners = new Set<(u: SyncUser | null) => void>();
const userFor = (email: string): SyncUser => ({ id: email, email });
const url = (u: SyncUser) => `/__fake-sync/${encodeURIComponent(u.id)}`;

export const fakeBackend: SyncBackend = {
  async init() {
    const email = localStorage.getItem(KEY);
    return email ? userFor(email) : null;
  },
  onSignIn(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  async sendLink(email) {
    if ((window as unknown as { __fakeSyncNoAutoLink?: boolean }).__fakeSyncNoAutoLink) return; // tests of the code step
    localStorage.setItem(KEY, email);
    setTimeout(() => listeners.forEach((cb) => cb(userFor(email))), 50);
  },
  async verifyCode(email, code) {
    if (code !== '123456') throw new Error('Token has expired or is invalid');
    localStorage.setItem(KEY, email);
    listeners.forEach((cb) => cb(userFor(email)));
  },
  async signOut() {
    localStorage.removeItem(KEY);
    listeners.forEach((cb) => cb(null));
  },
  async pull(u) {
    const r = await fetch(url(u));
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as AppState;
  },
  async push(u, state) {
    const r = await fetch(url(u), { method: 'PUT', body: JSON.stringify(state) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  },
};
