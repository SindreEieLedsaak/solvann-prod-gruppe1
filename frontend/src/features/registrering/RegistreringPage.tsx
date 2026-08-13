import { useEffect, useState } from 'react';
import { Card, CardBlock, Heading, Paragraph, Spinner } from '@digdir/designsystemet-react';
import dashStyles from '../dashboard/DashboardPage.module.css';
import { usePolling } from '../../hooks/usePolling';
import { plantService } from '../../services/plantService';

type TurbineValue = number | 'STANDBY';

type KeyDataLog = {
  producedAt: string;
  reservoirLevelPct: number;
  outflowM3s: number;
  spotPriceNokMwh: number;
  turbines: Record<string, TurbineValue>;
  solarKw: number;
  environmentalCostNok: number;
  totalProductionMw: number;
  revenueNokH: number;
};

const turbineColumns = ['T-01', 'T-02', 'T-03', 'T-04', 'T-05'];

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatNumber(value: number, digits = 1) {
  return Number(value).toLocaleString('nb-NO', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function asTurbineMap(data: { turbines: { id: string; status: string; production_mw: number }[] } | null) {
  const map: Record<string, TurbineValue> = {};
  if (!data) return map;

  for (const turbine of data.turbines) {
    map[turbine.id] = turbine.status === 'STANDBY' ? 'STANDBY' : turbine.production_mw;
  }

  return map;
}

function turbineCell(value: TurbineValue) {
  if (value === 'STANDBY') return 'STANDBY';
  return formatNumber(value, 1);
}

export function RegistreringPage() {
  const { data, loading, error } = usePolling(() => plantService.getOverview(), 5000);
  const { data: hourly } = usePolling(() => plantService.getHourlyHistory(24), 30000);
  const [logs, setLogs] = useState<KeyDataLog[]>([]);

  useEffect(() => {
    if (!data) return;

    const snapshot: KeyDataLog = {
      producedAt: data.timestamp,
      reservoirLevelPct: data.plant_status.reservoir_level_pct,
      outflowM3s: data.reservoir.outflow_m3s,
      spotPriceNokMwh: data.market.price_nok_mwh,
      turbines: asTurbineMap(data),
      solarKw: data.solar.production_kw,
      environmentalCostNok: data.plant_status.environmental_cost_nok_h,
      totalProductionMw: data.plant_status.total_production_mw,
      revenueNokH: data.plant_status.revenue_nok_h,
    };

    console.log('[Logger]', snapshot);
    setLogs((prev) => [snapshot, ...prev].slice(0, 10));
  }, [data]);

  const hourlyAverage = hourly?.points.at(-1);

  return (
    <div className={dashStyles.page}>
      <div className={dashStyles.topBar}>
        <div>
          <Heading level={1} data-size="lg">
            Registrering
          </Heading>
          <Paragraph data-size="sm" className={dashStyles.timestamp}>
            Logg over produserte nøkkeltall
          </Paragraph>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '1rem' }}>
          <Card>
            <CardBlock>
              <Paragraph data-color="danger">Datafeil: {error}</Paragraph>
            </CardBlock>
          </Card>
        </div>
      )}

      {loading && !data && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
          <Spinner aria-label="Henter data..." />
        </div>
      )}

      <Card style={{ marginBottom: '1rem' }}>
        <CardBlock>
          <Heading level={2} data-size="sm" style={{ marginBottom: '0.75rem' }}>
            Tidsgjennomsnitt
          </Heading>

          {hourlyAverage ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                gap: '0.5rem',
                fontSize: '0.8rem',
              }}
            >
              <SummaryCell label="Tid" value={hourlyAverage.hour.slice(11, 16)} />
              <SummaryCell label="Magasin" value={`${formatNumber(hourlyAverage.avg_reservoir_level_pct, 2)} %`} />
              <SummaryCell label="Avløp" value={`${formatNumber(hourlyAverage.energy_mwh, 2)} MWh`} />
              <SummaryCell label="Spot" value={`${formatNumber(hourlyAverage.avg_price_nok_mwh, 2)} NOK`} />
              <SummaryCell label="T-01" value={formatNumber(hourlyAverage.avg_production_mw, 2)} />
              <SummaryCell label="T-02" value={formatNumber(hourlyAverage.avg_production_mw, 2)} />
              <SummaryCell label="T-03" value={formatNumber(hourlyAverage.avg_production_mw, 2)} />
              <SummaryCell label="T-04" value="0" />
              <SummaryCell label="T-05" value={formatNumber(hourlyAverage.avg_production_mw, 2)} />
              <SummaryCell label="Sol" value={`${formatNumber(hourlyAverage.energy_mwh, 2)} kW`} />
              <SummaryCell label="Miljø" value={`${formatNumber(hourlyAverage.environmental_cost_nok, 0)} NOK`} />
              <SummaryCell label="Prod." value={`${formatNumber(hourlyAverage.avg_production_mw, 2)} MW`} />
            </div>
          ) : (
            <Paragraph>Ingen tidsgjennomsnitt tilgjengelig ennå.</Paragraph>
          )}
        </CardBlock>
      </Card>

      <Card style={{ marginBottom: '1rem' }}>
        <CardBlock>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <Heading level={2} data-size="sm">
              Logg
            </Heading>
            <span style={{ fontSize: '0.8rem', color: 'var(--ds-color-neutral-text-subtle)' }}>
              {logs.length} poster
            </span>
          </div>

          {logs.length === 0 ? (
            <Paragraph>Ingen loggpostinger ennå.</Paragraph>
          ) : (
            <div style={{ maxHeight: '26rem', overflowY: 'auto', paddingRight: '0.25rem' }}>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(110px, 1.4fr) repeat(11, minmax(70px, 1fr))',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    borderBottom: '1px solid var(--ds-color-neutral-border-subtle)',
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    color: 'var(--ds-color-neutral-text-subtle)',
                  }}
                >
                  <span>Tid</span>
                  <span>Magasin</span>
                  <span>Avløp</span>
                  <span>Spot</span>
                  <span>T-01</span>
                  <span>T-02</span>
                  <span>T-03</span>
                  <span>T-04</span>
                  <span>T-05</span>
                  <span>Sol</span>
                  <span>Miljø</span>
                  <span>Prod.</span>
                </div>

                {logs.map((log) => (
                  <div
                    key={`${log.producedAt}-${log.totalProductionMw}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(110px, 1.4fr) repeat(11, minmax(70px, 1fr))',
                      gap: '0.5rem',
                      padding: '0.6rem 0.75rem',
                      border: '1px solid var(--ds-color-neutral-border-subtle)',
                      borderRadius: '0.5rem',
                      fontSize: '0.8rem',
                      background: 'var(--ds-color-neutral-surface-tinted)',
                      alignItems: 'center',
                    }}
                  >
                    <span>{formatTime(log.producedAt)}</span>
                    <span>{formatNumber(log.reservoirLevelPct, 1)} %</span>
                    <span>{formatNumber(log.outflowM3s, 2)} m³/s</span>
                    <span>{formatNumber(log.spotPriceNokMwh, 2)}</span>
                    <span>{turbineCell(log.turbines['T-01'] ?? 'STANDBY')}</span>
                    <span>{turbineCell(log.turbines['T-02'] ?? 'STANDBY')}</span>
                    <span>{turbineCell(log.turbines['T-03'] ?? 'STANDBY')}</span>
                    <span>{turbineCell(log.turbines['T-04'] ?? 'STANDBY')}</span>
                    <span>{turbineCell(log.turbines['T-05'] ?? 'STANDBY')}</span>
                    <span>{formatNumber(log.solarKw, 1)} kW</span>
                    <span>{formatNumber(log.environmentalCostNok, 0)}</span>
                    <span>{formatNumber(log.totalProductionMw, 2)} MW</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardBlock>
      </Card>
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: '0.6rem 0.7rem',
        border: '1px solid var(--ds-color-neutral-border-subtle)',
        borderRadius: '0.5rem',
        background: 'var(--ds-color-neutral-surface-tinted)',
      }}
    >
      <div style={{ fontSize: '0.68rem', color: 'var(--ds-color-neutral-text-subtle)' }}>{label}</div>
      <div style={{ fontWeight: 700, marginTop: '0.2rem' }}>{value}</div>
    </div>
  );
}
