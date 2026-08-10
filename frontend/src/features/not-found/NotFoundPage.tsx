import { Button, Heading, Paragraph } from '@digdir/designsystemet-react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--ds-spacing-12) 0' }}>
      <Heading data-size="2xl" level={1}>
        404 — Page not found
      </Heading>
      <Paragraph
        data-size="lg"
        style={{ marginTop: 'var(--ds-spacing-3)', marginBottom: 'var(--ds-spacing-6)' }}
      >
        The page you are looking for does not exist.
      </Paragraph>
      <Button asChild>
        <Link to="/">Go to home</Link>
      </Button>
    </div>
  );
}
