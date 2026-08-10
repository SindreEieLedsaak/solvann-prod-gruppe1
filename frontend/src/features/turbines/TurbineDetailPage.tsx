import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Alert,
  Tag,
  Card,
  CardBlock,
  Heading,
  Paragraph,
  Spinner,
  Button,
  Field,
  Label,
  Input,
} from '@digdir/designsystemet-react';
import { usePolling } from '../../hooks/usePolling';
import { plantService } from '../../services/plantService';
import type { TurbineStatus } from '../../types/plant';
import styles from '../dashboard/DashboardPage.module.css';

const MIN_LOAD_PCT = 40;
const MAX_LOAD_PCT = 100;

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

export function TurbineDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: t, loading, error, refetch } = usePolling(() => plantService.getTurbine(id), 5000);
  const [controlError, setControlError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const loadInputRef = useRef<HTMLInputElement | null>(null);

  async function applyControl(payload: { status?: TurbineStatus; load_pct?: number }) {
    setSubmitting(true);
    setControlError(null);
    try {
      await plantService.setTurbineControl(id, payload);
      await refetch();
    } catch (err) {
      setControlError(err instanceof Error ? err.message : 'Ukjent feil');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSetLoad() {
    const value = Number(loadInputRef.current?.value);
    if (Number.isNaN(value)) {
      setControlError('Last må være et tall.');
      return;
    }
    applyControl({ load_pct: value });
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div>
          <Paragraph data-size="sm" className={styles.timestamp}>
            <Link to="/turbines">← Turbiner</Link>
          </Paragraph>
          <Heading level={1} data-size="lg">
            {id}
          </Heading>
        </div>
        {t && <Tag data-color={statusColor(t.status)}>{statusLabel(t.status)}</Tag>}
      </div>

      {error && <Alert data-color="danger"><Paragraph>{error}</Paragraph></Alert>}

      {loading && !t && (
        <div className={styles.spinnerCenter}><Spinner aria-label="Henter turbindata..." /></div>
      )}

      {t && (
        <>
          <div className={styles.statsGrid}>
            <Card>
              <CardBlock>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Produksjon</span>
                  <span className={styles.statValue}>
                    {t.status === 'RUNNING' || t.status === 'PUMPING'
                      ? t.production_mw.toFixed(2)
                      : '—'}
                    <span className={styles.statUnit}> MW</span>
                  </span>
                </div>
              </CardBlock>
            </Card>
            <Card>
              <CardBlock>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Kapasitet</span>
                  <span className={styles.statValue}>
                    {t.capacity_mw.toFixed(0)}
                    <span className={styles.statUnit}> MW</span>
                  </span>
                </div>
              </CardBlock>
            </Card>
            <Card>
              <CardBlock>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Utnyttelse</span>
                  <span className={styles.statValue}>
                    {t.status === 'RUNNING' || t.status === 'PUMPING'
                      ? `${((t.production_mw / t.capacity_mw) * 100).toFixed(1)}`
                      : '—'}
                    <span className={styles.statUnit}> %</span>
                  </span>
                </div>
              </CardBlock>
            </Card>
            <Card>
              <CardBlock>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Driftstid</span>
                  <span className={styles.statValue}>
                    {t.runtime_h.toFixed(0)}
                    <span className={styles.statUnit}> t</span>
                  </span>
                </div>
              </CardBlock>
            </Card>
            <Card>
              <CardBlock>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Vannføring</span>
                  <span className={styles.statValue}>
                    {t.flow_m3s.toFixed(2)}
                    <span className={styles.statUnit}> m³/s</span>
                  </span>
                </div>
              </CardBlock>
            </Card>
            <Card>
              <CardBlock>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Fallhøyde</span>
                  <span className={styles.statValue}>
                    {t.head_m.toFixed(0)}
                    <span className={styles.statUnit}> m</span>
                  </span>
                </div>
              </CardBlock>
            </Card>
            <Card>
              <CardBlock>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Lagertemperatur</span>
                  <span className={styles.statValue}>
                    {t.bearing_temp_c.toFixed(1)}
                    <span className={styles.statUnit}> °C</span>
                  </span>
                </div>
              </CardBlock>
            </Card>
            <Card>
              <CardBlock>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Vibrasjon</span>
                  <span className={styles.statValue}>
                    {t.vibration_mm_s.toFixed(2)}
                    <span className={styles.statUnit}> mm/s</span>
                  </span>
                </div>
              </CardBlock>
            </Card>
          </div>

          <Card>
            <CardBlock>
              <Heading level={2} data-size="sm" style={{ marginBottom: 'var(--ds-spacing-3)' }}>
                Styring
              </Heading>
              {t.status === 'MAINTENANCE' ? (
                <Paragraph data-size="sm">
                  Turbinen er under vedlikehold og kan ikke fjernstyres.
                </Paragraph>
              ) : (
                <>
                  <div className={styles.statCard} style={{ flexDirection: 'row', gap: 'var(--ds-spacing-2)' }}>
                    <Button
                      variant={t.status === 'RUNNING' ? 'primary' : 'secondary'}
                      disabled={submitting || t.status === 'RUNNING'}
                      onClick={() => applyControl({ status: 'RUNNING' })}
                    >
                      Start
                    </Button>
                    <Button
                      variant={t.status === 'STANDBY' ? 'primary' : 'secondary'}
                      disabled={submitting || t.status === 'STANDBY'}
                      onClick={() => applyControl({ status: 'STANDBY' })}
                    >
                      Standby
                    </Button>
                    <Button
                      variant={t.status === 'OFFLINE' ? 'primary' : 'secondary'}
                      data-color="danger"
                      disabled={submitting || t.status === 'OFFLINE'}
                      onClick={() => applyControl({ status: 'OFFLINE' })}
                    >
                      Stopp
                    </Button>
                    <Button
                      variant={t.status === 'PUMPING' ? 'primary' : 'secondary'}
                      disabled={submitting || t.status === 'PUMPING'}
                      onClick={() => applyControl({ status: 'PUMPING' })}
                    >
                      Pump vann tilbake
                    </Button>
                  </div>

                  <Field style={{ marginTop: 'var(--ds-spacing-4)', maxWidth: '16rem' }}>
                    <Label>Last (%)</Label>
                    <Input
                      ref={(el) => {
                        loadInputRef.current = el;
                      }}
                      type="number"
                      min={MIN_LOAD_PCT}
                      max={MAX_LOAD_PCT}
                      step={1}
                      key={`${t.id}-${t.load_pct}`}
                      defaultValue={t.load_pct}
                      disabled={submitting || (t.status !== 'RUNNING' && t.status !== 'PUMPING')}
                    />
                  </Field>
                  <Paragraph data-size="sm" style={{ marginTop: 'var(--ds-spacing-1)' }}>
                    Gyldig område: {MIN_LOAD_PCT}–{MAX_LOAD_PCT}% (under {MIN_LOAD_PCT}% bør turbinen
                    settes i standby i stedet).
                  </Paragraph>
                  <Button
                    style={{ marginTop: 'var(--ds-spacing-2)' }}
                    variant="secondary"
                    disabled={submitting || (t.status !== 'RUNNING' && t.status !== 'PUMPING')}
                    onClick={handleSetLoad}
                  >
                    Bruk last
                  </Button>
                </>
              )}
              {controlError && (
                <Alert data-color="danger" style={{ marginTop: 'var(--ds-spacing-3)' }}>
                  <Paragraph data-size="sm">{controlError}</Paragraph>
                </Alert>
              )}
            </CardBlock>
          </Card>

          <Card>
            <CardBlock>
              <Heading level={2} data-size="sm" style={{ marginBottom: 'var(--ds-spacing-3)' }}>
                Vedlikehold og informasjon
              </Heading>
              <div className={styles.twoCol}>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Produsent</span>
                  <span className={styles.statValue}>{t.manufacturer}</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Installert</span>
                  <span className={styles.statValue}>{t.install_year}</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Sist vedlikeholdt</span>
                  <span className={styles.statValue}>{t.last_maintenance}</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Neste vedlikehold</span>
                  <span className={styles.statValue}>{t.next_maintenance}</span>
                </div>
              </div>
            </CardBlock>
          </Card>
        </>
      )}
    </div>
  );
}
