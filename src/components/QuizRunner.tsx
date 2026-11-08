import { useEffect, useRef, useState } from 'react';
import type { Question } from '../lib/quiz';
import { isCJK } from '../lib/pinyin';
import { speak } from '../lib/speech';
import { ChevronRight } from './icons';
import { SpeakButton } from './SpeakButton';
import styles from './QuizRunner.module.css';

export type QuizResult = { score: number; total: number; missed: string[] };

type Props = {
  questions: Question[];
  onAnswer: (q: Question, correct: boolean) => void;
  onFinish: (r: QuizResult) => void;
  speechRate: number;
};

const zh = (s: string) => (isCJK(s) ? 'zh' : undefined);

export function QuizRunner({ questions, onAnswer, onFinish, speechRate }: Props) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const nextRef = useRef<HTMLButtonElement>(null);
  const q = questions[index];
  const answered = picked !== null;
  const isLast = index === questions.length - 1;

  useEffect(() => {
    if (q?.speak) speak(q.speak, speechRate);
  }, [q, speechRate]);

  useEffect(() => {
    if (answered) nextRef.current?.focus();
  }, [answered]);

  function choose(i: number) {
    if (answered || !q) return;
    const correct = i === q.answer;
    setPicked(i);
    if (correct) setScore((s) => s + 1);
    else setMissed((m) => [...m, q.word]);
    onAnswer(q, correct);
    speak(q.word, speechRate);
  }

  function next() {
    if (isLast) {
      onFinish({ score, total: questions.length, missed });
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      const n = Number(e.key);
      if (n >= 1 && n <= (q?.choices.length ?? 0)) choose(n - 1);
      else if (e.key === 'Enter' && answered && !(e.target instanceof HTMLButtonElement)) next();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!q) return null;
  const wide = q.kind === 'hanzi-to-meaning';

  return (
    <section className={styles.runner} aria-label={`Question ${index + 1} of ${questions.length}`}>
      <ol className={styles.progress} aria-hidden="true">
        {questions.map((_, i) => (
          <li key={i} data-state={i < index ? 'done' : i === index ? 'current' : 'todo'} />
        ))}
      </ol>
      <p className={styles.instruction}>{q.instruction}</p>
      {q.speak ? (
        <div className={styles.listen}><SpeakButton text={q.speak} rate={speechRate} label="Play the word again" large /></div>
      ) : (
        <h2 className={styles.prompt} lang={zh(q.prompt)}>{q.prompt}</h2>
      )}
      {q.hint && <p className={styles.hint}>{q.hint}</p>}
      <div className={styles.choices} data-wide={wide}>
        {q.choices.map((c, i) => (
          <button key={c} type="button" data-choice className={styles.choice} lang={zh(c)}
            data-state={!answered ? 'idle' : i === q.answer ? 'right' : i === picked ? 'wrong' : 'dim'}
            onClick={() => choose(i)}>
            {c}
          </button>
        ))}
      </div>
      {answered && (
        <div className={styles.feedback} role="status">
          <div>
            <p className={styles.verdict}>{picked === q.answer ? '对了！ Correct' : `Answer: ${q.choices[q.answer]}`}</p>
            <p className={styles.reveal} lang="zh">{q.reveal}</p>
          </div>
          <button ref={nextRef} type="button" className="btn btn--round" onClick={next}
            aria-label={isLast ? 'See results' : 'Next question'}>
            <ChevronRight />
          </button>
        </div>
      )}
    </section>
  );
}
