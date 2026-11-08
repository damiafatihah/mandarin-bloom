import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Seal } from './Seal';
import { Landscape } from './art/Scenery';
import styles from './QuizResultView.module.css';

type Props = { heading: string; score: number; total: number; missed: string[]; sealText: string; children?: ReactNode };

function praise(r: number) {
  if (r === 1) return '满分！ A perfect score.';
  if (r >= 0.8) return '很好！ Very good.';
  if (r >= 0.5) return '不错。 Not bad. The misses are now in your reviews.';
  return '加油！ Keep going. The misses are now in your reviews.';
}

export function QuizResultView({ heading, score, total, missed, sealText, children }: Props) {
  return (
    <section className={styles.result} aria-labelledby="result-h">
      <Landscape variant="wide" seed="result" sun pagoda birds pagodaRange={[0.4, 0.6]} sunX={0.62} className={`${styles.art} fade-bottom`} />
      <Seal text={sealText} size={88} title="Stamped" stamp />
      <h1 id="result-h">{heading}</h1>
      <p className={styles.score}><strong className="num">{score}</strong> / {total}</p>
      <p className={styles.praise}>{praise(total ? score / total : 0)}</p>
      {missed.length > 0 && (
        <div className={styles.missed}>
          <h2>Words to revisit</h2>
          <ul>
            {missed.map((s) => (
              <li key={s}><Link to={`/word/${encodeURIComponent(s)}`} lang="zh">{s}</Link></li>
            ))}
          </ul>
        </div>
      )}
      <div className={styles.actions}>{children}</div>
    </section>
  );
}
