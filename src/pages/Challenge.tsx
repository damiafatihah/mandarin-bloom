import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useStore } from '../state/store';
import { useHsk } from '../data/resources';
import { dateKey } from '../lib/dates';
import { buildQuestions } from '../lib/quiz';
import { buildChallengeWords } from '../lib/challenge';
import { speechSupported } from '../lib/speech';
import { QuizRunner, tally, type QuizResult } from '../components/QuizRunner';
import { QuizResultView } from '../components/QuizResultView';
import { Loading, LoadError } from '../components/Status';
import { Landscape } from '../components/art/Scenery';
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
  const run = day?.challengeRun;
  if (result || day?.challenge) {
    const r = result ?? { ...day!.challenge!, missed: run ? tally(questions, run.answers).missed : [] };
    return (
      <QuizResultView heading="每日挑战 complete" score={r.score} total={r.total} missed={r.missed} sealText={sealText}>
        <Link to="/" className="btn btn--primary">Back to today</Link>
        <Link to="/practice" className="btn btn--quiet">Practise more</Link>
      </QuizResultView>
    );
  }

  // A challenge already under way resumes where it was left; only a fresh one shows the intro.
  const inProgress = !!words && !!run && (run.index > 0 || run.answers.some((x) => x != null));
  if (!playing && !inProgress) {
    return (
      <section className={styles.intro} aria-labelledby="ch-h">
        <Landscape variant="wide" seed="challenge" pagoda sun birds pagodaRange={[0.42, 0.58]} sunX={0.6} className={`${styles.art} fade-bottom`} />
        <h1 id="ch-h" className={styles.title}>
          <span className={styles.titleZh} lang="zh">每日挑战</span>
          <span className={styles.titleEn}>Daily challenge</span>
        </h1>
        <p className={styles.lead}>Ten questions built from today’s words, your due reviews and a few surprises from your levels. Anything you miss joins your reviews.</p>
        <ul className={styles.facts}>
          <li className="tag">10 questions</li>
          <li className="tag">Tones · meanings · listening</li>
          <li className="tag">About 3 minutes</li>
        </ul>
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
      startIndex={run?.index ?? 0}
      startAnswers={run?.answers ?? []}
      onAnswer={(q, correct, index, choice) =>
        dispatch({ type: 'ANSWER_CHALLENGE', today, index, choice, word: q.word, correct })}
      onAdvance={(index) => dispatch({ type: 'ADVANCE_CHALLENGE', today, index })}
      onFinish={(r) => {
        dispatch({ type: 'FINISH_CHALLENGE', today, score: r.score, total: r.total });
        setResult(r);
      }}
    />
  );
}
