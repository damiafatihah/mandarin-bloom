import type { AppState } from '../lib/types';

export type SyncUser = { id: string; email: string };

/** Where synced progress lives. Supabase in production; an in-memory or fake one in tests. */
export interface SyncBackend {
  /** The signed-in user, if any (also completes a sign-in arriving from an email link). */
  init(): Promise<SyncUser | null>;
  /** Called whenever someone signs in or out (e.g. after opening the email link). */
  onSignIn(cb: (user: SyncUser | null) => void): () => void;
  sendLink(email: string): Promise<void>;
  /** Signs this device in with the one-time code printed in the same email (for when the link opened elsewhere). */
  verifyCode(email: string, code: string): Promise<void>;
  signOut(): Promise<void>;
  pull(user: SyncUser): Promise<AppState | null>;
  push(user: SyncUser, state: AppState): Promise<void>;
}

let override: SyncBackend | null | undefined;
/** Tests only: use this backend instead of the configured one (null = sync not set up). */
export function setBackendForTests(b: SyncBackend | null | undefined) {
  override = b;
}

const env = import.meta.env;
const supabaseConfigured = () => !!(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY);

export const syncConfigured = () =>
  override !== undefined ? override !== null : env.VITE_SYNC_BACKEND === 'fake' || supabaseConfigured();

/** Loaded on demand so the sign-in code isn't part of the first download. */
export async function loadBackend(): Promise<SyncBackend | null> {
  if (override !== undefined) return override;
  if (env.VITE_SYNC_BACKEND === 'fake') return (await import('./fakeBackend')).fakeBackend;
  if (supabaseConfigured()) {
    const { createSupabaseBackend } = await import('./supabaseBackend');
    return createSupabaseBackend(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
  }
  return null;
}
