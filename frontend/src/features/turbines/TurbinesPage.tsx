import {
  Alert,
  Tag,
  Card,
  CardBlock,
  Heading,
  Paragraph,
  Spinner,
  Table,
} from '@digdir/designsystemet-react';
import { Link } from 'react-router-dom';
import { usePolling } from '../../hooks/usePolling';
import { plantService } from '../../services/plantService';
import type { TurbineStatus } from '../../types/plant';
import styles from '../dashboard/DashboardPage.module.css';

type TagColor = 'success' | 'warning' | 'neutral' | 'danger' | 'info';

function statusColor(s: TurbineStatus): TagColor {
  const map: Record<TurbineStatus, TagColor> = {
    RUNNING: 'success',
    STANDBY: 'warning',
    MAINTENANCE: 'neutral',
    OFFLINE: 'danger',
    PUMPING: 'info',
  };
  return map[s] ?? 'neutral';
}

function statusLabel(s: TurbineStatus) {
  const map: Record<TurbineStatus, string> = {
    RUNNING: 'Aktiv',
    STANDBY: 'Standby',
    MAINTENANCE: 'Vedlikehold',
    OFFLINE: 'Offline',
    PUMPING: 'Pumper',
  };
  return map[s] ?? s;
}

export function TurbinesPage() {
  const { data, loading, error } = usePolling(() => plantService.getTurbines(), 5000);

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Heading level={1} data-size="lg">
          Turbiner
        </Heading>
      </div>

      {error && <Alert data-color="danger"><Paragraph>{error}</Paragraph></Alert>}

      {loading && !data && (
        <div className={styles.spinnerCenter}><Spinner aria-label="Henter turbindata..." /></div>
      )}

      {data && (
        <Card>
          <CardBlock>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>ID</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Produksjon</Table.HeaderCell>
                  <Table.HeaderCell>Kapasitet</Table.HeaderCell>
                  <Table.HeaderCell>Utnyttelse</Table.HeaderCell>
                  <Table.HeaderCell>Pumpemodus</Table.HeaderCell>
                  <Table.HeaderCell>Driftstid</Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {data.map((t) => (
                  <Table.Row key={t.id}>
                    <Table.Cell>
                      <Link to={`/turbines/${t.id}`}>{t.id}</Link>
                    </Table.Cell>
                    <Table.Cell>
                      <Tag data-color={statusColor(t.status)}>{statusLabel(t.status)}</Tag>
                    </Table.Cell>
                    <Table.Cell>
                      {t.status === 'RUNNING' || t.status === 'PUMPING'
                        ? `${t.production_mw.toFixed(2)} MW`
                        : '—'}
                    </Table.Cell>
                    <Table.Cell>{t.capacity_mw.toFixed(0)} MW</Table.Cell>
                    <Table.Cell>
                      {t.status === 'RUNNING' || t.status === 'PUMPING'
                        ? `${((t.production_mw / t.capacity_mw) * 100).toFixed(1)} %`
                        : '—'}
                    </Table.Cell>
                    <Table.Cell>{t.pump_mode ? 'Ja' : 'Nei'}</Table.Cell>
                    <Table.Cell>{t.runtime_h.toFixed(0)} t</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </CardBlock>
        </Card>
      )}
    </div>
  );
}
