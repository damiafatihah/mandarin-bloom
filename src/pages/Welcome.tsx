import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from '../state/store';
import { Landscape } from '../components/art/Scenery';
import { Backdrop } from '../components/Backdrop';
import { Seal } from '../components/Seal';
import { LevelPicker } from '../components/LevelPicker';
import { WordsPerDayPicker } from '../components/WordsPerDayPicker';
import { ChevronRight } from '../components/icons';
import styles from './Welcome.module.css';

export default function Welcome() {
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [wordsPerDay, setWordsPerDay] = useState(state.settings.wordsPerDay);
  const [levels, setLevels] = useState(state.settings.levels);

  function finish() {
    dispatch({ type: 'COMPLETE_ONBOARDING', settings: { wordsPerDay, levels } });
    navigate('/', { replace: true });
  }

  return (
    <div className={styles.screen}>
      <Backdrop />
      <aside className={styles.poem} aria-hidden="true">
        <p className={styles.poemHan} lang="zh">学海无涯</p>
        <p className={styles.poemEn}>The sea of learning has no shore.</p>
      </aside>
      <main className={styles.card}>
        <Landscape variant="wide" seed="welcome" pagoda sun birds boat pagodaRange={[0.55, 0.8]} sunX={0.75} className={`${styles.art} fade-bottom`} />
        <div className={styles.body}>
          {step === 0 && (
            <>
              <div className={styles.brand}>
                <p className={styles.brandHan} lang="zh">学海</p>
                <Seal text="学" size={40} />
              </div>
              <h1 className={styles.title}>Sharpen the Mandarin you already have</h1>
              <p className={styles.lead}>A few new words a day, one ten-question challenge, and a dictionary in your pocket. Skip what you know and spend your time on what you don’t.</p>
            </>
          )}
          {step === 1 && (
            <>
              <h1 className={styles.title}>How many new words a day?</h1>
              <p className={styles.lead}>Words you already know can be skipped, so aim for what feels steady.</p>
              <WordsPerDayPicker value={wordsPerDay} onChange={setWordsPerDay} />
            </>
          )}
          {step === 2 && (
            <>
              <h1 className={styles.title}>Where should we start?</h1>
              <p className={styles.lead}>Pick one or more. You can change this any time in Me.</p>
              <LevelPicker value={levels} onChange={setLevels} />
            </>
          )}
        </div>
        <footer className={styles.footer}>
          <ol className={styles.dots} aria-label={`Step ${step + 1} of 3`}>
            {[0, 1, 2].map((i) => <li key={i} data-active={i === step} />)}
          </ol>
          {step < 2 ? (
            <button type="button" className="btn btn--round" aria-label="Next" onClick={() => setStep(step + 1)}><ChevronRight /></button>
          ) : (
            <button type="button" className="btn btn--primary" onClick={finish}>Start learning</button>
          )}
        </footer>
      </main>
    </div>
  );
}
