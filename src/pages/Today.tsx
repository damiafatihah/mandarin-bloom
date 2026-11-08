import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router';
import type { HskWord } from '../lib/types';
import { useStore } from '../state/store';
import { useHsk } from '../data/resources';
import { dateKey, streak } from '../lib/dates';
import { dayProgress, selectNewWords } from '../lib/daily';
import { WordCard, type CardStatus } from '../components/WordCard';
import { SealCalendar } from '../components/SealCalendar';
import { Seal } from '../components/Seal';
import { Waves } from '../components/Waves';
import { Check, Play } from '../components/icons';
import { Loading, LoadError } from '../components/Status';
import styles from './Today.module.css';

const zhDate = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });

export default function Today() {
  const { state, dispatch } = useStore();
  const { data: pool, error } = useHsk();
  const today = dateKey();
  const { wordsPerDay, toneColors, speechRate } = state.settings;
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pool) dispatch({ type: 'ENSURE_DAY', today, pool });
  }, [pool, today, wordsPerDay, dispatch]);

  const byS = useMemo(() => new Map((pool ?? []).map((w) => [w.s, w])), [pool]);

  if (error) return <LoadError error={error} />;
  if (!pool) return <Loading label="Opening today’s page…" />;

  const day = state.days[today];
  const words = (day?.words ?? []).map((s) => byS.get(s)).filter((w): w is HskWord => !!w);
  const statusOf = (s: string): CardStatus => day?.handled?.[s] ?? 'new';
  const progress = dayProgress(day, wordsPerDay);
  const allDone = progress.total > 0 && progress.done === progress.total;
  const moreAvailable = allDone ? selectNewWords(pool, state, today, wordsPerDay).length : 0;
  const due = Object.values(state.cards).filter((c) => c.due <= today).length;
  const streakDays = streak(Object.keys(state.days).filter((k) => state.days[k].challenge), today);

  /** On the phone carousel, glide to the next card still waiting for a choice. */
  function showNextCard(after: string) {
    const list = listRef.current;
    if (!list || list.scrollWidth <= list.clientWidth) return; // grid layout: everything is visible
    const i = words.findIndex((w) => w.s === after);
    const next = [...words.slice(i + 1), ...words.slice(0, i)].find((w) => statusOf(w.s) === 'new');
    const el = next && list.querySelector<HTMLElement>(`[aria-label="${next.s}"]`);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el?.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest', inline: 'start' });
  }
  function choose(word: string, type: 'TEACH' | 'MARK_KNOWN') {
    dispatch({ type, word, today });
    showNextCard(word);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.date} lang="zh">{zhDate.format(new Date())}</p>
          <h1 className={styles.title}><span lang="zh">今日</span> Today’s words</h1>
        </div>
        {streakDays > 0 && (
          <p className={styles.streak}><strong>{streakDays}</strong> day streak</p>
        )}
      </header>

      <section className={styles.wordsSection} aria-label="Today’s word cards">
        <div className={styles.progress}>
          <p className={styles.progressText} aria-live="polite">
            <strong>{progress.done}</strong> of {progress.total} words done today
          </p>
          <div className={styles.bar} role="progressbar" aria-label="Today’s words"
            aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
            {words.map((w) => <span key={w.s} data-state={statusOf(w.s)} />)}
          </div>
          {progress.goalMet && !allDone && (
            <p className={styles.hint}><Check /> Daily goal of {progress.goal} done · these extra words are optional</p>
          )}
          {!progress.goalMet && (
            <p className={styles.hint}>Tap <b>Teach me</b> to learn a word, or <b>I know it</b> to skip it. Both count.</p>
          )}
        </div>

        {allDone && (
          <section className={styles.goalDone} aria-labelledby="goal-done-h">
            <Seal text="完" size={64} title="Daily goal done" stamp />
            <div className={styles.goalBody}>
              <h2 id="goal-done-h"><span lang="zh">今日完成</span> Daily goal done</h2>
              <p>
                <strong>{progress.total} word{progress.total === 1 ? '' : 's'} today</strong>
                {' · '}{progress.learned} learned · {progress.known} already knew
              </p>
              <p className={styles.optional}>
                {moreAvailable > 0
                  ? 'That’s today’s goal. Learning more is optional.'
                  : 'You’ve seen every word in your levels. Pick another level in Me for more.'}
              </p>
              <div className={styles.doneActions}>
                {moreAvailable > 0 && (
                  <button type="button" className="btn btn--primary"
                    onClick={() => dispatch({ type: 'LEARN_MORE', today, pool, count: wordsPerDay })}>
                    Learn {Math.min(wordsPerDay, moreAvailable)} more
                  </button>
                )}
                {!day?.challenge && <Link to="/challenge" className="btn btn--quiet">Take today’s challenge</Link>}
              </div>
            </div>
          </section>
        )}

        <div className={styles.words} ref={listRef}>
          {words.map((w) => (
            <WordCard key={w.s} word={w} status={statusOf(w.s)} toneColors={toneColors} speechRate={speechRate}
              onTeach={() => choose(w.s, 'TEACH')}
              onKnown={() => choose(w.s, 'MARK_KNOWN')}
              onUndo={() => dispatch({ type: 'UNDO_DAILY', word: w.s, today })} />
          ))}
        </div>
        {progress.known >= 4 && progress.known >= 0.8 * progress.done && (
          <p className={styles.nudge}>Most of today’s words were familiar. <Link to="/me">Try a higher level →</Link></p>
        )}
      </section>

      <aside className={styles.aside}>
        <section className={styles.challenge} aria-labelledby="challenge-h">
          <Waves className={styles.waves} />
          <h2 id="challenge-h"><span lang="zh">每日挑战</span> Daily challenge</h2>
          {day?.challenge ? (
            <div className={styles.done}>
              <Seal text={day.words[0]?.[0] ?? '学'} size={56} title="Done today" />
              <p>Done: {day.challenge.score}/{day.challenge.total}. A new one opens tomorrow.</p>
            </div>
          ) : (
            <div className={styles.cta}>
              <p>Ten questions on tones, meanings, listening and measure words.</p>
              <Link to="/challenge" className="btn btn--round" aria-label="Start the challenge"><Play /></Link>
            </div>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="review-h">
          <h2 id="review-h"><span lang="zh">复习</span> Review</h2>
          {due > 0 ? (
            <div className={styles.row}>
              <p><strong>{due}</strong> word{due === 1 ? '' : 's'} due</p>
              <Link to="/practice?source=due" className="btn btn--primary">Review now</Link>
            </div>
          ) : (
            <p>Nothing due. 好样的！</p>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="seals-h">
          <h2 id="seals-h"><span lang="zh">印章</span> Your seals</h2>
          <SealCalendar days={state.days} today={today} />
        </section>
      </aside>
    </div>
  );
}
