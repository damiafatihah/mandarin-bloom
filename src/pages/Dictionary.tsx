import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useStore } from '../state/store';
import { useCedict, useHsk } from '../data/resources';
import { useDebounced } from '../hooks/useDebounced';
import { hskToEntry, searchDict } from '../lib/search';
import { levelLabel } from '../lib/levels';
import { ToneText } from '../components/ToneText';
import { PageHeader } from '../components/PageHeader';
import { ChevronRight, Search } from '../components/icons';
import styles from './Dictionary.module.css';

const EXAMPLES = ['犹豫', 'youyu', 'hesitate', '一帆风顺'];

export default function Dictionary() {
  const { settings } = useStore().state;
  const [params, setParams] = useSearchParams();
  const [input, setInput] = useState(params.get('q') ?? '');
  const query = useDebounced(input.trim(), 150);
  const { data: pool } = useHsk();
  const { data: cedict, error } = useCedict();

  useEffect(() => {
    setParams(query ? { q: query } : {}, { replace: true });
  }, [query, setParams]);

  const freq = useMemo(() => new Map((pool ?? []).map((w) => [w.s, w.q])), [pool]);
  const levels = useMemo(() => new Map((pool ?? []).map((w) => [w.s, w.l])), [pool]);
  const entries = useMemo(() => cedict ?? (pool ?? []).map(hskToEntry), [cedict, pool]);
  const results = useMemo(() => searchDict(entries, query, freq), [entries, query, freq]);

  return (
    <div className={styles.page}>
      <PageHeader zh="词典" en="Dictionary" sub="Search about 120,000 words by 汉字, pinyin (tones optional) or English." />
      <form role="search" className={styles.form} onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="dict-q" className="visually-hidden">Search in Chinese, pinyin or English</label>
        <span className={styles.searchIcon}><Search /></span>
        <input id="dict-q" name="q" type="search" className={styles.input} value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="搜索 · 汉字, pinyin or English…" autoComplete="off" autoCapitalize="off" spellCheck={false} enterKeyHint="search" />
      </form>
      {!cedict && !error && <p className={styles.note} role="status">Loading the full dictionary (once, about 3 MB). Searching HSK words meanwhile.</p>}
      {error && <p className={styles.note} role="alert">The full dictionary didn’t load, so only HSK words are searchable.</p>}
      {!query && (
        <div className={styles.examples}>
          <span>Try</span>
          {EXAMPLES.map((t) => <button key={t} type="button" className="chip" onClick={() => setInput(t)}>{t}</button>)}
        </div>
      )}
      {query && results.length === 0 && <p className={styles.note}>No matches for “{query}”.</p>}
      <ul className={styles.results}>
        {results.map((e, i) => (
          <li key={`${e.s}|${e.p}|${i}`}>
            <Link to={`/word/${encodeURIComponent(e.s)}`} className={styles.row}>
              <span className={styles.han} lang="zh">{e.s}</span>
              <span className={styles.text}>
                <ToneText pinyin={e.p} colored={settings.toneColors} className={styles.py} />
                <span className={styles.def}>{e.m.slice(0, 3).join('; ')}</span>
              </span>
              {levels.has(e.s) && <span className={`tag ${styles.badge}`}>{levelLabel(levels.get(e.s)!)}</span>}
              <span className={styles.chev}><ChevronRight /></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
