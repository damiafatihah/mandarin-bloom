import styles from './Status.module.css';

export function Loading({ label }: { label: string }) {
  return (
    <p className={styles.loading} role="status">
      <span className={styles.glyph} lang="zh" aria-hidden="true">学</span>
      {label}
    </p>
  );
}

export function LoadError({ error }: { error: Error }) {
  return (
    <div className={styles.error} role="alert">
      <p>Couldn’t load the word list ({error.message}).</p>
      <button type="button" className="btn btn--quiet" onClick={() => location.reload()}>Try again</button>
    </div>
  );
}
