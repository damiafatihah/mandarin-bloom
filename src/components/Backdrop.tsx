import { Landscape } from './art/Scenery';
import styles from './Backdrop.module.css';

/** Fixed ink-wash mountains along the bottom of the window, behind all content. */
export function Backdrop() {
  return (
    <div className={styles.backdrop} aria-hidden="true">
      <Landscape variant="backdrop" seed="backdrop" className={styles.hills} />
    </div>
  );
}
