import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBlock,
  Heading,
  Paragraph,
  Spinner,
  Textfield,
} from '@digdir/designsystemet-react';
import { useItems } from './hooks/useItems';
import type { CreateItemRequest } from '../../types/api';

export function ExamplePage() {
  const { items, isLoading, error, createItem } = useItems();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const payload: CreateItemRequest = { name: name.trim(), description: description.trim() };
      await createItem(payload);
      setName('');
      setDescription('');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '720px' }}>
      <Heading data-size="2xl" level={1} style={{ marginBottom: 'var(--ds-spacing-2)' }}>
        Example: Items
      </Heading>
      <Paragraph data-size="sm" style={{ marginBottom: 'var(--ds-spacing-6)' }}>
        This page demonstrates full-stack communication: a React frontend calling a Flask REST API.
        Data is stored in memory — replace{' '}
        <code>backend/app/services/example_service.py</code> with a database repository when ready.
      </Paragraph>

      {/* Add item form */}
      <Card style={{ marginBottom: 'var(--ds-spacing-6)' }}>
        <CardBlock>
          <Heading data-size="md" level={2} style={{ marginBottom: 'var(--ds-spacing-4)' }}>
            Add item
          </Heading>
          <form onSubmit={handleSubmit}>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-spacing-3)' }}
            >
              <Textfield
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
              />
              <Textfield
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
              />
              {submitError && (
                <Alert data-color="danger">
                  <Paragraph data-size="sm">{submitError}</Paragraph>
                </Alert>
              )}
              <div>
                <Button type="submit" disabled={!name.trim() || isSubmitting}>
                  {isSubmitting ? 'Saving…' : 'Add item'}
                </Button>
              </div>
            </div>
          </form>
        </CardBlock>
      </Card>

      {/* Item list */}
      {error && (
        <Alert data-color="danger" style={{ marginBottom: 'var(--ds-spacing-4)' }}>
          <Paragraph data-size="sm">Could not load items: {error}</Paragraph>
        </Alert>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--ds-spacing-8)' }}>
          <Spinner aria-label="Loading items…" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-spacing-3)' }}>
          {items.length === 0 ? (
            <Paragraph data-size="sm">No items yet. Add one above.</Paragraph>
          ) : (
            items.map((item) => (
              <Card key={item.id}>
                <CardBlock>
                  <Heading data-size="sm" level={3}>
                    {item.name}
                  </Heading>
                  {item.description && <Paragraph data-size="sm">{item.description}</Paragraph>}
                </CardBlock>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
