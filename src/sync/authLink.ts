/**
 * An email sign-in link returns to the app with the sign-in details in the address (#access_token=…).
 * They are read once, before the app draws anything, because the first redirect (e.g. to /welcome on a new
 * device) would otherwise drop them. The address is then cleaned up.
 */
export type AuthLink = { accessToken: string; refreshToken: string } | { error: string } | null;

export function parseAuthHash(hash: string): AuthLink {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const access = p.get('access_token'), refresh = p.get('refresh_token');
  if (access && refresh) return { accessToken: access, refreshToken: refresh };
  const err = p.get('error_description') ?? p.get('error');
  if (err && (p.has('error_code') || p.has('error'))) return { error: err.replace(/\+/g, ' ') };
  return null;
}

let captured: AuthLink = null;

export function captureAuthLink() {
  if (typeof window === 'undefined') return;
  captured = parseAuthHash(window.location.hash);
  if (captured) history.replaceState(history.state, '', window.location.pathname + window.location.search);
}

/** The sign-in link details, handed out once. */
export function takeAuthLink(): AuthLink {
  const c = captured;
  captured = null;
  return c;
}
