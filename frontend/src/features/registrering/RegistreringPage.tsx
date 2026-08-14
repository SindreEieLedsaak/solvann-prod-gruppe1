import { useMemo } from 'react';
import { Card, CardBlock, Heading, Paragraph, Spinner } from '@digdir/designsystemet-react';
import dashStyles from '../dashboard/DashboardPage.module.css';
import { usePolling } from '../../hooks/usePolling';
import { plantService } from '../../services/plantService';

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatNumber(value: number, digits = 1) {
  return Number(value).toLocaleString('nb-NO', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function RegistreringPage() {
  const {
    data: history,
    loading: historyLoading,
    error: historyError,
  } = usePolling(() => plantService.getHistory(24), 1000);
  const {
    data: hourly,
    loading: hourlyLoading,
    error: hourlyError,
  } = usePolling(() => plantService.getHourlyHistory(24), 1000);

  const latestRawPoint = history?.points.at(-1);
  const latestHourlyPoint = hourly?.points.at(-1);

  const latestRawRows = useMemo(() => {
    if (!history) return [];
    return [...history.points].slice(-10).reverse();
  }, [history]);

  const latestHourlyRows = useMemo(() => {
    if (!hourly) return [];
    return [...hourly.points].slice(-8).reverse();
  }, [hourly]);

  const combinedError = historyError ?? hourlyError;
  const loading = (historyLoading && !history) || (hourlyLoading && !hourly);

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

      {combinedError && (
        <div style={{ marginBottom: '1rem' }}>
          <Card>
            <CardBlock>
              <Paragraph data-color="danger">Datafeil: {combinedError}</Paragraph>
            </CardBlock>
          </Card>
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
          <Spinner aria-label="Henter data..." />
        </div>
      )}

      <Card style={{ marginBottom: '1rem' }}>
        <CardBlock>
          <Heading level={2} data-size="sm" style={{ marginBottom: '0.75rem' }}>
            Siste historikkmåling (GET /api/plant/history)
          </Heading>

          {latestRawPoint ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                gap: '0.5rem',
                fontSize: '0.8rem',
              }}
            >
              <SummaryCell label="Tid" value={formatDateTime(latestRawPoint.timestamp)} />
              <SummaryCell label="Produksjon" value={`${formatNumber(latestRawPoint.total_production_mw, 2)} MW`} />
              <SummaryCell label="Inntekt" value={`${formatNumber(latestRawPoint.revenue_nok_h, 0)} NOK/h`} />
              <SummaryCell
                label="Miljøkost"
                value={`${formatNumber(latestRawPoint.environmental_cost_nok_h, 0)} NOK/h`}
              />
              <SummaryCell label="Spot" value={`${formatNumber(latestRawPoint.price_nok_mwh, 2)} NOK/MWh`} />
              <SummaryCell label="Magasin" value={`${formatNumber(latestRawPoint.reservoir_level_pct, 2)} %`} />
            </div>
          ) : (
            <Paragraph>Ingen historikk tilgjengelig ennå.</Paragraph>
          )}
        </CardBlock>
      </Card>

      <Card style={{ marginBottom: '1rem' }}>
        <CardBlock>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <Heading level={2} data-size="sm">
              Siste timegjennomsnitt (GET /api/plant/history/hourly)
            </Heading>
            <span style={{ fontSize: '0.8rem', color: 'var(--ds-color-neutral-text-subtle)' }}>
              {hourly?.hour_count ?? 0} timer
            </span>
          </div>

          {latestHourlyPoint ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '0.5rem',
                fontSize: '0.8rem',
                marginBottom: '0.75rem',
              }}
            >
              <SummaryCell label="Time" value={formatDateTime(latestHourlyPoint.hour)} />
              <SummaryCell label="Snitt prod." value={`${formatNumber(latestHourlyPoint.avg_production_mw, 2)} MW`} />
              <SummaryCell label="Energi" value={`${formatNumber(latestHourlyPoint.energy_mwh, 2)} MWh`} />
              <SummaryCell label="Inntekt" value={`${formatNumber(latestHourlyPoint.revenue_nok, 0)} NOK`} />
              <SummaryCell label="Miljøkost" value={`${formatNumber(latestHourlyPoint.environmental_cost_nok, 0)} NOK`} />
              <SummaryCell label="Spot snitt" value={`${formatNumber(latestHourlyPoint.avg_price_nok_mwh, 2)} NOK/MWh`} />
              <SummaryCell label="Magasin snitt" value={`${formatNumber(latestHourlyPoint.avg_reservoir_level_pct, 2)} %`} />
            </div>
          ) : (
            <Paragraph>Ingen timeaggregater tilgjengelig ennå.</Paragraph>
          )}
        </CardBlock>
      </Card>

      <Card style={{ marginBottom: '1rem' }}>
        <CardBlock>
          <Heading level={2} data-size="sm" style={{ marginBottom: '0.75rem' }}>
            Historikk (siste 10 målinger)
          </Heading>

          {latestRawRows.length === 0 ? (
            <Paragraph>Ingen historikkmålinger ennå.</Paragraph>
          ) : (
            <div style={{ maxHeight: '26rem', overflowY: 'auto', paddingRight: '0.25rem' }}>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(140px, 1.5fr) repeat(5, minmax(90px, 1fr))',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    borderBottom: '1px solid var(--ds-color-neutral-border-subtle)',
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    color: 'var(--ds-color-neutral-text-subtle)',
                  }}
                >
                  <span>Tid</span>
                  <span>Prod. (MW)</span>
                  <span>Inntekt (NOK/h)</span>
                  <span>Miljøkost (NOK/h)</span>
                  <span>Spot (NOK/MWh)</span>
                  <span>Magasin (%)</span>
                </div>

                {latestRawRows.map((point) => (
                  <div
                    key={`${point.timestamp}-${point.total_production_mw}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(140px, 1.5fr) repeat(5, minmax(90px, 1fr))',
                      gap: '0.5rem',
                      padding: '0.6rem 0.75rem',
                      border: '1px solid var(--ds-color-neutral-border-subtle)',
                      borderRadius: '0.5rem',
                      fontSize: '0.8rem',
                      background: 'var(--ds-color-neutral-surface-tinted)',
                      alignItems: 'center',
                    }}
                  >
                    <span>{formatDateTime(point.timestamp)}</span>
                    <span>{formatNumber(point.total_production_mw, 2)}</span>
                    <span>{formatNumber(point.revenue_nok_h, 0)}</span>
                    <span>{formatNumber(point.environmental_cost_nok_h, 0)}</span>
                    <span>{formatNumber(point.price_nok_mwh, 2)}</span>
                    <span>{formatNumber(point.reservoir_level_pct, 2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardBlock>
      </Card>

      <Card>
        <CardBlock>
          <Heading level={2} data-size="sm" style={{ marginBottom: '0.75rem' }}>
            Timehistorikk (siste 8 timer)
          </Heading>

          {latestHourlyRows.length === 0 ? (
            <Paragraph>Ingen timehistorikk ennå.</Paragraph>
          ) : (
            <div style={{ maxHeight: '20rem', overflowY: 'auto', paddingRight: '0.25rem' }}>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(140px, 1.4fr) repeat(6, minmax(90px, 1fr))',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    borderBottom: '1px solid var(--ds-color-neutral-border-subtle)',
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    color: 'var(--ds-color-neutral-text-subtle)',
                  }}
                >
                  <span>Time</span>
                  <span>Snitt prod. (MW)</span>
                  <span>Energi (MWh)</span>
                  <span>Inntekt (NOK)</span>
                  <span>Miljøkost (NOK)</span>
                  <span>Spot snitt</span>
                  <span>Magasin snitt</span>
                </div>

                {latestHourlyRows.map((point) => (
                  <div
                    key={point.hour}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(140px, 1.4fr) repeat(6, minmax(90px, 1fr))',
                      gap: '0.5rem',
                      padding: '0.6rem 0.75rem',
                      border: '1px solid var(--ds-color-neutral-border-subtle)',
                      borderRadius: '0.5rem',
                      fontSize: '0.8rem',
                      background: 'var(--ds-color-neutral-surface-tinted)',
                      alignItems: 'center',
                    }}
                  >
                    <span>{formatDateTime(point.hour)}</span>
                    <span>{formatNumber(point.avg_production_mw, 2)}</span>
                    <span>{formatNumber(point.energy_mwh, 2)}</span>
                    <span>{formatNumber(point.revenue_nok, 0)}</span>
                    <span>{formatNumber(point.environmental_cost_nok, 0)}</span>
                    <span>{formatNumber(point.avg_price_nok_mwh, 2)}</span>
                    <span>{formatNumber(point.avg_reservoir_level_pct, 2)} %</span>
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
