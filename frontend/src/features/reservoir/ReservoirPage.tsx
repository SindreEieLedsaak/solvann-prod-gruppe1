import {
  Alert,
  Card,
  CardBlock,
  Heading,
  Paragraph,
  Spinner,
} from '@digdir/designsystemet-react';
import { usePolling } from '../../hooks/usePolling';
import { plantService } from '../../services/plantService';
import styles from '../dashboard/DashboardPage.module.css';

export function ReservoirPage() {
  const { data, loading, error } = usePolling(() => plantService.getReservoir(), 5000);

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Heading level={1} data-size="lg">
          Magasin
        </Heading>
      </div>

      {error && <Alert data-color="danger"><Paragraph>{error}</Paragraph></Alert>}

      {loading && !data && (
        <div className={styles.spinnerCenter}><Spinner aria-label="Henter magasindata..." /></div>
      )}

      {data && (
        <div className={styles.threeCol}>
          <Card>
            <CardBlock>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Nivå</span>
                <span className={styles.statValue}>
                  {data.level_pct.toFixed(2)}
                  <span className={styles.statUnit}> %</span>
                </span>
              </div>
            </CardBlock>
          </Card>
          <Card>
            <CardBlock>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Tilsig</span>
                <span className={styles.statValue}>
                  {data.inflow_m3s.toFixed(2)}
                  <span className={styles.statUnit}> m³/s</span>
                </span>
              </div>
            </CardBlock>
          </Card>
          <Card>
            <CardBlock>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Avløp</span>
                <span className={styles.statValue}>
                  {data.outflow_m3s.toFixed(2)}
                  <span className={styles.statUnit}> m³/s</span>
                </span>
              </div>
            </CardBlock>
          </Card>
        </div>
      )}
    </div>
  );
}
