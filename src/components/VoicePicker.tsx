import { useEffect, useState } from 'react';
import { chineseVoices, onVoicesChanged, setPreferredVoice, speak } from '../lib/speech';
import styles from './VoicePicker.module.css';

const NOVELTY = /^(Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)\b/;

function label(v: SpeechSynthesisVoice) {
  const name = v.name.replace(/\s*\(Chinese \([^)]*\)\)/, ''); // "Eddy (Chinese (Taiwan))" → "Eddy"
  const notes = [
    /tw/i.test(v.lang) ? 'Taiwan accent' : '',
    v.localService ? '' : 'online',
    NOVELTY.test(v.name) ? 'novelty voice' : '',
  ].filter(Boolean);
  return notes.length ? `${name} · ${notes.join(' · ')}` : name;
}

type Props = { value: string; onChange: (name: string) => void; rate: number };

/** Lets the learner pick a Mandarin voice. Hidden until the browser has loaded its Chinese voices. */
export function VoicePicker({ value, onChange, rate }: Props) {
  const [voices, setVoices] = useState(chineseVoices);
  useEffect(() => onVoicesChanged(() => setVoices(chineseVoices())), []);
  if (!voices.length) return null;
  const selected = voices.some((v) => v.name === value) ? value : '';

  return (
    <div className={styles.voice}>
      <label htmlFor="voice">Voice</label>
      <select
        id="voice"
        className={styles.select}
        value={selected}
        onChange={(e) => {
          onChange(e.target.value);
          setPreferredVoice(e.target.value);
          speak('你好', rate);
        }}
      >
        <option value="">Automatic (recommended)</option>
        {voices.map((v) => (
          <option key={v.name} value={v.name}>{label(v)}</option>
        ))}
      </select>
    </div>
  );
}
