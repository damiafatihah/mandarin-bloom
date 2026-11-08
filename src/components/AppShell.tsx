import { NavLink, Outlet } from 'react-router';
import styles from './AppShell.module.css';

const TABS = [
  { to: '/', label: 'Today', han: '今', end: true },
  { to: '/challenge', label: 'Challenge', han: '战' },
  { to: '/practice', label: 'Practice', han: '练' },
  { to: '/dictionary', label: 'Dictionary', han: '典' },
  { to: '/me', label: 'Me', han: '我' },
];

export function AppShell() {
  return (
    <div className={styles.shell}>
      <nav className={styles.nav} aria-label="Main">
        <NavLink to="/" end className={styles.brand} aria-label="学海 Xuéhǎi home">
          <span lang="zh">学海</span>
        </NavLink>
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={styles.tab}>
            <span className={styles.tabHan} lang="zh" aria-hidden="true">{t.han}</span>
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
