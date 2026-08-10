import { Alert, Button, Card, CardBlock, Heading, Paragraph } from '@digdir/designsystemet-react';
import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div>
      <Heading data-size="2xl" level={1} style={{ marginBottom: 'var(--ds-spacing-4)' }}>
        Welcome to Solvann
      </Heading>
      <Paragraph data-size="lg" style={{ marginBottom: 'var(--ds-spacing-6)' }}>
        A production-ready full-stack template built with Python Flask and React.
      </Paragraph>

      <Alert data-color="info" style={{ marginBottom: 'var(--ds-spacing-6)' }}>
        <Heading data-size="sm" level={2}>
          Getting started
        </Heading>
        <Paragraph data-size="sm">
          Visit the <strong>Example</strong> page to see a working API integration with a live
          Flask backend.
        </Paragraph>
      </Alert>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 'var(--ds-spacing-4)',
          marginBottom: 'var(--ds-spacing-6)',
        }}
      >
        <Card>
          <CardBlock>
            <Heading data-size="md" level={3}>
              Backend
            </Heading>
            <Paragraph data-size="sm">
              Python Flask with Blueprints, CORS, structured logging, and a health check endpoint.
            </Paragraph>
          </CardBlock>
        </Card>

        <Card>
          <CardBlock>
            <Heading data-size="md" level={3}>
              Frontend
            </Heading>
            <Paragraph data-size="sm">
              React + TypeScript with Vite, React Router, a typed API client, and Error Boundaries.
            </Paragraph>
          </CardBlock>
        </Card>

        <Card>
          <CardBlock>
            <Heading data-size="md" level={3}>
              Design System
            </Heading>
            <Paragraph data-size="sm">
              Designsystemet components with consistent tokens for spacing, colour, and typography.
            </Paragraph>
          </CardBlock>
        </Card>
      </div>

      <Button asChild>
        <Link to="/example">See example feature →</Link>
      </Button>
    </div>
  );
}
