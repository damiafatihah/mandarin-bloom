import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useStore } from '../state/store';
import { useHsk } from '../data/resources';
import { dateKey } from '../lib/dates';
import { buildQuestions } from '../lib/quiz';
import { buildChallengeWords } from '../lib/challenge';
import { speechSupported } from '../lib/speech';
import { QuizRunner, type QuizResult } from '../components/QuizRunner';
import { QuizResultView } from '../components/QuizResultView';
import { Loading, LoadError } from '../components/Status';
import { InkMist } from '../components/InkMist';
import styles from './Challenge.module.css';

export default function Challenge() {
  const { state, dispatch } = useStore();
  const { data: pool, error } = useHsk();
  const today = dateKey();
  const day = state.days[today];
  const words = day?.challengeWords;
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  const questions = useMemo(
    () => (pool && words ? buildQuestions(words, pool, `challenge:${today}`, { speech: speechSupported() }) : []),
    [pool, words, today],
  );

  if (error) return <LoadError error={error} />;
  if (!pool) return <Loading label="Preparing today’s challenge…" />;

  const sealText = day?.words[0]?.[0] ?? '学';
  if (result || day?.challenge) {
    const r = result ?? { ...day!.challenge!, missed: [] };
    return (
      <QuizResultView heading="每日挑战 complete" score={r.score} total={r.total} missed={r.missed} sealText={sealText}>
        <Link to="/" className="btn btn--primary">Back to today</Link>
        <Link to="/practice" className="btn btn--quiet">Practise more</Link>
      </QuizResultView>
    );
  }

  if (!playing) {
    return (
      <section className={styles.intro} aria-labelledby="ch-h">
        <InkMist className={styles.mist} />
        <h1 id="ch-h"><span lang="zh">每日挑战</span> Daily challenge</h1>
        <p>Ten questions built from today’s words, your due reviews and a few surprises from your levels. Anything you miss joins your reviews.</p>
        <button type="button" className="btn btn--primary" onClick={() => {
          if (!words) dispatch({ type: 'START_CHALLENGE', today, words: buildChallengeWords(pool, state, today) });
          setPlaying(true);
        }}>Begin</button>
      </section>
    );
  }

  return (
    <QuizRunner
      questions={questions}
      speechRate={state.settings.speechRate}
      onAnswer={(q, correct) => dispatch({ type: 'GRADE', word: q.word, correct, today })}
      onFinish={(r) => {
        dispatch({ type: 'FINISH_CHALLENGE', today, score: r.score, total: r.total });
        setResult(r);
      }}
    />
  );
}
