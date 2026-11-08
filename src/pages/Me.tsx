import type { Settings } from '../lib/types';
import { useStore } from '../state/store';
import { dateKey, streak } from '../lib/dates';
import { MASTERED_BOX } from '../lib/srs';
import { speak, speechSupported } from '../lib/speech';
import { LevelPicker } from '../components/LevelPicker';
import { WordsPerDayPicker } from '../components/WordsPerDayPicker';
import { VoicePicker } from '../components/VoicePicker';
import styles from './Me.module.css';

export default function Me() {
  const { state, dispatch } = useStore();
  const today = dateKey();
  const cards = Object.values(state.cards);
  const set = (patch: Partial<Settings>) => dispatch({ type: 'UPDATE_SETTINGS', patch });
  const stats = [
    { label: 'Day streak', value: streak(Object.keys(state.days).filter((k) => state.days[k].challenge), today) },
    { label: 'Words in review', value: cards.length },
    { label: 'Mastered', value: cards.filter((c) => c.box >= MASTERED_BOX).length },
    { label: 'Already knew', value: state.known.length },
  ];

  return (
    <div className={styles.page}>
      <h1><span lang="zh">我</span> Me</h1>
      <dl className={styles.stats}>
        {stats.map((s) => (
          <div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>
        ))}
      </dl>

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
