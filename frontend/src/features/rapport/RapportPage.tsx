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
import type { PlantOverview, TurbineStatus } from '../../types/plant';
import dashStyles from '../dashboard/DashboardPage.module.css';
import styles from './RapportPage.module.css';

const SHEET_COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

type RowType = 'title' | 'meta' | 'blank' | 'header' | 'data';

interface SheetRow {
  readonly type: RowType;
  readonly cells: readonly string[];
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

function isProducing(status: TurbineStatus) {
  return status === 'RUNNING' || status === 'PUMPING';
}

function fmtDecimal(n: number, decimals = 1) {
  return n.toFixed(decimals).replace('.', ',');
}

function fmtNok(n: number) {
  return new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(n);
}

function buildSheetRows(data: PlantOverview): SheetRow[] {
  const rows: SheetRow[] = [];
  const today = new Date().toLocaleDateString('nb-NO');

  rows.push({ type: 'title', cells: ['Solvann kraftverk — Produksjonsrapport', '', '', '', '', '', ''] });
  rows.push({
    type: 'meta',
    cells: ['Dato:', today, '', 'Spotpris:', `${fmtDecimal(data.market.price_nok_mwh, 2)} NOK/MWh`, '', ''],
  });
  rows.push({ type: 'blank', cells: ['', '', '', '', '', '', ''] });
  rows.push({
    type: 'header',
    cells: ['Turbin', 'Status', 'Produksjon (MW)', 'Last (%)', 'Kapasitet (MW)', 'Pumpemodus', 'Driftstid (t)'],
  });

  data.turbines.forEach((t) => {
    rows.push({
      type: 'data',
      cells: [
        t.id,
        statusLabel(t.status),
        isProducing(t.status) ? fmtDecimal(t.production_mw) : '—',
        isProducing(t.status) ? String(Math.round(t.load_pct)) : '—',
        String(Math.round(t.capacity_mw)),
        t.pump_mode ? 'Ja' : 'Nei',
        new Intl.NumberFormat('nb-NO').format(Math.round(t.runtime_h)),
      ],
    });
  });

  rows.push({ type: 'blank', cells: ['', '', '', '', '', '', ''] });
  rows.push({
    type: 'meta',
    cells: [
      'Totalproduksjon',
      `${fmtDecimal(data.plant_status.total_production_mw)} MW`,
      '',
      'Inntekt (est.)',
      `${fmtNok(data.plant_status.revenue_nok_h)} NOK/t`,
      '',
      '',
    ],
  });
  rows.push({
    type: 'meta',
    cells: [
      'Miljøkostnad',
      `${fmtNok(data.plant_status.environmental_cost_nok_h)} NOK/t`,
      '',
      'Vanninntak',
      `${fmtDecimal(data.plant_status.water_inflow_m3s)} m³/s`,
      '',
      '',
    ],
  });

  return rows;
}

function cellClass(type: RowType, colIndex: number): string {
  if (type === 'title') return colIndex === 0 ? `${styles.cell} ${styles.cellTitle}` : styles.cell;
  if (type === 'meta') {
    return colIndex % 3 === 0 ? `${styles.cell} ${styles.cellMetaLabel}` : `${styles.cell} ${styles.cellMeta}`;
  }
  if (type === 'header') return `${styles.cell} ${styles.cellHeader}`;
  return styles.cell;
}

function exportCsv(rows: SheetRow[], filename: string) {
  const csv = rows
    .map((r) => r.cells.map((c) => `"${c.replace(/"/g, '""')}"`).join(';'))
    .join('\r\n');
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
  const { data, loading, error } = usePolling(() => plantService.getOverview(), 5000);
  const filename = `Produksjonsrapport_${new Date().toISOString().slice(0, 10)}.csv`;
  const rows = data ? buildSheetRows(data) : [];

  return (
    <div className={dashStyles.page}>
      <div className={dashStyles.topBar}>
        <div>
          <Heading level={1} data-size="lg">
            Rapport
          </Heading>
          <Paragraph data-size="sm" className={dashStyles.timestamp}>
            Daglig produksjonsrapport, klar for eksport
          </Paragraph>
        </div>
        <Button variant="secondary" disabled={!data} onClick={() => data && exportCsv(rows, filename)}>
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
          Eksporter til Excel
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
        <Card>
          <CardBlock>
            <div className={styles.fileRow}>
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <rect x="1" y="1" width="14" height="14" rx="2" fill="#5E8C6A" />
                <path d="M4 5h8M4 8h8M4 11h5" stroke="#0A1520" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <span className={styles.filename}>{filename}</span>
            </div>
            <div className={styles.sheetScroll}>
              <table className={styles.sheet}>
                <thead>
                  <tr>
                    <th className={styles.cornerCell} />
                    {SHEET_COLS.map((l) => (
                      <th key={l} className={styles.colHeader}>
                        {l}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i}>
                      <td className={styles.rowHeader}>{i + 1}</td>
                      {row.cells.map((value, ci) => (
                        <td key={ci} className={cellClass(row.type, ci)}>
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBlock>
        </Card>
      )}
    </div>
  );
}
