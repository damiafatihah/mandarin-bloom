import { LEVEL_OPTIONS, toggleLevels } from '../lib/levels';
import styles from './Pickers.module.css';

export function LevelPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
    <div className={styles.levels} role="group" aria-label="HSK levels">
      {LEVEL_OPTIONS.map((o) => (
        <button key={o.label} type="button" className={styles.level}
          aria-pressed={o.levels.every((l) => value.includes(l))}
          onClick={() => onChange(toggleLevels(value, o.levels))}>
          <span className={styles.levelLabel}>{o.label}</span>
          <span className={styles.levelNote}>{o.note}</span>
        </button>
      ))}
    </div>
  );
}
