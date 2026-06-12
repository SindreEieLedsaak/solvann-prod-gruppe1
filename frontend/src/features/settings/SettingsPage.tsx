import {
  Alert,
  Card,
  CardBlock,
  Heading,
  Paragraph,
  Table,
} from '@digdir/designsystemet-react';
import styles from '../dashboard/DashboardPage.module.css';

const SYSTEM_PARAMS = [
  { id: 'SYS_POLL_INTERVAL', label: 'Oppdateringsintervall (s)', value: '5' },
  { id: 'SYS_RESERVOIR_MIN', label: 'Minimumsnivå magasin (%)', value: '20.00' },
  { id: 'SYS_RESERVOIR_MAX', label: 'Maksimumsnivå magasin (%)', value: '95.00' },
  { id: 'SYS_ECO_FLOW_MIN', label: 'Min. miljøvannføring (m³/s)', value: '15.00' },
  { id: 'SYS_TURB_RAMP_RATE', label: 'Turbin oppstartsrampe (MW/min)', value: '2.5' },
  { id: 'SYS_PRICE_AREA', label: 'Prisområde', value: 'NO5' },
  { id: 'SYS_CAPACITY_TOTAL', label: 'Total installert kapasitet (MW)', value: '335.0' },
  { id: 'SYS_PANELS_TOTAL', label: 'Solpaneler totalt', value: '10 000' },
  { id: 'SYS_PANEL_PEAK_W', label: 'Paneleffekt (W)', value: '400' },
  { id: 'SYS_API_VERSION', label: 'API-versjon', value: '2.3.1' },
  { id: 'SYS_LOG_LEVEL', label: 'Loggnivå', value: 'INFO' },
];

const SYSTEM_INFO = [
  ['Systemnavn', 'Driftsovervåking — Solvann Kraftverk AS'],
  ['Versjon', '2.3.1'],
  ['Installert', '2018-03-14'],
  ['Siste oppdatering', '2021-11-02'],
  ['Leverandør', 'IndustriSoft AS'],
  ['Supportkontrakt', 'Utløpt 2023-12-31'],
];

export function SettingsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Heading level={1} data-size="lg">
          Innstillinger
        </Heading>
      </div>

      <Alert data-color="info">
        <Paragraph>
          Systemparametere kan kun endres av systemadministrator. Kontakt driftsansvarlig.
        </Paragraph>
      </Alert>

      <Card>
        <CardBlock>
          <Heading level={2} data-size="sm" style={{ marginBottom: 'var(--ds-spacing-3)' }}>
            Systemparametere
          </Heading>
          <Table>
            <Table.Head>
              <Table.Row>
                <Table.HeaderCell>Parameter-ID</Table.HeaderCell>
                <Table.HeaderCell>Beskrivelse</Table.HeaderCell>
                <Table.HeaderCell>Verdi</Table.HeaderCell>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {SYSTEM_PARAMS.map((p) => (
                <Table.Row key={p.id}>
                  <Table.Cell><code>{p.id}</code></Table.Cell>
                  <Table.Cell>{p.label}</Table.Cell>
                  <Table.Cell>{p.value}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </CardBlock>
      </Card>

      <Card>
        <CardBlock>
          <Heading level={2} data-size="sm" style={{ marginBottom: 'var(--ds-spacing-3)' }}>
            Systeminfo
          </Heading>
          <Table>
            <Table.Head>
              <Table.Row>
                <Table.HeaderCell>Felt</Table.HeaderCell>
                <Table.HeaderCell>Verdi</Table.HeaderCell>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {SYSTEM_INFO.map(([label, value]) => (
                <Table.Row key={label}>
                  <Table.Cell>{label}</Table.Cell>
                  <Table.Cell>{value}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </CardBlock>
      </Card>
    </div>
  );
}
