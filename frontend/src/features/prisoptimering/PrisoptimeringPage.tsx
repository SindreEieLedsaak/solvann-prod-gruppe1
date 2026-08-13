import { SketchPage } from '../../components/ui/SketchPage';

export function PrisoptimeringPage() {
  return (
    <SketchPage
      title="Prisoptimering"
      subtitle="Spotpris, pumping og miljøkostnad sett sammen"
      contentTitle="Pris og produksjon per time"
      placeholder="graf: spotpris mot produksjon og pumping"
      cards={[
        { label: 'Spotpris NO5', value: '412,60', unit: 'NOK/MWh', note: 'Neste time: 388,10' },
        { label: 'Inntekt (est.)', value: '76 004', unit: 'NOK/t', note: 'Siste 24 t: 1,7 mill.' },
        { label: 'Miljøkostnad', value: '0', unit: 'NOK/t', note: 'Innenfor konsesjonskrav' },
        { label: 'Pumpevindu', value: '02–05', unit: '', note: 'Lavpris i natt' },
      ]}
    />
  );
}
