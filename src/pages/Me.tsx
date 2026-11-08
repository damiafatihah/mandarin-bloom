import { useState } from 'react';
import type { Settings } from '../lib/types';
import { useStore } from '../state/store';
import { dateKey, streak } from '../lib/dates';
import { MASTERED_BOX } from '../lib/srs';
import { speak, speechSupported } from '../lib/speech';
import { LevelPicker } from '../components/LevelPicker';
import { WordsPerDayPicker } from '../components/WordsPerDayPicker';
import { VoicePicker } from '../components/VoicePicker';
import { Info } from '../components/icons';
import styles from './Me.module.css';

export default function Me() {
  const { state, dispatch } = useStore();
  const today = dateKey();
  const cards = Object.values(state.cards);
  const set = (patch: Partial<Settings>) => dispatch({ type: 'UPDATE_SETTINGS', patch });
  const [open, setOpen] = useState<string | null>(null);
  const stats = [
    {
      label: 'Day streak',
      value: streak(Object.keys(state.days).filter((k) => state.days[k].challenge), today),
      info: 'Days in a row you’ve finished the daily challenge. Miss a day and it starts again from 0.',
    },
    {
      label: 'Words in review',
      value: cards.length,
      info: 'Words the app is teaching you and will quiz you on again later: words you tapped “Teach me” on, got wrong in a quiz, or added from the dictionary.',
    },
    {
      label: 'Mastered',
      value: cards.filter((c) => c.box >= MASTERED_BOX).length,
      info: 'Words you’ve answered correctly 4 times in a row. They now come back only every 15 days or more, and a wrong answer sends a word back to the start. Mastered words are part of Words in review, not extra.',
    },
    {
      label: 'Already knew',
      value: state.known.length,
      info: 'Words you skipped with “I know it”. They’re never quizzed. If you get one wrong in a quiz later, it moves to Words in review.',
    },
  ];
  const openStat = stats.find((s) => s.label === open);

  return (
    <div className={styles.page}>
      <h1><span lang="zh">我</span> Me</h1>
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
              <dd>{s.value}</dd>
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

      <section className={styles.section} aria-labelledby="daily-h">
        <h2 id="daily-h">Daily words</h2>
        <WordsPerDayPicker value={state.settings.wordsPerDay} onChange={(n) => set({ wordsPerDay: n })} />
        <p className={styles.note}>Raising this adds words today. Lowering it applies from tomorrow.</p>
      </section>

      <section className={styles.section} aria-labelledby="levels-h">
        <h2 id="levels-h">Levels</h2>
        <LevelPicker value={state.settings.levels} onChange={(levels) => set({ levels })} />
      </section>

      <section className={styles.section} aria-labelledby="display-h">
        <h2 id="display-h">Display and sound</h2>
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
        <h2 id="data-h">Your data</h2>
        <p className={styles.note}>Progress is saved in this browser only.</p>
        <button type="button" className="btn btn--quiet" onClick={() => {
          if (window.confirm('Erase all progress? Your settings are kept.')) dispatch({ type: 'RESET' });
        }}>Reset progress</button>
      </section>

      <section className={styles.section} aria-labelledby="credits-h">
        <h2 id="credits-h">Credits</h2>
        <p className={styles.note}>
          Dictionary: <a href="https://www.mdbg.net/chinese/dictionary?page=cc-cedict">CC-CEDICT</a> (CC BY-SA 4.0).
          HSK 3.0 word lists: <a href="https://github.com/drkameleon/complete-hsk-vocabulary">complete-hsk-vocabulary</a> (MIT).
        </p>
      </section>
    </div>
  );
}
