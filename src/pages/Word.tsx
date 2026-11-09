import { useMemo, type CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useStore } from '../state/store';
import { examplesFor, useCedict, useExamples, useHsk } from '../data/resources';
import { dateKey } from '../lib/dates';
import { levelLabel } from '../lib/levels';
import { Landscape, PlumBranch } from '../components/art/Scenery';
import { SpeakButton } from '../components/SpeakButton';
import { Example } from '../components/Example';
import { ToneText } from '../components/ToneText';
import { Bookmark, Check, ChevronLeft } from '../components/icons';
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
  const { data: examples } = useExamples();
  const today = dateKey();
  const { toneColors, speechRate } = state.settings;

  if (error) return <LoadError error={error} />;
  if (!pool) return <Loading label="Looking it up…" />;

  const main = hsk ?? extra[0];
  if (!main) {
    return cedict
      ? (
        <article className={styles.page}>
          <h1 className={styles.hanzi} lang="zh" style={{ '--len': Math.max(1, hanzi.length) } as CSSProperties}>{hanzi}</h1>
          <p className={styles.notFound}>Not found in the dictionary. <Link to="/dictionary">Search again</Link></p>
        </article>
      )
      : <Loading label="Looking it up…" />;
  }

  const others = extra.filter((e) => e.p.toLowerCase() !== main.p.toLowerCase());
  const card = hsk ? state.cards[hsk.s] : undefined;

  return (
    <article className={styles.page}>
      <PlumBranch className={styles.plum} />
      <Landscape variant="wide" seed={`word-${main.s}`} boat className={styles.hills} />
      <button type="button" className={`btn btn--round ${styles.back}`} onClick={() => navigate(-1)} aria-label="Back"><ChevronLeft /></button>

      <div className={styles.hero}>
        <h1 className={styles.hanzi} lang="zh" style={{ '--len': main.s.length } as CSSProperties}>{main.s}</h1>
        <div className={styles.sound}>
          <ToneText pinyin={main.p} colored={toneColors} className={styles.pinyin} />
          <SpeakButton text={main.s} rate={speechRate} label={`Hear ${main.s}`} />
        </div>
        {hsk && (
          <ul className={styles.tags}>
            <li className="tag">{levelLabel(hsk.l)}</li>
            {hsk.c.length > 0 && <li className="tag"><span lang="zh">量词 {hsk.c.join('、')}</span></li>}
          </ul>
        )}
      </div>

      <section className={styles.section} aria-labelledby="meanings-h">
        <h2 id="meanings-h"><span className="zh-title" lang="zh">释义</span> <span className="en-sub">Meanings</span></h2>
        <ul className={styles.meanings}>{main.m.map((m, i) => <li key={i}>{m}</li>)}</ul>
      </section>

      {hsk && examplesFor(examples, hsk.s).length > 0 && (
        <section className={styles.section} aria-labelledby="examples-h">
          <h2 id="examples-h"><span className="zh-title" lang="zh">例句</span> <span className="en-sub">Example sentences</span></h2>
          <div className={styles.examples}>
            {examplesFor(examples, hsk.s).map(([zh, en]) => <Example key={zh} zh={zh} en={en} word={hsk.s} rate={speechRate} />)}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section className={styles.section} aria-labelledby="readings-h">
          <h2 id="readings-h"><span className="zh-title" lang="zh">多音</span> <span className="en-sub">Other readings</span></h2>
          <ul className={styles.readings}>
            {others.map((e, i) => (
              <li key={i}><ToneText pinyin={e.p} colored={toneColors} className={styles.readingPy} /> {e.m.slice(0, 3).join('; ')}</li>
            ))}
          </ul>
        </section>
      )}

      {main.s.length > 1 && (
        <section className={styles.section} aria-labelledby="chars-h">
          <h2 id="chars-h"><span className="zh-title" lang="zh">单字</span> <span className="en-sub">Characters</span></h2>
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
            ? <p className={styles.inReview}><Check /> In your reviews · next {card.due <= today ? 'today' : card.due}</p>
            : (
              <button type="button" className="btn btn--primary btn--block" onClick={() => dispatch({ type: 'ADD_TO_DECK', word: hsk.s, today })}>
                <Bookmark /> Add to my reviews
              </button>
            )}
        </div>
      )}
    </article>
  );
}
