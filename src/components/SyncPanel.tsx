import { useEffect, useId, useState, type FormEvent } from 'react';
import { useSync } from '../sync/SyncProvider';
import styles from './SyncPanel.module.css';

function ago(t: number, now: number): string {
  const min = Math.floor((now - t) / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  return `${h} hour${h === 1 ? '' : 's'} ago`;
}

/** Sign in with an email link and see sync status. Renders nothing when sync isn't set up. */
export function SyncPanel({ compact = false }: { compact?: boolean }) {
  const sync = useSync();
  const id = useId();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (sync.status === 'off') return null;
  if (sync.status === 'loading') return <p className={styles.note}>Checking sync…</p>;

  if (sync.user) {
    const message = sync.status === 'error'
      ? `Couldn’t sync (${sync.error}). Your progress is still saved on this device.`
      : sync.status === 'syncing' || !sync.lastSynced
        ? 'Syncing…'
        : `Synced ${ago(sync.lastSynced, now)}`;
    return (
      <div className={styles.panel}>
        <p className={styles.who}>Signed in as <strong>{sync.user.email}</strong></p>
        <p role="status" className={styles.status} data-state={sync.status}>{message}</p>
        <div className={styles.actions}>
          <button type="button" className="btn btn--quiet" onClick={() => void sync.syncNow()} disabled={sync.status === 'syncing'}>Sync now</button>
          <button type="button" className="btn btn--quiet" onClick={() => void sync.signOut()}>Sign out</button>
        </div>
        {!compact && <p className={styles.note}>Signing out keeps your progress on this device.</p>}
      </div>
    );
  }

  if (sync.status === 'link-sent') {
    const submitCode = (e: FormEvent) => {
      e.preventDefault();
      const digits = code.replace(/\D/g, '');
      if (digits) void sync.verifyCode(digits);
    };
    return (
      <form className={styles.panel} onSubmit={submitCode}>
        <p role="status" className={styles.status}>
          Email sent to {sync.linkEmail}. Open the link on this device, or type the code from the email here.
        </p>
        <p className={styles.note}>A link signs in whichever browser opens it, so if you read your email somewhere else, use the code.</p>
        <div className={styles.row}>
          <label htmlFor={`${id}-code`} className={styles.label}>Code from the email</label>
          <input id={`${id}-code`} className={`${styles.input} ${styles.code}`} value={code} onChange={(e) => setCode(e.target.value)}
            inputMode="numeric" autoComplete="one-time-code" placeholder="123456" maxLength={14} required />
          <button type="submit" className="btn btn--primary">Sign in</button>
        </div>
        {sync.codeError && <p role="alert" className={styles.status} data-state="error">{sync.codeError}</p>}
        <button type="button" className={`btn btn--quiet ${styles.secondary}`} onClick={sync.cancelLink}>Use a different email</button>
      </form>
    );
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (value) void sync.sendLink(value);
  }
  return (
    <form className={styles.panel} onSubmit={submit}>
      {!compact && <p className={styles.note}>Sign in with your email to keep your progress on your phone and laptop in step. We’ll email you a sign-in link, so there’s no password.</p>}
      <div className={styles.row}>
        <label htmlFor={`${id}-email`} className={styles.label}>Email</label>
        <input id={`${id}-email`} type="email" className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)}
          autoComplete="email" inputMode="email" placeholder="you@example.com" required />
        <button type="submit" className="btn btn--primary">Email me a link</button>
      </div>
      {sync.status === 'error' && sync.error && <p role="status" className={styles.status} data-state="error">{sync.error}</p>}
    </form>
  );
}
