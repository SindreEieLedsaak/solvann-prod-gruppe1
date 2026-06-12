import { Outlet } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { PageFooter } from '../components/ui/PageFooter';
import { ErrorBoundary } from '../components/ErrorBoundary';
import styles from './AppLayout.module.css';

export function AppLayout() {
  return (
    <div className={styles.layout}>
      <PageHeader />
      <main className={styles.main}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <PageFooter />
    </div>
  );
}
