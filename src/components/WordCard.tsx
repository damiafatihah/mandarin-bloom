import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import type { HskWord } from '../lib/types';
import { levelLabel } from '../lib/levels';
import { InkMist } from './InkMist';
import { SpeakButton } from './SpeakButton';
import { ToneText } from './ToneText';
import styles from './WordCard.module.css';

type Props = { word: HskWord; onKnown: () => void; toneColors: boolean; speechRate: number };

export function WordCard({ word, onKnown, toneColors, speechRate }: Props) {
  const [revealed, setRevealed] = useState(false);
  return (
    <article className={styles.card} aria-label={word.s}>
      <InkMist className={styles.mist} />
      <p className={styles.level}>{levelLabel(word.l)}</p>
      <h3 className={styles.hanzi} lang="zh" style={{ '--len': word.s.length } as CSSProperties}>{word.s}</h3>
      <div className={styles.sound}>
        {revealed && <ToneText pinyin={word.p} colored={toneColors} className={styles.pinyin} />}
        <SpeakButton text={word.s} rate={speechRate} label={`Hear ${word.s}`} />
      </div>
      {revealed ? (
        <div className={styles.back}>
          <ul className={styles.meanings}>
            {word.m.slice(0, 3).map((m) => <li key={m}>{m}</li>)}
          </ul>
          {word.c.length > 0 && (
            <p className={styles.mw}>Measure word <span lang="zh">{word.c.join('、')}</span></p>
          )}
          <Link className={styles.more} to={`/word/${encodeURIComponent(word.s)}`}>More about {word.s}</Link>
        </div>
      ) : (
        <div className={styles.actions}>
          <button type="button" className="btn btn--quiet" onClick={onKnown}>I know it</button>
          <button type="button" className="btn btn--primary" onClick={() => setRevealed(true)}>Teach me</button>
        </div>
      )}
    </article>
  );
}
