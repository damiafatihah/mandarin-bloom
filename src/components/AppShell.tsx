import { NavLink, Outlet } from 'react-router';
import { Backdrop } from './Backdrop';
import { Landscape } from './art/Scenery';
import styles from './AppShell.module.css';

const TABS = [
  { to: '/', label: 'Today', zh: '今日', han: '今', end: true },
  { to: '/challenge', label: 'Challenge', zh: '挑战', han: '战' },
  { to: '/practice', label: 'Practice', zh: '练习', han: '练' },
  { to: '/dictionary', label: 'Dictionary', zh: '词典', han: '典' },
  { to: '/me', label: 'Me', zh: '我的', han: '我' },
];

export function AppShell() {
  return (
    <div className={styles.shell}>
      <Backdrop />
      <nav className={styles.nav} aria-label="Main">
        <NavLink to="/" end className={styles.brand}>
          <span className={styles.brandMark} lang="zh">学海</span>
          <span className={styles.brandSub}>Xuéhǎi · sea of learning</span>
        </NavLink>
        <div className={styles.tabs}>
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end} className={styles.tab}>
              <span className={styles.tabHan} lang="zh" aria-hidden="true">{t.han}</span>
              <span className={styles.tabLabel}>{t.label}</span>
              <span className={styles.tabZh} lang="zh" aria-hidden="true">{t.zh}</span>
            </NavLink>
          ))}
        </div>
        <div className={styles.railArt} aria-hidden="true">
          <p className={styles.motto} lang="zh">学海无涯</p>
          <Landscape variant="card" seed="rail" pagoda className={styles.railHills} />
        </div>
      </nav>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
