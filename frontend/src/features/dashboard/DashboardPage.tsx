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
    PUMPING: 'info',
  };
  return map[s] ?? 'neutral';
}

function turbineStatusLabel(s: TurbineStatus): string {
  const map: Record<TurbineStatus, string> = {
    RUNNING: 'Aktiv',
    STANDBY: 'Standby',
    MAINTENANCE: 'Vedlikehold',
    OFFLINE: 'Offline',
    PUMPING: 'Pumper',
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
        {t.status === 'RUNNING' || t.status === 'PUMPING' ? fmt(t.production_mw) + ' MW' : '—'}
      </Table.Cell>
      <Table.Cell>
        {t.status === 'RUNNING' || t.status === 'PUMPING' ? fmt(t.load_pct, 0) + ' %' : '—'}
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
  const { data: history } = usePolling(() => plantService.getHistory(24), 30000);
  const { data: hourly } = usePolling(() => plantService.getHourlyHistory(24), 30000);

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
      {/* ── Top bar ── */}
      <div className={styles.topBar}>
        <Heading level={1} data-size="lg">
          Dashboard
        </Heading>
        <Paragraph data-size="sm" className={styles.timestamp}>
          {dateStr} {timeStr} · Sist oppdatert: {updatedStr}
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
          {/* ── Plant status KPIs ── */}
          <div>
            <Heading level={2} data-size="sm" style={{ marginBottom: 'var(--ds-spacing-3)' }}>
              Anleggsstatus
            </Heading>
            <div className={styles.statsGrid}>
              <StatCard label="Totalproduksjon" value={fmt(ps.total_production_mw)} unit="MW" />
              <StatCard label="Inntekt (est.)" value={fmtNok(ps.revenue_nok_h)} unit="NOK/t" />
              <StatCard
                label="Miljøkostnad"
                value={fmtNok(ps.environmental_cost_nok_h)}
                unit="NOK/t"
              />
              <StatCard label="Vanninntak" value={fmt(ps.water_inflow_m3s)} unit="m³/s" />
              <StatCard label="Magasinnivå" value={fmt(ps.reservoir_level_pct)} unit="%" />
              <StatCard
                label="Aktive turbiner"
                value={`${ps.active_turbines} / ${ps.total_turbines}`}
              />
              <StatCard label="Spotpris" value={fmt(mkt.price_nok_mwh, 2)} unit="NOK/MWh" />
            </div>
          </div>

          {/* ── Turbine table ── */}
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
                    <Table.HeaderCell>Last</Table.HeaderCell>
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

          {/* ── Bottom row ── */}
          <div className={styles.threeCol}>
            {/* Reservoir */}
            <Card>
              <CardBlock>
                <Heading level={2} data-size="sm" style={{ marginBottom: 'var(--ds-spacing-3)' }}>
                  Magasin
                </Heading>
                <div className={styles.statCard} style={{ gap: 'var(--ds-spacing-2)' }}>
                  <div>
                    <span className={styles.statLabel}>Nivå</span>
                    <div className={styles.statValue}>
                      {fmt(res.level_pct, 2)}{' '}
                      <span className={styles.statUnit}>%</span>
                    </div>
                  </div>
                  <div>
                    <span className={styles.statLabel}>Tilsig</span>
                    <div className={styles.statValue}>
                      {fmt(res.inflow_m3s, 2)}{' '}
                      <span className={styles.statUnit}>m³/s</span>
                    </div>
                  </div>
                  <div>
                    <span className={styles.statLabel}>Avløp</span>
                    <div className={styles.statValue}>
                      {fmt(res.outflow_m3s, 2)}{' '}
                      <span className={styles.statUnit}>m³/s</span>
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

          {/* ── History / aggregated income ── */}
          <Card>
            <CardBlock>
              <Heading level={2} data-size="sm" style={{ marginBottom: 'var(--ds-spacing-3)' }}>
                Historikk (siste 24 t)
              </Heading>
              {history && history.sample_count > 0 ? (
                <div className={styles.statsGrid}>
                  <StatCard
                    label="Energi produsert"
                    value={fmt(history.summary.total_energy_mwh, 1)}
                    unit="MWh"
                  />
                  <StatCard
                    label="Inntekt"
                    value={fmtNok(history.summary.total_revenue_nok)}
                    unit="NOK"
                  />
                  <StatCard
                    label="Miljøkostnad"
                    value={fmtNok(history.summary.total_environmental_cost_nok)}
                    unit="NOK"
                  />
                </div>
              ) : (
                <Paragraph data-size="sm" className={styles.timestamp}>
                  Ingen historiske data tilgjengelig ennå.
                </Paragraph>
              )}
            </CardBlock>
          </Card>

          {/* ── Hourly production log — for manual/spreadsheet reading ── */}
          <Card>
            <CardBlock>
              <Heading level={2} data-size="sm" style={{ marginBottom: 'var(--ds-spacing-3)' }}>
                Produksjon per time (siste 24 t)
              </Heading>
              {hourly && hourly.hour_count > 0 ? (
                <Table>
                  <Table.Head>
                    <Table.Row>
                      <Table.HeaderCell>Time</Table.HeaderCell>
                      <Table.HeaderCell>Snittproduksjon</Table.HeaderCell>
                      <Table.HeaderCell>Energi</Table.HeaderCell>
                      <Table.HeaderCell>Inntekt</Table.HeaderCell>
                      <Table.HeaderCell>Miljøkostnad</Table.HeaderCell>
                      <Table.HeaderCell>Magasinnivå</Table.HeaderCell>
                      <Table.HeaderCell>Målinger</Table.HeaderCell>
                    </Table.Row>
                  </Table.Head>
                  <Table.Body>
                    {hourly.points.map((p) => (
                      <Table.Row key={p.hour}>
                        <Table.Cell>
                          {new Date(p.hour).toLocaleString('nb-NO', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Table.Cell>
                        <Table.Cell>{fmt(p.avg_production_mw)} MW</Table.Cell>
                        <Table.Cell>{fmt(p.energy_mwh)} MWh</Table.Cell>
                        <Table.Cell>{fmtNok(p.revenue_nok)} NOK</Table.Cell>
                        <Table.Cell>{fmtNok(p.environmental_cost_nok)} NOK</Table.Cell>
                        <Table.Cell>{fmt(p.avg_reservoir_level_pct)} %</Table.Cell>
                        <Table.Cell>
                          {p.sample_count < 55 ? (
                            <Tag data-color="warning">{p.sample_count} (ufullstendig)</Tag>
                          ) : (
                            p.sample_count
                          )}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              ) : (
                <Paragraph data-size="sm" className={styles.timestamp}>
                  Ingen historiske data tilgjengelig ennå.
                </Paragraph>
              )}
            </CardBlock>
          </Card>
        </>
      )}
    </div>
  );
}
