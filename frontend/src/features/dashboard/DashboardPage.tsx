import { useEffect, useState } from 'react';
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
import { usePolling } from '../../hooks/usePolling';
import { plantService } from '../../services/plantService';
import type { Turbine, TurbineStatus } from '../../types/plant';
import styles from './DashboardPage.module.css';

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 1) {
  return n.toFixed(decimals);
}

function fmtNok(n: number) {
  return new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(n);
}

type TagColor = 'success' | 'warning' | 'neutral' | 'danger' | 'info';

function turbineStatusColor(s: TurbineStatus): TagColor {
  const map: Record<TurbineStatus, TagColor> = {
    RUNNING: 'success',
    STANDBY: 'warning',
    MAINTENANCE: 'neutral',
    OFFLINE: 'danger',
  };
  return map[s] ?? 'neutral';
}

function turbineStatusLabel(s: TurbineStatus): string {
  const map: Record<TurbineStatus, string> = {
    RUNNING: 'Aktiv',
    STANDBY: 'Standby',
    MAINTENANCE: 'Vedlikehold',
    OFFLINE: 'Offline',
  };
  return map[s] ?? s;
}

function marketTagColor(status: string): TagColor {
  if (status === 'PEAK') return 'warning';
  if (status === 'LOW') return 'info';
  return 'success';
}

// ── StatCard ──────────────────────────────────────────────────────────────────

interface StatCardProps {
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
}

function StatCard({ label, value, unit }: StatCardProps) {
  return (
    <Card>
      <CardBlock>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>{label}</span>
          <span className={styles.statValue}>
            {value}
            {unit && <span className={styles.statUnit}> {unit}</span>}
          </span>
        </div>
      </CardBlock>
    </Card>
  );
}

// ── TurbineRow ────────────────────────────────────────────────────────────────

interface TurbineRowProps {
  readonly t: Turbine;
}

