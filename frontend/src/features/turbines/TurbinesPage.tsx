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
import type { Turbine, TurbineStatus } from '../../types/plant';
import styles from '../dashboard/DashboardPage.module.css';

const MIN_LOAD_PCT = 40;

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

function fmt(n: number, decimals = 1) {
  return n.toFixed(decimals);
}

function isProducing(t: Turbine) {
  return t.status === 'RUNNING' || t.status === 'PUMPING';
}

interface TurbineSummary {
  totalProduction: number;
  totalCapacity: number;
  capacityPct: number;
  activeCount: number;
  totalCount: number;
  pumpingCount: number;
  maintenanceCount: number;
  lowestActiveLoad: number | null;
  avgRuntime: number;
  oldestUnit: string;
}

function summarize(turbines: Turbine[]): TurbineSummary {
  const totalProduction = turbines.reduce((sum, t) => sum + (isProducing(t) ? t.production_mw : 0), 0);
  const totalCapacity = turbines.reduce((sum, t) => sum + t.capacity_mw, 0);
  const activeTurbines = turbines.filter(isProducing);
  const activeLoads = activeTurbines.map((t) => t.load_pct);
  const oldest = turbines.reduce((max, t) => (t.runtime_h > max.runtime_h ? t : max), turbines[0]);

  return {
    totalProduction,
    totalCapacity,
    capacityPct: totalCapacity > 0 ? (totalProduction / totalCapacity) * 100 : 0,
    activeCount: activeTurbines.length,
    totalCount: turbines.length,
    pumpingCount: turbines.filter((t) => t.status === 'PUMPING').length,
    maintenanceCount: turbines.filter((t) => t.status === 'MAINTENANCE').length,
    lowestActiveLoad: activeLoads.length > 0 ? Math.min(...activeLoads) : null,
    avgRuntime: turbines.reduce((sum, t) => sum + t.runtime_h, 0) / turbines.length,
    oldestUnit: oldest.id,
  };
}

export function TurbinesPage() {
  const { data, loading, error, lastUpdated } = usePolling(() => plantService.getTurbines(), 5000);
  const summary = data && data.length > 0 ? summarize(data) : null;
  const updatedStr = lastUpdated ? lastUpdated.toLocaleTimeString('nb-NO', { hour12: false }) : '—';

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div>
          <Heading level={1} data-size="lg">
            Turbiner
          </Heading>
          {summary && (
            <Paragraph data-size="sm" className={styles.timestamp}>
              {summary.totalCount} reverserbare vannturbiner &middot; {fmt(summary.totalCapacity, 0)} MW installert
              kapasitet
            </Paragraph>
          )}
        </div>
        <Paragraph data-size="sm" className={styles.timestamp}>
          Sist oppdatert {updatedStr}
        </Paragraph>
      </div>

      {error && (
        <Alert data-color="danger">
          <Paragraph>{error}</Paragraph>
        </Alert>
      )}

      {loading && !data && (
        <div className={styles.spinnerCenter}>
          <Spinner aria-label="Henter turbindata..." />
        </div>
      )}

      {summary && (
        <div className={styles.statsGrid}>
          <Card>
            <CardBlock>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Totalproduksjon</span>
                <span className={styles.statValue}>
                  {fmt(summary.totalProduction)} <span className={styles.statUnit}>MW</span>
                </span>
                <span className={styles.statUnit}>{fmt(summary.capacityPct, 0)} % av kapasitet</span>
              </div>
            </CardBlock>
          </Card>
          <Card>
            <CardBlock>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Aktive turbiner</span>
                <span className={styles.statValue}>
                  {summary.activeCount} <span className={styles.statUnit}>/ {summary.totalCount}</span>
                </span>
                <span className={styles.statUnit}>
                  {summary.pumpingCount} pumper &middot; {summary.maintenanceCount} vedlikehold
                </span>
              </div>
            </CardBlock>
          </Card>
          <Card>
            <CardBlock>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Laveste last</span>
                <span className={styles.statValue}>
                  {summary.lowestActiveLoad !== null ? fmt(summary.lowestActiveLoad, 0) : '—'}{' '}
                  <span className={styles.statUnit}>%</span>
                </span>
                <span className={styles.statUnit}>
                  {summary.lowestActiveLoad !== null
                    ? summary.lowestActiveLoad >= MIN_LOAD_PCT
                      ? `Over grensen på ${MIN_LOAD_PCT} %`
                      : `Under grensen på ${MIN_LOAD_PCT} %`
                    : 'Ingen aktive turbiner'}
                </span>
              </div>
            </CardBlock>
          </Card>
          <Card>
            <CardBlock>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Driftstid i snitt</span>
                <span className={styles.statValue}>
                  {Math.round(summary.avgRuntime).toLocaleString('nb-NO')}{' '}
                  <span className={styles.statUnit}>t</span>
                </span>
                <span className={styles.statUnit}>Eldste enhet: {summary.oldestUnit}</span>
              </div>
            </CardBlock>
          </Card>
        </div>
      )}

      {data && (
        <Card>
          <CardBlock>
            <Heading level={2} data-size="sm" style={{ marginBottom: 'var(--ds-size-3)' }}>
              Turbinstatus
            </Heading>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>ID</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Produksjon</Table.HeaderCell>
                  <Table.HeaderCell>Last</Table.HeaderCell>
                  <Table.HeaderCell>Kapasitet</Table.HeaderCell>
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
                    <Table.Cell>{isProducing(t) ? `${fmt(t.production_mw)} MW` : '—'}</Table.Cell>
                    <Table.Cell>{isProducing(t) ? `${fmt(t.load_pct, 0)} %` : '—'}</Table.Cell>
                    <Table.Cell>{fmt(t.capacity_mw, 0)} MW</Table.Cell>
                    <Table.Cell>{t.pump_mode ? 'Ja' : 'Nei'}</Table.Cell>
                    <Table.Cell>{fmt(t.runtime_h, 0)} t</Table.Cell>
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
