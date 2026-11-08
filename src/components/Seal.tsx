import type { CSSProperties } from 'react';
import styles from './Seal.module.css';

type Props = { text: string; size?: number; title?: string; stamp?: boolean };

export function Seal({ text, size = 48, title, stamp = false }: Props) {
  return (
    <span
      className={`${styles.seal} ${stamp ? styles.stamp : ''}`}
      style={{ '--size': `${size}px` } as CSSProperties}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <span lang="zh">{text}</span>
    </span>
  );
}
