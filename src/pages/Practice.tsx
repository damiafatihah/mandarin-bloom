import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useStore } from '../state/store';
import { useHsk } from '../data/resources';
import { dateKey } from '../lib/dates';
import { seededRng } from '../lib/rng';
import { buildQuestions, type QuestionKind } from '../lib/quiz';
import { pickPracticeWords, type PracticeSource } from '../lib/challenge';
import { speechSupported } from '../lib/speech';
import { QuizRunner, tally } from '../components/QuizRunner';
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
  const saved = state.practice;
  const [source, setSource] = useState<PracticeSource>(params.get('source') === 'due' ? 'due' : (saved?.source ?? 'levels'));
  const [kind, setKind] = useState<QuestionKind | 'mixed'>((saved?.kind as QuestionKind | undefined) ?? 'mixed');
  const [size, setSize] = useState(saved?.size ?? 10);
  const [empty, setEmpty] = useState(false);
  const today = dateKey();
  const speech = speechSupported();

  // The saved session's questions are rebuilt from its words and seed, so a resume shows the same quiz.
  const questions = useMemo(
    () => (pool && saved ? buildQuestions(saved.words, pool, saved.seed, { speech, kind: saved.kind as QuestionKind | undefined }) : []),
    [pool, saved?.seed, saved?.words, saved?.kind, speech], // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (error) return <LoadError error={error} />;
  if (!pool) return <Loading label="Loading words…" />;

  function start(opts = { source, size, kind }) {
    const seed = `practice:${Date.now()}`;
    const forced = opts.kind === 'mixed' ? undefined : opts.kind;
    const words = pickPracticeWords(pool!, state, { source: opts.source, size: opts.size, today, speech, kind: forced, rng: seededRng(seed) });
    if (!words.length) {
      setEmpty(true);
      dispatch({ type: 'END_PRACTICE' });
      return;
    }
    setEmpty(false);
    dispatch({ type: 'START_PRACTICE', seed, words, source: opts.source, size: opts.size, kind: forced });
  }

  if (saved?.finished) {
    const r = tally(questions, saved.answers);
    const again = { source: saved.source, size: saved.size, kind: (saved.kind as QuestionKind | undefined) ?? 'mixed' as const };
    return (
      <QuizResultView heading="练习 done" score={r.score} total={r.total} missed={r.missed} sealText="练">
        <button type="button" className="btn btn--primary" onClick={() => start(again)}>Go again</button>
        <button type="button" className="btn btn--quiet" onClick={() => dispatch({ type: 'END_PRACTICE' })}>Change settings</button>
      </QuizResultView>
    );
  }

  if (saved) {
    return (
      <div className={styles.running}>
        <div className={styles.runBar}>
          <p className={styles.runLabel}><span lang="zh" className="zh-title">练习</span> Practice · saved as you go</p>
          <button type="button" className="btn btn--quiet" onClick={() => dispatch({ type: 'END_PRACTICE' })}>End practice</button>
        </div>
        <QuizRunner key={saved.seed} questions={questions} speechRate={state.settings.speechRate}
          startIndex={saved.index} startAnswers={saved.answers}
          onAnswer={(q, correct, index, choice) => dispatch({ type: 'ANSWER_PRACTICE', index, choice, word: q.word, correct, today })}
          onAdvance={(index) => dispatch({ type: 'ADVANCE_PRACTICE', index })}
          onFinish={() => dispatch({ type: 'FINISH_PRACTICE' })} />
      </div>
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
      <button type="button" className="btn btn--primary" onClick={() => start()}>Start<ArrowRight /></button>
      </div>
    </div>
  );
}
