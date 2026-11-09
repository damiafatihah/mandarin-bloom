import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useStore } from '../state/store';
import { useHsk } from '../data/resources';
import { dateKey, reviewText } from '../lib/dates';
import { LEVEL_OPTIONS, levelLabel } from '../lib/levels';
import { countMyWords, filterMyWords, listMyWords, type MyWordsFilter, type MyWordsSort } from '../lib/mywords';
import { PageHeader } from '../components/PageHeader';
import { SearchBox } from '../components/SearchBox';
import { WordRow } from '../components/WordRow';
import { Loading, LoadError } from '../components/Status';
import styles from './MyWords.module.css';

const FILTERS: { value: MyWordsFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'review', label: 'In review' },
  { value: 'due', label: 'Review due' },
  { value: 'mastered', label: 'Mastered' },
  { value: 'known', label: 'Already knew' },
];
const SORTS: { value: MyWordsSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'az', label: 'Pinyin A–Z' },
  { value: 'review', label: 'Next review' },
];
const STATUS_LABEL = { learning: 'Learning', mastered: 'Mastered', known: 'Already knew' } as const;
// one entry per HSK level (HSK 1–3 split out, since a word belongs to one level)
const LEVELS = LEVEL_OPTIONS.flatMap((o) => o.levels);

const oneOf = <T extends string>(v: string | null, all: { value: T }[], fallback: T): T =>
  all.some((o) => o.value === v) ? (v as T) : fallback;

export default function MyWords() {
  const { state } = useStore();
  const { data: pool, error } = useHsk();
  const [params, setParams] = useSearchParams();
  const filter = oneOf(params.get('filter'), FILTERS, 'all');
  const sort = oneOf(params.get('sort'), SORTS, 'newest');
  const level = Number(params.get('level')) || 0;
  const q = params.get('q') ?? '';
  const today = dateKey();

  const list = useMemo(() => (pool ? listMyWords(state, pool, today) : []), [pool, state, today]);
  const counts = useMemo(() => countMyWords(list), [list]);
  const shown = useMemo(() => filterMyWords(list, { filter, sort, q, level }), [list, filter, sort, q, level]);

  /** Update the address (so Back and links from Me land on the same view); defaults are left out. */
  function update(patch: Record<string, string | number>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      const isDefault = v === '' || v === 0 || (k === 'filter' && v === 'all') || (k === 'sort' && v === 'newest');
      if (isDefault) next.delete(k);
      else next.set(k, String(v));
    }
    setParams(next, { replace: true });
  }

  if (error) return <LoadError error={error} />;
  if (!pool) return <Loading label="Loading words…" />;

  const header = <PageHeader zh="我的词语" en="My words" sub="Every word you’ve learnt or skipped as already known." />;

  if (list.length === 0) {
    return (
      <div className={styles.page}>
        {header}
        <div className={styles.empty}>
          <p>No learnt words yet. Tap “Teach me” or “I know it” on Today and they’ll appear here.</p>
          <Link to="/" className="btn btn--primary">Go to Today</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {header}
      <SearchBox id="my-q" label="Search my words in Chinese, pinyin or English" value={q}
        onChange={(v) => update({ q: v })} placeholder="搜索 · 汉字, pinyin or English…" />

      <div className={styles.controls}>
        <div className={styles.filters} role="group" aria-label="Show">
          {FILTERS.map((f) => (
            <button key={f.value} type="button" className="chip" aria-pressed={filter === f.value}
              onClick={() => update({ filter: f.value })}>
              {f.label} <span className={styles.count}>{counts[f.value]}</span>
            </button>
          ))}
        </div>
        <div className={styles.selects}>
          <label className={styles.select}>
            <span>Level</span>
            <select value={level} onChange={(e) => update({ level: Number(e.target.value) })}>
              <option value={0}>All levels</option>
              {LEVELS.map((l) => <option key={l} value={l}>{levelLabel(l)}</option>)}
            </select>
          </label>
          <label className={styles.select}>
            <span>Sort</span>
            <select value={sort} onChange={(e) => update({ sort: e.target.value })}>
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      <p className={styles.summary} role="status">Showing {shown.length} word{shown.length === 1 ? '' : 's'}</p>

      {shown.length === 0 ? (
        <div className={styles.empty}>
          <p>No words match these filters.</p>
          <button type="button" className="btn btn--quiet" onClick={() => setParams({}, { replace: true })}>Clear filters</button>
        </div>
      ) : (
        <ul className={styles.list}>
          {shown.map((e) => (
            <li key={e.word.s}>
              <WordRow hanzi={e.word.s} pinyin={e.word.p} meanings={e.word.m} toneColors={state.settings.toneColors}
                badge={levelLabel(e.word.l)}
                tag={<span className={styles.status} data-status={e.status}>{STATUS_LABEL[e.status]}</span>}
                note={e.nextReview && <span className={styles.when} data-due={e.due}>{reviewText(e.nextReview, today)}</span>} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
