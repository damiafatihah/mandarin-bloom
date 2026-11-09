import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ToneText } from './ToneText';
import { ChevronRight } from './icons';
import styles from './WordRow.module.css';

type Props = {
  hanzi: string;
  pinyin: string;
  meanings: string[];
  toneColors: boolean;
  /** level tag, e.g. "HSK 4" (hidden on narrow phones to leave room for the meaning) */
  badge?: string;
  /** another tag shown beside the level, e.g. "Mastered" */
  tag?: ReactNode;
  /** a short line under the tags, e.g. "Review in 3 days" */
  note?: ReactNode;
};

/** One tappable word in a list; opens the word page. Used by the Dictionary and My words. */
export function WordRow({ hanzi, pinyin, meanings, toneColors, badge, tag, note }: Props) {
  const hasSide = badge || tag || note;
  return (
    <Link to={`/word/${encodeURIComponent(hanzi)}`} className={styles.row}>
      <span className={styles.han} lang="zh">{hanzi}</span>
      <span className={styles.text}>
        <ToneText pinyin={pinyin} colored={toneColors} className={styles.py} />
        <span className={styles.def}>{meanings.slice(0, 3).join('; ')}</span>
      </span>
      {hasSide && (
        <span className={styles.side}>
          {(badge || tag) && (
            <span className={styles.tags}>
              {badge && <span className={`tag ${styles.badge}`}>{badge}</span>}
              {tag}
            </span>
          )}
          {note && <span className={styles.note}>{note}</span>}
        </span>
      )}
      <span className={styles.chev}><ChevronRight /></span>
    </Link>
  );
}
