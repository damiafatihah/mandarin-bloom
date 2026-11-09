import { useState } from 'react';
import { Link } from 'react-router';
import type { Settings } from '../lib/types';
import { useStore } from '../state/store';
import { streak } from '../lib/dates';
import { MASTERED_BOX } from '../lib/srs';
import { speak, speechSupported } from '../lib/speech';
import { LevelPicker } from '../components/LevelPicker';
import { WordsPerDayPicker } from '../components/WordsPerDayPicker';
import { VoicePicker } from '../components/VoicePicker';
import { ChevronRight, Info } from '../components/icons';
import { PageHeader } from '../components/PageHeader';
import { Seal } from '../components/Seal';
import { dayProgress, goalSummary } from '../lib/daily';
import { useDailyDeal } from '../hooks/useDailyDeal';
import styles from './Me.module.css';

export default function Me() {
  const { state, dispatch } = useStore();
  const { today, pool } = useDailyDeal();
  const cards = Object.values(state.cards);
  const set = (patch: Partial<Settings>) => dispatch({ type: 'UPDATE_SETTINGS', patch });
  const [open, setOpen] = useState<string | null>(null);
  const stats: { label: string; value: number; info: string; to?: string }[] = [
    {
      label: 'Day streak',
      value: streak(Object.keys(state.days).filter((k) => state.days[k].challenge), today),
      info: 'Days in a row you’ve finished the daily challenge. Miss a day and it starts again from 0.',
    },
    {
      label: 'Words in review',
      value: cards.length,
      to: '/words?filter=review',
      info: 'Words the app is teaching you and will quiz you on again later: words you tapped “Teach me” on, got wrong in a quiz, or added from the dictionary.',
    },
    {
      label: 'Mastered',
      value: cards.filter((c) => c.box >= MASTERED_BOX).length,
      to: '/words?filter=mastered',
      info: 'Words you’ve answered correctly 4 times in a row. They now come back only every 15 days or more, and a wrong answer sends a word back to the start. Mastered words are part of Words in review, not extra.',
    },
    {
      label: 'Already knew',
      value: state.known.length,
      to: '/words?filter=known',
      info: 'Words you skipped with “I know it”. They’re never quizzed. If you get one wrong in a quiz later, it moves to Words in review.',
    },
  ];
  const openStat = stats.find((s) => s.label === open);
  const myWordCount = cards.length + state.known.filter((w) => !state.cards[w]).length;
  const goal = goalSummary(dayProgress(state.days[today], state.settings.wordsPerDay));
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const goalNote = !goal.met
    ? `Learn or skip ${plural(goal.target - goal.towardGoal, 'more word')} on Today.`
    : goal.optionalLeft > 0
      ? `Goal reached. ${plural(goal.optionalLeft, 'optional word')} left on Today.`
      : goal.extraDone > 0
        ? `Goal reached, plus ${goal.extraDone} extra. 好样的！`
        : 'Goal reached. 好样的！';
  const R = 34;
  const C = 2 * Math.PI * R;

  return (
    <div className={styles.page}>
      <PageHeader zh="我的" en="Me" sub="Your progress and settings, saved in this browser." />

      <section className={styles.goal} aria-labelledby="goal-h">
        <svg className={styles.ring} viewBox="0 0 80 80" aria-hidden="true">
          <circle cx="40" cy="40" r={R} className={styles.ringTrack} />
          <circle cx="40" cy="40" r={R} className={styles.ringFill} strokeDasharray={`${C * goal.ratio} ${C}`} />
        </svg>
        <div className={styles.goalText}>
          <h2 id="goal-h"><span className="zh-title" lang="zh">今日目标</span> <span className="en-sub">Today’s goal</span></h2>
          <p className={styles.goalCount}><strong className="num">{goal.towardGoal}</strong> / {goal.target} words done today</p>
          <p className={styles.goalNote}>{goalNote}</p>
        </div>
        {goal.met && <Seal text="完" size={44} title="Today’s goal reached" />}
      </section>

      <div className={styles.statsBlock}>
        <dl className={styles.stats}>
          {stats.map((s) => (
            <div key={s.label} className={styles.stat} data-open={open === s.label}>
              <dt>
                <span>{s.label}</span>
                <button type="button" className={styles.info} aria-label={`What does “${s.label}” mean?`}
                  aria-expanded={open === s.label} aria-controls="stat-info"
                  onClick={() => setOpen(open === s.label ? null : s.label)}>
                  <Info />
                </button>
              </dt>
              <dd>
                <span data-stat-value>{s.value}</span>
                {s.to && <Link to={s.to} className={styles.statLink} aria-label={`See ${s.label}`}>See<ChevronRight /></Link>}
              </dd>
            </div>
          ))}
        </dl>
        {openStat && (
          <section id="stat-info" className={styles.explain} aria-labelledby="stat-info-h">
            <h2 id="stat-info-h">{openStat.label}</h2>
            <p>{openStat.info}</p>
          </section>
        )}
      </div>

      <Link to="/words" className={styles.myWords}>
        <span className={styles.myWordsZh} lang="zh">我的词语</span>
        <span className={styles.myWordsText}>
          <strong>My words</strong>
          <span>{myWordCount} word{myWordCount === 1 ? '' : 's'} · search and filter everything you’ve learnt</span>
        </span>
        <ChevronRight />
      </Link>

      <section className={styles.section} aria-labelledby="daily-h">
        <h2 id="daily-h"><span className="zh-title" lang="zh">每日新词</span> <span className="en-sub">Daily words</span></h2>
        <WordsPerDayPicker value={state.settings.wordsPerDay} onChange={(n) => dispatch({ type: 'SET_WORDS_PER_DAY', n, today })} />
        <p className={styles.note}>Changes today’s goal straight away. Raising it adds words now; lowering it removes words you haven’t started, never ones you’ve done.</p>
      </section>

      <section className={styles.section} aria-labelledby="levels-h">
        <h2 id="levels-h"><span className="zh-title" lang="zh">级别</span> <span className="en-sub">Levels</span></h2>
        <LevelPicker value={state.settings.levels} onChange={(levels) =>
          pool ? dispatch({ type: 'SET_LEVELS', levels, today, pool }) : set({ levels })} />
        <p className={styles.note}>Today’s untouched words from levels you turn off are swapped for words from your new levels.</p>
      </section>

      <section className={styles.section} aria-labelledby="display-h">
        <h2 id="display-h"><span className="zh-title" lang="zh">显示与声音</span> <span className="en-sub">Display and sound</span></h2>
        <label className={styles.toggle}>
          <input type="checkbox" checked={state.settings.toneColors} onChange={(e) => set({ toneColors: e.target.checked })} />
          Colour pinyin by tone
        </label>
        {speechSupported() && (
          <VoicePicker value={state.settings.voiceName} rate={state.settings.speechRate} onChange={(voiceName) => set({ voiceName })} />
        )}
        {speechSupported() && (
          <div className={styles.range}>
            <label htmlFor="rate">Voice speed {state.settings.speechRate.toFixed(1)}×</label>
            <input id="rate" type="range" min="0.6" max="1.2" step="0.1" value={state.settings.speechRate}
              onChange={(e) => set({ speechRate: Number(e.target.value) })} />
            <button type="button" className="btn btn--quiet" onClick={() => speak('你好，欢迎来到学海。', state.settings.speechRate)}>Test voice</button>
          </div>
        )}
      </section>

      <section className={styles.section} aria-labelledby="data-h">
        <h2 id="data-h"><span className="zh-title" lang="zh">数据</span> <span className="en-sub">Your data</span></h2>
        <p className={styles.note}>Progress is saved in this browser only.</p>
        <button type="button" className="btn btn--quiet" onClick={() => {
          if (window.confirm('Erase all progress? Your settings are kept.')) dispatch({ type: 'RESET' });
        }}>Reset progress</button>
      </section>

      <section className={styles.section} aria-labelledby="credits-h">
        <h2 id="credits-h"><span className="zh-title" lang="zh">致谢</span> <span className="en-sub">Credits</span></h2>
        <p className={styles.note}>
          Dictionary: <a href="https://www.mdbg.net/chinese/dictionary?page=cc-cedict">CC-CEDICT</a> (CC BY-SA 4.0).
          HSK 3.0 word lists: <a href="https://github.com/drkameleon/complete-hsk-vocabulary">complete-hsk-vocabulary</a> (MIT).
        </p>
      </section>
    </div>
  );
}
