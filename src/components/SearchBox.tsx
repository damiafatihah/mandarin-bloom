import { Search } from './icons';
import styles from './SearchBox.module.css';

type Props = { id: string; label: string; value: string; onChange: (v: string) => void; placeholder: string };

/** The rounded search field used by the Dictionary and My words (sticky at the top while scrolling). */
export function SearchBox({ id, label, value, onChange, placeholder }: Props) {
  return (
    <form role="search" className={styles.form} onSubmit={(e) => e.preventDefault()}>
      <label htmlFor={id} className="visually-hidden">{label}</label>
      <span className={styles.searchIcon}><Search /></span>
      <input id={id} name="q" type="search" className={styles.input} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} autoComplete="off" autoCapitalize="off" spellCheck={false} enterKeyHint="search" />
    </form>
  );
}
