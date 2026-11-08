import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useStore } from '../state/store';
import { useHsk } from '../data/resources';
import { dateKey } from '../lib/dates';
import { seededRng } from '../lib/rng';
import { buildQuestions, type Question, type QuestionKind } from '../lib/quiz';
import { pickPracticeWords, type PracticeSource } from '../lib/challenge';
import { speechSupported } from '../lib/speech';
import { QuizRunner, type QuizResult } from '../components/QuizRunner';
import { QuizResultView } from '../components/QuizResultView';
import { Loading, LoadError } from '../components/Status';
import { PageHeader } from '../components/PageHeader';
import { ArrowRight } from '../components/icons';
import styles from './Practice.module.css';

const SOURCES: { value: PracticeSource; label: string }[] = [
  { value: 'due', label: 'Due reviews' },
  { value: 'levels', label: 'My levels' },
  { value: 'deck', label: 'All my words' },
];
const KINDS: { value: QuestionKind | 'mixed'; label: string }[] = [
  { value: 'mixed', label: 'Mixed' },
  { value: 'hanzi-to-pinyin', label: 'Tones' },
  { value: 'meaning-to-hanzi', label: 'Meaning → word' },
  { value: 'hanzi-to-meaning', label: 'Word → meaning' },
  { value: 'listen-to-hanzi', label: 'Listening' },
  { value: 'measure-word', label: 'Measure words' },
];

export default function Practice() {
  const { state, dispatch } = useStore();
  const { data: pool, error } = useHsk();
  const [params] = useSearchParams();
  const [source, setSource] = useState<PracticeSource>(params.get('source') === 'due' ? 'due' : 'levels');
  const [kind, setKind] = useState<QuestionKind | 'mixed'>('mixed');
  const [size, setSize] = useState(10);
  const [run, setRun] = useState<{ seed: string; questions: Question[] } | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [empty, setEmpty] = useState(false);
  const today = dateKey();
  const speech = speechSupported();

  if (error) return <LoadError error={error} />;
  if (!pool) return <Loading label="Loading words…" />;

  function start() {
    const seed = `practice:${Date.now()}`;
    const forced = kind === 'mixed' ? undefined : kind;
    const words = pickPracticeWords(pool!, state, { source, size, today, speech, kind: forced, rng: seededRng(seed) });
    setResult(null);
    if (!words.length) { setEmpty(true); setRun(null); return; }
    setEmpty(false);
    setRun({ seed, questions: buildQuestions(words, pool!, seed, { speech, kind: forced }) });
  }

  if (result) {
    return (
      <QuizResultView heading="练习 done" score={result.score} total={result.total} missed={result.missed} sealText="练">
        <button type="button" className="btn btn--primary" onClick={start}>Go again</button>
        <button type="button" className="btn btn--quiet" onClick={() => { setResult(null); setRun(null); }}>Change settings</button>
      </QuizResultView>
    );
  }

  if (run) {
    return (
      <QuizRunner key={run.seed} questions={run.questions} speechRate={state.settings.speechRate}
        onAnswer={(q, correct) => dispatch({ type: 'GRADE', word: q.word, correct, today })}
        onFinish={setResult} />
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader zh="练习" en="Practice" sub="Quiz yourself any time, as often as you like. Every answer counts toward your reviews." />
      <div className={styles.card}>
      <fieldset className={styles.group}>
        <legend>Words from</legend>
        <div className={styles.chips}>
          {SOURCES.map((s) => (
            <button key={s.value} type="button" className="chip" aria-pressed={source === s.value} onClick={() => setSource(s.value)}>{s.label}</button>
          ))}
        </div>
      </fieldset>
      <fieldset className={styles.group}>
        <legend>Question type</legend>
        <div className={styles.chips}>
          {KINDS.filter((k) => speech || k.value !== 'listen-to-hanzi').map((k) => (
            <button key={k.value} type="button" className="chip" aria-pressed={kind === k.value} onClick={() => setKind(k.value)}>{k.label}</button>
          ))}
        </div>
      </fieldset>
      <fieldset className={styles.group}>
        <legend>Length</legend>
        <div className={styles.chips}>
          {[10, 20].map((n) => (
            <button key={n} type="button" className="chip" aria-pressed={size === n} onClick={() => setSize(n)}>{n} questions</button>
          ))}
        </div>
      </fieldset>
      {empty && (
        <p className={styles.empty} role="status">
          {source === 'due' ? 'Nothing is due right now. 好样的！ Try “My levels”.' : 'No words match. Try another source or question type.'}
        </p>
      )}
      <button type="button" className="btn btn--primary" onClick={start}>Start<ArrowRight /></button>
      </div>
    </div>
  );
}
