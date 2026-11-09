import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useStore } from '../state/store';
import { useCedict, useHsk } from '../data/resources';
import { useDebounced } from '../hooks/useDebounced';
import { hskToEntry, searchDict } from '../lib/search';
import { levelLabel } from '../lib/levels';
import { WordRow } from '../components/WordRow';
import { PageHeader } from '../components/PageHeader';
import { SearchBox } from '../components/SearchBox';
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
      <SearchBox id="dict-q" label="Search in Chinese, pinyin or English" value={input} onChange={setInput}
        placeholder="搜索 · 汉字, pinyin or English…" />
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
            <WordRow hanzi={e.s} pinyin={e.p} meanings={e.m} toneColors={settings.toneColors}
              badge={levels.has(e.s) ? levelLabel(levels.get(e.s)!) : undefined} />
          </li>
        ))}
      </ul>
    </div>
  );
}
