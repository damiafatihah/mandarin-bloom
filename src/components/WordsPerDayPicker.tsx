import styles from './Pickers.module.css';

const PRESETS = [3, 5, 10, 15];

export function WordsPerDayPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className={styles.perDay}>
      <div className={styles.stepper}>
        <button type="button" className="btn btn--round" aria-label="Fewer words" onClick={() => onChange(Math.max(1, value - 1))}>−</button>
        <output className={styles.count} aria-live="polite"><strong>{value}</strong> new words a day</output>
        <button type="button" className="btn btn--round" aria-label="More words" onClick={() => onChange(Math.min(30, value + 1))}>+</button>
      </div>
      <div className={styles.presets} role="group" aria-label="Presets">
        {PRESETS.map((n) => (
          <button key={n} type="button" className="chip" aria-pressed={n === value} onClick={() => onChange(n)}>{n}</button>
        ))}
      </div>
    </div>
  );
}
