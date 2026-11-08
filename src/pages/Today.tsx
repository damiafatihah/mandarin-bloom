import { useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import type { HskWord } from '../lib/types';
import { useStore } from '../state/store';
import { useHsk } from '../data/resources';
import { dateKey, streak } from '../lib/dates';
import { WordCard } from '../components/WordCard';
import { SealCalendar } from '../components/SealCalendar';
import { Seal } from '../components/Seal';
import { Waves } from '../components/Waves';
import { Play } from '../components/icons';
import { Loading, LoadError } from '../components/Status';
import styles from './Today.module.css';

const zhDate = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });

export default function Today() {
  const { state, dispatch } = useStore();
  const { data: pool, error } = useHsk();
  const today = dateKey();
  const { wordsPerDay, toneColors, speechRate } = state.settings;

  useEffect(() => {
    if (pool) dispatch({ type: 'ENSURE_DAY', today, pool });
  }, [pool, today, wordsPerDay, dispatch]);

  const byS = useMemo(() => new Map((pool ?? []).map((w) => [w.s, w])), [pool]);

  if (error) return <LoadError error={error} />;
  if (!pool) return <Loading label="Opening today’s page…" />;

  const day = state.days[today];
  const words = (day?.words ?? []).map((s) => byS.get(s)).filter((w): w is HskWord => !!w);
  const due = Object.values(state.cards).filter((c) => c.due <= today).length;
  const streakDays = streak(Object.keys(state.days).filter((k) => state.days[k].challenge), today);

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
        <div className={styles.words}>
          {words.map((w) => (
            <WordCard key={w.s} word={w} toneColors={toneColors} speechRate={speechRate}
              onKnown={() => dispatch({ type: 'MARK_KNOWN', word: w.s, today, pool })} />
          ))}
        </div>
        {(day?.skipped ?? 0) >= 10 && (
          <p className={styles.nudge}>You’ve skipped {day?.skipped} familiar words today. <Link to="/me">Try a higher level →</Link></p>
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
