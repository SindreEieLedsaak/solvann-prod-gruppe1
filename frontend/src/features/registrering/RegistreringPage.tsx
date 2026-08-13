import { SketchPage } from '../../components/ui/SketchPage';

export function RegistreringPage() {
  return (
    <SketchPage
      title="Registrering"
      subtitle="Erstatter manuell føring i regneark"
      contentTitle="Registreringslogg"
      placeholder="tabell med registreringer"
      cards={[
        { label: 'Registreringer i dag', value: '18', note: 'Av 24 forventede' },
        { label: 'Manglende felt', value: '3', note: 'Krever oppfølging' },
        { label: 'Snitt tid per føring', value: '1,4', unit: 'min', note: 'Var 6 min i regneark' },
        { label: 'Siste føring', value: '09:00', note: 'Vaktskifte kl. 07' },
      ]}
    />
  );
}
