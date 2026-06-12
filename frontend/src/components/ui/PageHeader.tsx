import { Link, useLocation } from 'react-router-dom';
import { Heading } from '@digdir/designsystemet-react';
import styles from './PageHeader.module.css';

const navItems = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/turbines', label: 'Turbiner' },
  { path: '/reservoir', label: 'Magasin' },
  { path: '/market', label: 'Marked' },
  { path: '/settings', label: 'Innstillinger' },
];

export function PageHeader() {
  const location = useLocation();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Heading data-size="sm" level={1} className={styles.logo}>
          <Link to="/" className={styles.logoLink}>
            Solvann
          </Link>
        </Heading>
        <nav aria-label="Main navigation">
          <ul className={styles.navList}>
            {navItems.map(({ path, label }) => (
              <li key={path}>
                <Link
                  to={path}
                  className={[
                    styles.navLink,
                    location.pathname.startsWith(path) ? styles.active : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  data-size="sm"
                  aria-current={location.pathname.startsWith(path) ? 'page' : undefined}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
