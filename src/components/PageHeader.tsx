import type { ReactNode } from 'react';
import { Landscape } from './art/Scenery';
import styles from './PageHeader.module.css';

/** A screen title: Chinese in the Song face, English beneath, over a small ink landscape. */
export function PageHeader({ zh, en, sub, seed = zh, children }: { zh: string; en: string; sub?: ReactNode; seed?: string; children?: ReactNode }) {
  return (
    <header className={styles.head}>
      <Landscape variant="header" seed={seed} birds className={styles.art} />
      <h1 className={styles.title}>
        <span className={styles.zh} lang="zh">{zh}</span> <span className={styles.en}>{en}</span>
      </h1>
      {sub && <p className={styles.sub}>{sub}</p>}
      {children}
    </header>
  );
}