function TurbineRow({ t }: TurbineRowProps) {
  return (
    <Table.Row>
      <Table.Cell>{t.id}</Table.Cell>
      <Table.Cell>
        <Tag data-color={turbineStatusColor(t.status)}>{turbineStatusLabel(t.status)}</Tag>
      </Table.Cell>
      <Table.Cell>
        {t.status === 'RUNNING' ? fmt(t.production_mw) + ' MW' : '\u2014'}
      </Table.Cell>
      <Table.Cell>{t.pump_mode ? 'Ja' : 'Nei'}</Table.Cell>
      <Table.Cell>{fmt(t.runtime_h, 0)} t</Table.Cell>
      <Table.Cell>{fmt(t.capacity_mw, 0)} MW</Table.Cell>
    </Table.Row>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { data, loading, error, lastUpdated } = usePolling(
    () => plantService.getOverview(),
    5000
  );

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = now.toLocaleTimeString('nb-NO', { hour12: false });
  const dateStr = now.toLocaleDateString('nb-NO');
  const updatedStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('nb-NO', { hour12: false })
    : '\u2014';

  const ps = data?.plant_status;
  const res = data?.reservoir;
  const mkt = data?.market;
  const sol = data?.solar;

  return (
    <div className={styles.page}>
      {/* \u2500\u2500 Top bar \u2500\u2500 */}
      <div className={styles.topBar}>
        <Heading level={1} data-size="lg">
          Dashboard
        </Heading>
        <Paragraph data-size="sm" className={styles.timestamp}>
          {dateStr} {timeStr} \u00b7 Sist oppdatert: {updatedStr}
        </Paragraph>
      </div>

      {error && (
        <Alert data-color="danger">
          <Paragraph>Datafeil: {error}</Paragraph>
        </Alert>
      )}

      {loading && !data && (
        <div className={styles.spinnerCenter}>
          <Spinner aria-label="Henter data..." />
        </div>
      )}

      {data && ps && res && mkt && sol && (
        <>
          {/* \u2500\u2500 Plant status KPIs \u2500\u2500 */}
          <div>
            <Heading level={2} data-size="sm" style={{ marginBottom: 'var(--ds-spacing-3)' }}>
              Anleggsstatus
            </Heading>
            <div className={styles.statsGrid}>
              <StatCard label="Totalproduksjon" value={fmt(ps.total_production_mw)} unit="MW" />
              <StatCard label="Inntekt (est.)" value={fmtNok(ps.revenue_nok_h)} unit="NOK/t" />
              <StatCard
                label="Milj\u00f8kostnad"
                value={fmtNok(ps.environmental_cost_nok_h)}
                unit="NOK/t"
              />
              <StatCard label="Vanninntak" value={fmt(ps.water_inflow_m3s)} unit="m\u00b3/s" />
              <StatCard label="Magasinniv\u00e5" value={fmt(ps.reservoir_level_pct)} unit="%" />
              <StatCard
                label="Aktive turbiner"
                value={`${ps.active_turbines} / ${ps.total_turbines}`}
              />
              <StatCard label="Spotpris" value={fmt(mkt.price_nok_mwh, 2)} unit="NOK/MWh" />
            </div>
          </div>

          {/* \u2500\u2500 Turbine table \u2500\u2500 */}
          <Card>
            <CardBlock>
              <Heading level={2} data-size="sm" style={{ marginBottom: 'var(--ds-spacing-3)' }}>
                Turbinstatus
              </Heading>
              <Table>
                <Table.Head>
                  <Table.Row>
                    <Table.HeaderCell>ID</Table.HeaderCell>
                    <Table.HeaderCell>Status</Table.HeaderCell>
                    <Table.HeaderCell>Produksjon</Table.HeaderCell>
                    <Table.HeaderCell>Pumpemodus</Table.HeaderCell>
                    <Table.HeaderCell>Driftstid</Table.HeaderCell>
                    <Table.HeaderCell>Kapasitet</Table.HeaderCell>
                  </Table.Row>
                </Table.Head>
                <Table.Body>
                  {data.turbines.map((t) => (
                    <TurbineRow key={t.id} t={t} />
                  ))}
                </Table.Body>
              </Table>
            </CardBlock>
          </Card>

          {/* \u2500\u2500 Bottom row \u2500\u2500 */}
          <div className={styles.threeCol}>
            {/* Reservoir */}
            <Card>
              <CardBlock>
                <Heading level={2} data-size="sm" style={{ marginBottom: 'var(--ds-spacing-3)' }}>
                  Magasin
                </Heading>
                <div className={styles.statCard} style={{ gap: 'var(--ds-spacing-2)' }}>
                  <div>
                    <span className={styles.statLabel}>Niv\u00e5</span>
                    <div className={styles.statValue}>
                      {fmt(res.level_pct, 2)}{' '}
                      <span className={styles.statUnit}>%</span>
                    </div>
                  </div>
                  <div>
                    <span className={styles.statLabel}>Tilsig</span>
                    <div className={styles.statValue}>
                      {fmt(res.inflow_m3s, 2)}{' '}
                      <span className={styles.statUnit}>m\u00b3/s</span>
                    </div>
                  </div>
                  <div>
                    <span className={styles.statLabel}>Avl\u00f8p</span>
                    <div className={styles.statValue}>
                      {fmt(res.outflow_m3s, 2)}{' '}
                      <span className={styles.statUnit}>m\u00b3/s</span>
                    </div>
                  </div>
                </div>
              </CardBlock>
            </Card>

            {/* Market */}
            <Card>
              <CardBlock>
                <Heading level={2} data-size="sm" style={{ marginBottom: 'var(--ds-spacing-3)' }}>
                  Marked
                </Heading>
                <div className={styles.statCard} style={{ gap: 'var(--ds-spacing-2)' }}>
                  <div>
                    <span className={styles.statLabel}>Spotpris NO5</span>
                    <div className={styles.statValue}>
                      {fmt(mkt.price_nok_mwh, 2)}{' '}
                      <span className={styles.statUnit}>NOK/MWh</span>
                    </div>
                  </div>
                  <div>
                    <span className={styles.statLabel}>Markedsstatus</span>
                    <div style={{ marginTop: 'var(--ds-spacing-1)' }}>
                      <Tag data-color={marketTagColor(mkt.status)}>{mkt.status}</Tag>
                    </div>
                  </div>
                </div>
              </CardBlock>
            </Card>

            {/* Solar */}
            <Card>
              <CardBlock>
                <Heading level={2} data-size="sm" style={{ marginBottom: 'var(--ds-spacing-3)' }}>
                  Solenergi
                </Heading>
                <div className={styles.statCard} style={{ gap: 'var(--ds-spacing-2)' }}>
                  <div>
                    <span className={styles.statLabel}>Produksjon</span>
                    <div className={styles.statValue}>
                      {fmt(sol.production_kw, 1)}{' '}
                      <span className={styles.statUnit}>kW</span>
                    </div>
                  </div>
                  <div>
                    <span className={styles.statLabel}>Antall paneler</span>
                    <div className={styles.statValue}>
                      {sol.panel_count.toLocaleString('nb-NO')}
                    </div>
                  </div>
                  <div>
                    <span className={styles.statLabel}>Virkningsgrad</span>
                    <div className={styles.statValue}>
                      {fmt(sol.efficiency_pct, 2)}{' '}
                      <span className={styles.statUnit}>%</span>
                    </div>
                  </div>
                </div>
              </CardBlock>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
