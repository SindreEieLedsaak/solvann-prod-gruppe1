import { useState } from 'react';
import { Alert, Card, CardBlock, Heading, Paragraph, Spinner } from '@digdir/designsystemet-react';
import { usePolling } from '../../hooks/usePolling';
import { plantService } from '../../services/plantService';
import type { Turbine } from '../../types/plant';
import { COPY, NEEDS, SPRITES, type Mood } from './sprites';
import styles from './DamagochiPage.module.css';

function fmt(n: number, decimals = 1) {
  return n.toFixed(decimals);
}

function fmtNok(n: number) {
  return new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(n);
}

interface DamagochiState {
  mood: Mood;
  needIdx: number;
}

export function DamagochiPage() {
  const { data, loading, error } = usePolling(() => plantService.getOverview(), 5000);
  const [state, setState] = useState<DamagochiState>({ mood: 'thirsty', needIdx: 0 });

  function pump() {
    setState((s) => ({ ...s, mood: 'drinking' }));
  }

  function produce() {
    setState((s) => ({ ...s, mood: 'peeing' }));
  }

  function neutral() {
    setState((s) => {
      if (s.mood === 'drinking' || s.mood === 'peeing') return { ...s, mood: 'content' };
      const next = (s.needIdx + 1) % NEEDS.length;
      console.log(NEEDS[next]);
      return { mood: NEEDS[next], needIdx: next };
    });
  }

  const copy = COPY[state.mood];
  const Sprite = SPRITES[state.mood];
  const isPumping = state.mood === 'drinking';
  const isRunning = state.mood === 'peeing';
  const showTurbineChips = isPumping || isRunning;

  const ps = data?.plant_status;
  const mkt = data?.market;

  return (
    <div className={styles.page}>


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

      <div className={styles.layout}>
        <div className={styles.deviceHeading}>
          <Heading level={2} data-size="xl" className={styles.deviceTitle}>
            Damagochi
          </Heading>
        </div>

        <div className={styles.deviceColumn}>
          <div className={styles.device}>
            <div className={styles.deviceBezel}>
              <div className={styles.screen}>
                <div className={styles.spriteWrap} aria-hidden="true">
                  <Sprite />
                </div>

                <div className={styles.stateBlock}>
                  <Paragraph data-size="md" className={styles.stateText}>
                    <strong>{copy.text}</strong>
                  </Paragraph>
                  <Paragraph data-size="sm" className={styles.stateSub}>
                    {copy.sub}
                  </Paragraph>
                </div>
              </div>
            </div>

            <div className={styles.controls}>
              <button
                type="button"
                className={[styles.controlButton, styles.controlButtonPump].join(' ')}
                onClick={pump}
              >
                Pump
              </button>
              <button
                type="button"
                className={[styles.controlButton, styles.controlButtonNeutral].join(' ')}
                onClick={neutral}
              >
                Nøytral
              </button>
              <button
                type="button"
                className={[styles.controlButton, styles.controlButtonRun].join(' ')}
                onClick={produce}
              >
                Kjør
              </button>
            </div>
          </div>
        </div>

        <div className={styles.kpiColumn}>
          {ps && mkt && (
            <>
              <KpiRow label="Totalproduksjon" value={`${fmt(ps.total_production_mw)} MW`} />
              <KpiRow label="Inntekt (est.)" value={`${fmtNok(ps.revenue_nok_h)} NOK/t`} />
              <KpiRow
                label="Miljøkostnad"
                value={`${fmtNok(ps.environmental_cost_nok_h)} NOK/t`}
              />
              <KpiRow label="Vanninntak" value={`${fmt(ps.water_inflow_m3s)} m³/s`} />
              <KpiRow label="Magasinnivå" value={`${fmt(ps.reservoir_level_pct)} %`} />
              <KpiRow
                label="Aktive turbiner"
                value={`${ps.active_turbines} / ${ps.total_turbines}`}
              />
              <KpiRow label="Spotpris" value={`${fmt(mkt.price_nok_mwh, 2)} NOK/MWh`} />
            </>
          )}

          {showTurbineChips && data && (
            <Card className={styles.chipsCard}>
              <CardBlock>
                <Paragraph data-size="sm" className={styles.chipsLabel}>
                  {isPumping ? 'Pumper med' : 'Produserer med'}
                </Paragraph>
                <div className={styles.chipList}>
                  {data.turbines.map((t) => (
                    <TurbineChip key={t.id} turbine={t} mode={isPumping ? 'pump' : 'run'} />
                  ))}
                </div>
              </CardBlock>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

interface KpiRowProps {
  readonly label: string;
  readonly value: string;
}

function KpiRow({ label, value }: KpiRowProps) {
  return (
    <div className={styles.kpiRow}>
      <span className={styles.kpiLabel}>{label}</span>
      <span className={styles.kpiValue}>{value}</span>
    </div>
  );
}

interface TurbineChipProps {
  readonly turbine: Turbine;
  readonly mode: 'pump' | 'run';
}

function TurbineChip({ turbine, mode }: TurbineChipProps) {
  const active = mode === 'pump' ? turbine.pump_mode : turbine.status === 'RUNNING';
  const tint = mode === 'pump' ? 'info' : 'success';

  const activeStyle = active
    ? {
        background: `var(--ds-color-${tint}-surface-default)`,
        borderColor: `var(--ds-color-${tint}-border-default)`,
        color: `var(--ds-color-${tint}-text-subtle)`,
      }
    : undefined;

  return (
    <span
      className={[styles.chip, active ? styles.chipActive : ''].join(' ').trim()}
      style={activeStyle}
    >
      <span className={styles.chipDot} />
      {turbine.id}
    </span>
  );
}
