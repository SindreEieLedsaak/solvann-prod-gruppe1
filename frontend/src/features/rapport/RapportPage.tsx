import {
  Alert,
  Button,
  Card,
  CardBlock,
  Heading,
  Paragraph,
  Spinner,
} from '@digdir/designsystemet-react';
import { usePolling } from '../../hooks/usePolling';
import { plantService } from '../../services/plantService';
import type { DailyReport } from '../../types/plant';
import dashStyles from '../dashboard/DashboardPage.module.css';
import styles from './RapportPage.module.css';

interface ReportRow {
  readonly label: string;
  readonly value: string;
  readonly unit: string;
}

interface ReportSection {
  readonly title: string;
  readonly rows: ReportRow[];
}

function fmtDecimal(n: number, decimals = 1) {
  return new Intl.NumberFormat('nb-NO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

function fmtInt(n: number) {
  return new Intl.NumberFormat('nb-NO').format(Math.round(n));
}

function fmtNok(n: number) {
  return new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(n);
}

function buildSections(report: DailyReport): ReportSection[] {
  const { production, economy, decision_analysis: decision, environment } = report;

  const standbyIds = decision.standby_turbine_ids;
  const standbyNote = standbyIds.length ? standbyIds.join(', ') : 'ingen turbiner';
  const standbyPlural = standbyIds.length > 1 ? 'e' : '';

  return [
    {
      title: 'Produksjon',
      rows: [
        {
          label: 'Total energi produsert',
          value: fmtDecimal(production.total_energy_mwh),
          unit: 'MWh',
        },
        {
          label: 'Solkraft produsert',
          value: fmtDecimal(production.solar_energy_mwh),
          unit: 'MWh',
        },
        {
          label: 'Aktive turbiner (dag)',
          value: `${production.active_turbines} av ${production.total_turbines}`,
          unit: '',
        },
        {
          label: 'Turbiner på standby/vedlikehold',
          value: fmtInt(production.standby_or_maintenance_turbines),
          unit: 'stk',
        },
        {
          label: 'Snittlig magasinnivå',
          value: fmtDecimal(production.avg_reservoir_level_pct),
          unit: '%',
        },
      ],
    },
    {
      title: 'Økonomi',
      rows: [
        { label: 'Brutto inntjening', value: fmtNok(economy.gross_revenue_nok), unit: 'NOK' },
        {
          label: 'Total miljøkostnad',
          value: fmtNok(economy.total_environmental_cost_nok),
          unit: 'NOK',
        },
        { label: 'Netto resultat', value: fmtNok(economy.net_result_nok), unit: 'NOK' },
        {
          label: 'Gjennomsnittlig spotpris',
          value: fmtDecimal(economy.avg_spot_price_nok_mwh),
          unit: 'NOK/MWh',
        },
        {
          label: 'Høyeste spotpris (i dag)',
          value: fmtDecimal(economy.high_spot_price_nok_mwh),
          unit: 'NOK/MWh',
        },
        {
          label: 'Laveste spotpris (i dag)',
          value: fmtDecimal(economy.low_spot_price_nok_mwh),
          unit: 'NOK/MWh',
        },
      ],
    },
    {
      title: 'Beslutningsanalyse',
      rows: [
        {
          label: `Total tapt inntekt (${standbyNote} standby)`,
          value: fmtNok(decision.standby_lost_revenue_nok),
          unit: 'NOK',
        },
        {
          label: `Timer ${standbyNote} burde vært aktiv${standbyPlural}`,
          value: fmtInt(decision.standby_should_run_hours),
          unit: 'timer',
        },
        {
          label: 'Timer med underproduksjon (PEAK-pris)',
          value: fmtInt(decision.peak_underproduction_hours),
          unit: 'timer',
        },
        {
          label: 'Estimert tapt inntekt (prisoptimering)',
          value: fmtNok(decision.price_optimization_loss_nok),
          unit: 'NOK',
        },
        {
          label: 'Netto avvik fra optimal drift',
          value: fmtNok(decision.net_deviation_nok),
          unit: 'NOK',
        },
      ],
    },
    {
      title: 'Miljø og konsesjon',
      rows: [
        {
          label: 'Timer med miljøkostnad',
          value: fmtInt(environment.hours_with_environmental_cost),
          unit: 'timer',
        },
        {
          label: 'Timer uten miljøkostnad',
          value: fmtInt(environment.hours_without_environmental_cost),
          unit: 'timer',
        },
        {
          label: 'Total miljøkostnad',
          value: fmtNok(environment.total_environmental_cost_nok),
          unit: 'NOK',
        },
        {
          label: 'Gjennomsnittlig avløp',
          value: fmtDecimal(environment.avg_outflow_m3s),
          unit: 'm³/s',
        },
      ],
    },
  ];
}

function csvLine(cells: string[]) {
  return cells.map((c) => `"${c.replace(/"/g, '""')}"`).join(';');
}

function exportCsv(sections: ReportSection[], today: string, filename: string) {
  const lines: string[] = [
    csvLine(['Solvann kraftverk', 'Daglig driftsrapport']),
    csvLine(['Dato', today]),
    '',
  ];
  sections.forEach((section) => {
    lines.push(csvLine([section.title.toUpperCase()]));
    section.rows.forEach((row) => {
      lines.push(csvLine([row.label, [row.value, row.unit].filter(Boolean).join(' ')]));
    });
    lines.push('');
  });
  const csv = lines.join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function RapportPage() {
  const { data, loading, error } = usePolling(() => plantService.getDailyReport(), 5000);
  const today = new Date().toLocaleDateString('nb-NO');
  const filename = `Driftsrapport_${new Date().toISOString().slice(0, 10)}.csv`;
  const sections = data ? buildSections(data) : [];

  return (
    <div className={dashStyles.page}>
      <div className={dashStyles.topBar}>
        <div>
          <Heading level={1} data-size="lg">
            Rapport
          </Heading>
          <Paragraph data-size="sm" className={dashStyles.timestamp}>
            Daglig driftsrapport, klar for eksport
          </Paragraph>
        </div>
        <Button
          variant="secondary"
          disabled={!data}
          onClick={() => data && exportCsv(sections, today, filename)}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path
              d="M7 1v8m0 0L4 6m3 3l3-3M2 11h10v2H2z"
              fill="none"
              stroke="#5FD3FF"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Eksporter rapport
        </Button>
      </div>

      {error && (
        <Alert data-color="danger">
          <Paragraph>Datafeil: {error}</Paragraph>
        </Alert>
      )}

      {loading && !data && (
        <div className={dashStyles.spinnerCenter}>
          <Spinner aria-label="Henter rapportdata..." />
        </div>
      )}

      {data && (
        <Card className={styles.report}>
          <CardBlock>
            <div className={styles.letterhead}>
              <Heading level={2} data-size="md" className={styles.plantName}>
                Solvann kraftverk
              </Heading>
              <Paragraph data-size="sm" className={styles.reportSubtitle}>
                Daglig driftsrapport – til ledelse og investorer
              </Paragraph>
              <Paragraph data-size="sm" className={styles.reportDate}>
                Dato: {today}
              </Paragraph>
              <Paragraph data-size="xs" className={styles.disclaimer}>
                Basert på gjeldende driftsforhold, projisert over et døgn (24 timer).
              </Paragraph>
            </div>

            {sections.map((section) => (
              <section key={section.title} className={styles.section}>
                <Heading level={3} data-size="xs" className={styles.sectionTitle}>
                  {section.title.toUpperCase()}
                </Heading>
                <dl className={styles.rows}>
                  {section.rows.map((row) => (
                    <div key={row.label} className={styles.row}>
                      <dt className={styles.label}>{row.label}</dt>
                      <dd className={styles.value}>
                        {row.value}
                        {row.unit && <span className={styles.unit}>{row.unit}</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </CardBlock>
        </Card>
      )}
    </div>
  );
}
