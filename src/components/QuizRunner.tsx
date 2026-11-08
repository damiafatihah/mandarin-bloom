import { useEffect, useRef, useState } from 'react';
import type { Question, QuestionKind } from '../lib/quiz';
import { isCJK } from '../lib/pinyin';
import { speak } from '../lib/speech';
import { ArrowRight, Check } from './icons';
import { SpeakButton } from './SpeakButton';
import styles from './QuizRunner.module.css';

export type QuizResult = { score: number; total: number; missed: string[] };

type Props = {
  questions: Question[];
  onAnswer: (q: Question, correct: boolean) => void;
  onFinish: (r: QuizResult) => void;
  speechRate: number;
};

/** The question asked in Chinese, above the English instruction. */
const ASK_ZH: Record<QuestionKind, string> = {
  'hanzi-to-meaning': '这个词是什么意思？',
  'meaning-to-hanzi': '哪个词是这个意思？',
  'hanzi-to-pinyin': '哪个读音是对的？',
  'listen-to-hanzi': '你听到的是哪个词？',
  'measure-word': '选出正确的量词',
};

const zh = (s: string) => (isCJK(s) ? 'zh' : undefined);

const Cross = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

/** "治疗 · zhì liáo · to treat" → hanzi in the Chinese face, pinyin in the pinyin face. */
function Reveal({ text }: { text: string }) {
  const [hanzi, pinyin, ...rest] = text.split(' · ');
  return (
    <p className={styles.reveal}>
      <span lang="zh" className={styles.revealHan}>{hanzi}</span> <span className="pinyin">{pinyin}</span> · {rest.join(' · ')}
    </p>
  );
}

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
  const done = index + (answered ? 1 : 0);
  const correct = answered && picked === q.answer;

  return (
    <section className={styles.runner} aria-label={`Question ${index + 1} of ${questions.length}`}>
      <div className={styles.top}>
        <p className={`${styles.count} num`}><strong>{index + 1}</strong> / {questions.length}</p>
        <div className={styles.track} aria-hidden="true">
          <span style={{ width: `${(done / questions.length) * 100}%` }} />
        </div>
      </div>

      <div className={styles.ask}>
        <p className={styles.askZh} lang="zh">{ASK_ZH[q.kind]}</p>
        <p className={styles.instruction}>{q.instruction}</p>
      </div>

      {q.speak ? (
        <div className={styles.listen}><SpeakButton text={q.speak} rate={speechRate} label="Play the word again" large /></div>
      ) : (
        <h2 className={styles.prompt} lang={zh(q.prompt)}>{q.prompt}</h2>
      )}
      {q.hint && <p className={styles.hint}>{q.hint}</p>}

      <div className={styles.choices} data-wide={wide}>
        {q.choices.map((c, i) => {
          const state = !answered ? 'idle' : i === q.answer ? 'right' : i === picked ? 'wrong' : 'dim';
          return (
            <button key={c} type="button" data-choice data-state={state} lang={zh(c)}
              className={`${styles.choice}${q.kind === 'hanzi-to-pinyin' ? ' pinyin' : ''}`}
              onClick={() => choose(i)}>
              <span className={styles.choiceText}>{c}</span>
              {state === 'right' && <span className={styles.mark}><Check /></span>}
              {state === 'wrong' && <span className={styles.mark}><Cross /></span>}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className={styles.feedback} data-correct={correct} role="status">
          <div className={styles.feedbackText}>
            <p className={styles.verdict}>{correct ? '对了！ Correct' : `Answer: ${q.choices[q.answer]}`}</p>
            <Reveal text={q.reveal} />
          </div>
          <button ref={nextRef} type="button" className="btn btn--primary" onClick={next}
            aria-label={isLast ? 'See results' : 'Next question'}>
            {isLast ? 'Results' : 'Next'}<ArrowRight />
          </button>
        </div>
      )}
    </section>
  );
}
