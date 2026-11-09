import { Fragment } from 'react';
import { SpeakButton } from './SpeakButton';
import styles from './Example.module.css';

type Props = { zh: string; en: string; word: string; rate: number; compact?: boolean };

/** Typographic quotes for the English line (Tatoeba uses straight ones). */
const curly = (s: string) => s.replace(/(^|[\s(])"/g, '$1“').replace(/"/g, '”').replace(/'/g, '’');

/** One example sentence: Chinese with the word highlighted, a speak button, and the English beneath. */
export function Example({ zh, en, word, rate, compact = false }: Props) {
  const parts = zh.split(word);
  return (
    <figure className={`${styles.example} ${compact ? styles.compact : ''}`}>
      <div className={styles.line}>
        <p lang="zh" className={styles.zh}>
          {parts.map((p, i) => (
            <Fragment key={i}>{p}{i < parts.length - 1 && <mark>{word}</mark>}</Fragment>
          ))}
        </p>
        <SpeakButton text={zh} rate={rate} label="Hear the sentence" />
      </div>
      <figcaption className={styles.en}>{curly(en)}</figcaption>
    </figure>
  );
}
