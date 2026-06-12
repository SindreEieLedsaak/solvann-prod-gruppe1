import {
  Alert,
  Tag,
  Card,
  CardBlock,
  Heading,
  Paragraph,
  Spinner,
} from '@digdir/designsystemet-react';
import { usePolling } from '../../hooks/usePolling';
import { plantService } from '../../services/plantService';
import styles from '../dashboard/DashboardPage.module.css';

function marketTagColor(status: string): 'warning' | 'info' | 'success' {
  if (status === 'PEAK') return 'warning';
  if (status === 'LOW') return 'info';
  return 'success';
}

export function MarketPage() {
  const { data, loading, error } = usePolling(() => plantService.getMarket(), 5000);

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Heading level={1} data-size="lg">
          Marked
        </Heading>
      </div>

      {error && <Alert data-color="danger"><Paragraph>{error}</Paragraph></Alert>}

      {loading && !data && (
        <div className={styles.spinnerCenter}><Spinner aria-label="Henter markedsdata..." /></div>
      )}

      {data && (
        <div className={styles.twoCol}>
          <Card>
            <CardBlock>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Spotpris NO5</span>
                <span className={styles.statValue}>
                  {data.price_nok_mwh.toFixed(2)}
                  <span className={styles.statUnit}> NOK/MWh</span>
                </span>
              </div>
            </CardBlock>
          </Card>
          <Card>
            <CardBlock>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Markedsstatus</span>
                <div style={{ marginTop: 'var(--ds-spacing-1)' }}>
                  <Tag data-color={marketTagColor(data.status)}>{data.status}</Tag>
                </div>
                <Paragraph
                  data-size="sm"
                  style={{ color: 'var(--ds-color-neutral-text-subtle)', marginTop: 'var(--ds-spacing-2)' }}
                >
                  {data.timestamp}
                </Paragraph>
              </div>
            </CardBlock>
          </Card>
        </div>
      )}
    </div>
  );
}
