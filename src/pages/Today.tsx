import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router';
import type { HskWord } from '../lib/types';
import { useStore } from '../state/store';
import { useHsk } from '../data/resources';
import { dateKey, streak } from '../lib/dates';
import { dayProgress, selectNewWords } from '../lib/daily';
import { greetingFor } from '../lib/greeting';
import { WordCard, type CardStatus } from '../components/WordCard';
import { SealCalendar } from '../components/SealCalendar';
import { Seal } from '../components/Seal';
import { Landscape } from '../components/art/Scenery';
import { Check, ChevronRight, Flame } from '../components/icons';
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

  const now = new Date();
  const hello = greetingFor(now.getHours());
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
      <header className={styles.hero}>
        <Landscape variant="header" seed="today" pagoda sun birds className={styles.heroArt} />
        <div className={styles.heroText}>
          <p className={styles.date} lang="zh">{zhDate.format(now)}</p>
          <h1 className={styles.greeting} lang="zh">{hello.zh}，<br />今天也要加油哦！</h1>
          <p className={styles.greetingEn}>{hello.en}. A little Mandarin every day.</p>
        </div>
        {streakDays > 0 && (
          <p className={styles.streak}><Flame /><strong className="num">{streakDays}</strong> day streak</p>
        )}
      </header>

      <section className={styles.wordsSection} aria-label="Today’s word cards">
        <div className={styles.sectionHead}>
          <h2><span className="zh-title" lang="zh">今日新词</span> <span className="en-sub">Today’s words</span></h2>
          <p className={styles.progressText} aria-live="polite">
            <strong className="num">{progress.done}</strong> of {progress.total} words done today
          </p>
        </div>
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

        {allDone && (
          <section className={styles.goalDone} aria-labelledby="goal-done-h">
            <Landscape variant="card" seed="goal" className={styles.goalHills} />
            <Seal text="完" size={60} title="Daily goal done" stamp />
            <div className={styles.goalBody}>
              <h2 id="goal-done-h"><span className="zh-title" lang="zh">今日完成</span> Daily goal done</h2>
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

        <div className={styles.words} ref={listRef} data-carousel>
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
        <section className={styles.panel} aria-labelledby="tasks-h">
          <h2 id="tasks-h"><span className="zh-title" lang="zh">今日任务</span> <span className="en-sub">Today’s tasks</span></h2>
          <ul className={styles.tasks}>
            <li>
              <Link to="/challenge" className={styles.task}>
                <span className={styles.taskIcon} lang="zh" aria-hidden="true">战</span>
                <span className={styles.taskText}>
                  <span className={styles.taskTitle} lang="zh">每日挑战</span>
                  <span className={styles.taskSub}>
                    {day?.challenge
                      ? `Daily challenge · done ${day.challenge.score}/${day.challenge.total}`
                      : 'Daily challenge'}
                  </span>
                </span>
                {day?.challenge
                  ? <Seal text={day.words[0]?.[0] ?? '学'} size={34} title="Challenge done today" />
                  : <span className={styles.chev}><ChevronRight /></span>}
              </Link>
            </li>
            <li>
              <Link to="/practice?source=due" className={styles.task}>
                <span className={styles.taskIcon} lang="zh" aria-hidden="true">复</span>
                <span className={styles.taskText}>
                  <span className={styles.taskTitle} lang="zh">复习</span>
                  <span className={styles.taskSub}>
                    {due > 0 ? `Review · ${due} word${due === 1 ? '' : 's'} due` : 'Review · nothing due'}
                  </span>
                </span>
                {due > 0 && <span className={styles.count}>{due}</span>}
                <span className={styles.chev}><ChevronRight /></span>
              </Link>
            </li>
          </ul>
        </section>

        <section className={styles.panel} aria-labelledby="seals-h">
          <h2 id="seals-h"><span className="zh-title" lang="zh">印章</span> <span className="en-sub">Your seals · last 14 days</span></h2>
          <SealCalendar days={state.days} today={today} />
        </section>
      </aside>
    </div>
  );
}
