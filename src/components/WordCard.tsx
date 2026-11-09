import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import type { HskWord } from '../lib/types';
import { levelLabel } from '../lib/levels';
import { Landscape } from './art/Scenery';
import { SpeakButton } from './SpeakButton';
import { Example } from './Example';
import { ToneText } from './ToneText';
import { ArrowRight, Check } from './icons';
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
  /** an example sentence [chinese, english], shown once the word is learnt */
  example?: [string, string];
};

export function WordCard({ word, status, onTeach, onKnown, onUndo, toneColors, speechRate, example }: Props) {
  const revealed = status !== 'new';
  return (
    <article className={styles.card} data-status={status} aria-label={word.s}>
      <Landscape variant="card" seed={word.s} className={styles.hills} />
      <div className={styles.top}>
        <span className="tag"><span lang="zh">每日一词</span> · {levelLabel(word.l)}</span>
        {status === 'taught' && <p className={styles.state}><Check /> Learnt</p>}
        {status === 'known' && <p className={`${styles.state} ${styles.stateKnown}`}><Check /> Already knew</p>}
      </div>
      <div className={styles.head}>
        <h3 className={styles.hanzi} lang="zh" style={{ '--len': word.s.length } as CSSProperties}>{word.s}</h3>
        <SpeakButton text={word.s} rate={speechRate} label={`Hear ${word.s}`} />
      </div>
      {revealed && <ToneText pinyin={word.p} colored={toneColors} className={styles.pinyin} />}

      {status === 'new' && (
        <>
          <p className={styles.prompt}>Do you know this word?</p>
          <div className={styles.actions}>
            <button type="button" className="btn btn--quiet" onClick={onKnown}>I know it</button>
            <button type="button" className="btn btn--primary" onClick={onTeach}>Teach me<ArrowRight /></button>
          </div>
        </>
      )}
      {status === 'taught' && (
        <div className={styles.back}>
          <ul className={styles.meanings}>
            {word.m.slice(0, 3).map((m) => <li key={m}>{m}</li>)}
          </ul>
          {word.c.length > 0 && (
            <p className={styles.mw}>Measure word <span lang="zh" className={styles.mwHan}>{word.c.join('、')}</span></p>
          )}
          {example && <Example zh={example[0]} en={example[1]} word={word.s} rate={speechRate} compact />}
          <Link className={styles.more} to={`/word/${encodeURIComponent(word.s)}`}>More about {word.s}<ArrowRight /></Link>
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
