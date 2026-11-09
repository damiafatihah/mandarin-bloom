import { createClient, type Session } from '@supabase/supabase-js';
import type { AppState } from '../lib/types';
import type { SyncBackend, SyncUser } from './backend';
import { takeAuthLink } from './authLink';

/**
 * Progress is one row per user in the `progress` table; row-level security lets each user read and
 * write only their own row (see the SQL in the Obsidian note / README).
 */
export function createSupabaseBackend(url: string, anonKey: string): SyncBackend {
  const sb = createClient(url, anonKey, {
    auth: { flowType: 'implicit', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'xuehai.auth' },
  });
  const toUser = (s: Session | null): SyncUser | null => (s?.user ? { id: s.user.id, email: s.user.email ?? '' } : null);

  return {
    async init() {
      const link = takeAuthLink();
      if (link && 'error' in link) throw new Error(friendlyLinkError(link.error));
      if (link) {
        const { data, error } = await sb.auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken });
        if (error) throw error;
        return toUser(data.session);
      }
      const { data } = await sb.auth.getSession();
      return toUser(data.session);
    },
    onSignIn(cb) {
      const { data } = sb.auth.onAuthStateChange((_event, session) => cb(toUser(session)));
      return () => data.subscription.unsubscribe();
    },
    async sendLink(email) {
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + '/' } });
      if (error) throw error;
    },
    async verifyCode(email, code) {
      const { error } = await sb.auth.verifyOtp({ email, token: code, type: 'email' });
      if (error) throw error;
    },
    async signOut() {
      await sb.auth.signOut();
    },
    async pull(user) {
      const { data, error } = await sb.from('progress').select('state').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      return (data?.state as AppState | undefined) ?? null;
    },
    async push(user, state) {
      const { error } = await sb.from('progress').upsert({ user_id: user.id, state, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
  };
}

function friendlyLinkError(raw: string): string {
  return /expired|invalid/i.test(raw) ? 'That sign-in link has expired or was already used. Send yourself a new one.' : raw;
}
