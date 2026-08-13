import { Card, CardBlock, Heading, Paragraph } from '@digdir/designsystemet-react';
import dashStyles from '../../features/dashboard/DashboardPage.module.css';
import styles from './SketchPage.module.css';

export interface SketchCard {
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
  readonly note: string;
}

interface SketchPageProps {
  readonly title: string;
  readonly subtitle: string;
  readonly contentTitle: string;
  readonly placeholder: string;
  readonly cards: readonly SketchCard[];
}

export function SketchPage({ title, subtitle, contentTitle, placeholder, cards }: SketchPageProps) {
  return (
    <div className={dashStyles.page}>
      <div className={dashStyles.topBar}>
        <div>
          <Heading level={1} data-size="lg">
            {title}
          </Heading>
          <Paragraph data-size="sm" className={dashStyles.timestamp}>
            {subtitle}
          </Paragraph>
        </div>
        <span className={styles.sketchBadge}>skisse &mdash; samme mal</span>
      </div>

      <div className={dashStyles.statsGrid}>
        {cards.map((c) => (
          <Card key={c.label}>
            <CardBlock>
              <div className={dashStyles.statCard}>
                <span className={dashStyles.statLabel}>{c.label}</span>
                <span className={dashStyles.statValue}>
                  {c.value}
                  {c.unit && <span className={dashStyles.statUnit}> {c.unit}</span>}
                </span>
                <span className={dashStyles.statUnit}>{c.note}</span>
              </div>
            </CardBlock>
          </Card>
        ))}
      </div>

      <Card>
        <CardBlock>
          <div className={styles.contentHeader}>
            <Heading level={2} data-size="sm">
              {contentTitle}
            </Heading>
            <span className={styles.contentNote}>Innhold defineres i funksjonell spesifikasjon</span>
          </div>
          <div className={styles.placeholderBox}>
            <span className={styles.placeholderText}>{placeholder}</span>
          </div>
        </CardBlock>
      </Card>
    </div>
  );
}
