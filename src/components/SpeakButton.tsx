import { speak, speechSupported } from '../lib/speech';
import { Speaker } from './icons';
import styles from './SpeakButton.module.css';

type Props = { text: string; rate?: number; label?: string; large?: boolean };

export function SpeakButton({ text, rate = 0.9, label = 'Listen', large = false }: Props) {
  if (!speechSupported()) return null;
  return (
    <button type="button" className={`${styles.speak} ${large ? styles.large : ''}`}
      onClick={() => speak(text, rate)} aria-label={label}>
      <Speaker />
    </button>
  );
}
