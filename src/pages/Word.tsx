import { useMemo, type CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useStore } from '../state/store';
import { useCedict, useHsk } from '../data/resources';
import { dateKey } from '../lib/dates';
import { levelLabel } from '../lib/levels';
import { InkMist } from '../components/InkMist';
import { SpeakButton } from '../components/SpeakButton';
import { ToneText } from '../components/ToneText';
import { ChevronLeft } from '../components/icons';
import { Loading, LoadError } from '../components/Status';
import styles from './Word.module.css';

export default function Word() {
  const { hanzi = '' } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useStore();
  const { data: pool, error } = useHsk();
  const hsk = useMemo(() => pool?.find((w) => w.s === hanzi || w.t === hanzi), [pool, hanzi]);
  const { data: cedict } = useCedict(!!pool && (!hsk || hsk.poly));
  const extra = useMemo(() => cedict?.filter((e) => e.s === hanzi || e.t === hanzi) ?? [], [cedict, hanzi]);
  const today = dateKey();
  const { toneColors, speechRate } = state.settings;

  if (error) return <LoadError error={error} />;
  if (!pool) return <Loading label="Looking it up…" />;

  const main = hsk ?? extra[0];
  if (!main) {
    return cedict
      ? <div className={styles.page}><h1 lang="zh">{hanzi}</h1><p>Not found in the dictionary. <Link to="/dictionary">Search again</Link></p></div>
      : <Loading label="Looking it up…" />;
  }

  const others = extra.filter((e) => e.p.toLowerCase() !== main.p.toLowerCase());
  const card = hsk ? state.cards[hsk.s] : undefined;

  return (
    <article className={styles.page}>
      <InkMist className={styles.mist} />
      <button type="button" className={`btn btn--round ${styles.back}`} onClick={() => navigate(-1)} aria-label="Back"><ChevronLeft /></button>
      <h1 className={styles.hanzi} lang="zh" style={{ '--len': main.s.length } as CSSProperties}>{main.s}</h1>
      <div className={styles.sound}>
        <ToneText pinyin={main.p} colored={toneColors} className={styles.pinyin} />
        <SpeakButton text={main.s} rate={speechRate} label={`Hear ${main.s}`} />
      </div>
      {hsk && (
        <p className={styles.meta}>
          {levelLabel(hsk.l)}
          {hsk.c.length > 0 && <> · measure word <span lang="zh">{hsk.c.join('、')}</span></>}
        </p>
      )}
      <ol className={styles.meanings}>{main.m.map((m, i) => <li key={i}>{m}</li>)}</ol>

      {others.length > 0 && (
        <section className={styles.section}>
          <h2>Other readings</h2>
          <ul>
            {others.map((e, i) => (
              <li key={i}><ToneText pinyin={e.p} colored={toneColors} />: {e.m.slice(0, 3).join('; ')}</li>
            ))}
          </ul>
        </section>
      )}

      {main.s.length > 1 && (
        <section className={styles.section}>
          <h2>Characters</h2>
          <ul className={styles.chars}>
            {[...main.s].map((ch, i) => (
              <li key={i}><Link to={`/word/${encodeURIComponent(ch)}`} lang="zh">{ch}</Link></li>
            ))}
          </ul>
        </section>
      )}

      {hsk && (
        <div className={styles.actions}>
          {card
            ? <p>In your reviews · next {card.due <= today ? 'today' : card.due}</p>
            : <button type="button" className="btn btn--primary" onClick={() => dispatch({ type: 'ADD_TO_DECK', word: hsk.s, today })}>Add to my reviews</button>}
        </div>
      )}
    </article>
  );
}
