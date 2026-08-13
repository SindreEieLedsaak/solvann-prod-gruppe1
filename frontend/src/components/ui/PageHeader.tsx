
import type { ComponentType } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heading } from '@digdir/designsystemet-react';
import {
  BarsIcon,
  DeviceIcon,
  FormIcon,
  PriceIcon,
  ReportIcon,
  TurbineIcon,
} from './NavIcons';
import styles from './PageHeader.module.css';

interface NavItem {
  readonly path: string;
  readonly label: string;
  readonly icon?: ComponentType<{ active?: boolean }>;
}

const navItems: readonly NavItem[] = [
//  { path: '/dashboard', label: 'Dashboard' },
  { path: '/damagochi', label: 'Damagochi', icon: DeviceIcon },
  { path: '/turbines', label: 'Turbiner', icon: TurbineIcon },
  { path: '/registrering', label: 'Registrering', icon: FormIcon },
  { path: '/turbinvurdering', label: 'Turbinvurdering', icon: BarsIcon },
  { path: '/prisoptimering', label: 'Prisoptimering', icon: PriceIcon },
  { path: '/rapport', label: 'Rapport', icon: ReportIcon },
 // { path: '/reservoir', label: 'Magasin' },
 // { path: '/market', label: 'Marked' },
 // { path: '/settings', label: 'Innstillinger' },
];

export function PageHeader() {
  const location = useLocation();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Heading data-size="sm" level={1} className={styles.logo}>
            Solvann
        </Heading>
        <nav aria-label="Main navigation">
          <ul className={styles.navList}>
            {navItems.map(({ path, label, icon: Icon }) => {
              const active = location.pathname.startsWith(path);
              return (
                <li key={path}>
                  <Link
                    to={path}
                    className={[styles.navLink, active ? styles.active : '']
                      .filter(Boolean)
                      .join(' ')}
                    data-size="sm"
                    aria-current={active ? 'page' : undefined}
                  >
                    {Icon && <Icon active={active} />}
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
