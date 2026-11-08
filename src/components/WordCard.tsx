import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import type { HskWord } from '../lib/types';
import { levelLabel } from '../lib/levels';
import { InkMist } from './InkMist';
import { SpeakButton } from './SpeakButton';
import { ToneText } from './ToneText';
import { Check } from './icons';
import styles from './WordCard.module.css';

export type CardStatus = 'new' | 'taught' | 'known';

type Props = {
  word: HskWord;
  status: CardStatus;
  onTeach: () => void;
  onKnown: () => void;
  onUndo: () => void;
  toneColors: boolean;
  speechRate: number;
};

export function WordCard({ word, status, onTeach, onKnown, onUndo, toneColors, speechRate }: Props) {
  const revealed = status !== 'new';
  return (
    <article className={styles.card} data-status={status} aria-label={word.s}>
      <InkMist className={styles.mist} sun={status === 'new'} />
      <div className={styles.top}>
        <p className={styles.level}>{levelLabel(word.l)}</p>
        {status === 'taught' && <p className={styles.tag}><Check /> Learned</p>}
        {status === 'known' && <p className={`${styles.tag} ${styles.tagKnown}`}><Check /> Already knew</p>}
      </div>
      <h3 className={styles.hanzi} lang="zh" style={{ '--len': word.s.length } as CSSProperties}>{word.s}</h3>
      <div className={styles.sound}>
        {revealed && <ToneText pinyin={word.p} colored={toneColors} className={styles.pinyin} />}
        <SpeakButton text={word.s} rate={speechRate} label={`Hear ${word.s}`} />
      </div>
      {status === 'new' && (
        <div className={styles.actions}>
          <button type="button" className="btn btn--quiet" onClick={onKnown}>I know it</button>
          <button type="button" className="btn btn--primary" onClick={onTeach}>Teach me</button>
        </div>
      )}
      {status === 'taught' && (
        <div className={styles.back}>
          <ul className={styles.meanings}>
            {word.m.slice(0, 3).map((m) => <li key={m}>{m}</li>)}
          </ul>
          {word.c.length > 0 && (
            <p className={styles.mw}>Measure word <span lang="zh">{word.c.join('、')}</span></p>
          )}
          <Link className={styles.more} to={`/word/${encodeURIComponent(word.s)}`}>More about {word.s}</Link>
        </div>
      )}
      {status === 'known' && (
        <div className={styles.back}>
          <p className={styles.knownMeaning}>{word.m[0]}</p>
          <button type="button" className={styles.undo} onClick={onUndo} aria-label={`Undo: I don’t know ${word.s}`}>
            Undo
          </button>
        </div>
      )}
    </article>
  );
}
