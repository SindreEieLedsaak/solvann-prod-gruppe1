import { Paragraph } from '@digdir/designsystemet-react';
import styles from './PageFooter.module.css';

export function PageFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <Paragraph data-size="sm">&copy; {new Date().getFullYear()} Solvann. All rights reserved.</Paragraph>
      </div>
    </footer>
  );
}
