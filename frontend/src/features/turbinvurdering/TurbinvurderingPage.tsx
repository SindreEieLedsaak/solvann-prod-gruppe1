import { SketchPage } from '../../components/ui/SketchPage';

export function TurbinvurderingPage() {
  return (
    <SketchPage
      title="Turbinvurdering"
      subtitle="Tilstand og utvikling per turbin over tid"
      contentTitle="Utvikling over tid"
      placeholder="graf: vibrasjon og lagertemperatur"
      cards={[
        { label: 'Turbiner vurdert', value: '6', unit: '/ 6', note: 'Sist gjennomgang 04.08' },
        { label: 'Under 40 % last', value: '0', unit: 't', note: 'Siste 24 timer' },
        { label: 'Høyeste vibrasjon', value: '2,8', unit: 'mm/s', note: 'T3 — innenfor grense' },
        { label: 'Neste vedlikehold', value: '12', unit: 'dager', note: 'T6 pågår nå' },
      ]}
    />
  );
}
