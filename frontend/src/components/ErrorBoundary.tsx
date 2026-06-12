import React, { Component, type ReactNode } from 'react';
import { Alert, Button, Heading, Paragraph } from '@digdir/designsystemet-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
          <Alert data-color="danger">
            <Heading data-size="sm" level={2}>
              Something went wrong
            </Heading>
            <Paragraph data-size="sm">An unexpected error occurred. Please try again.</Paragraph>
            {import.meta.env.DEV && this.state.error && (
              <Paragraph data-size="sm">
                <code>{this.state.error.message}</code>
              </Paragraph>
            )}
            <Button variant="secondary" data-size="sm" onClick={this.handleReset}>
              Try again
            </Button>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}
