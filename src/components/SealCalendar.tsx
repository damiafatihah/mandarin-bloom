import type { AppState } from '../lib/types';
import { addDays } from '../lib/dates';
import { Seal } from './Seal';
import styles from './SealCalendar.module.css';

export function SealCalendar({ days, today, count = 14 }: { days: AppState['days']; today: string; count?: number }) {
  const keys = Array.from({ length: count }, (_, i) => addDays(today, i - count + 1));
  return (
    <ol className={styles.grid} aria-label={`Challenges over the last ${count} days`}>
      {keys.map((k) => {
        const d = days[k];
        return (
          <li key={k} className={styles.day}>
            {d?.challenge
              ? <Seal text={d.words[0]?.[0] ?? '学'} size={36} title={`${k}: challenge done`} />
              : <span className={styles.empty} aria-label={`${k}: no challenge`}>{Number(k.slice(8))}</span>}
          </li>
        );
      })}
    </ol>
  );
}
