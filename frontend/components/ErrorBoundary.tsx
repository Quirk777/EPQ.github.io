"use client";

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to console for debugging
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // In production, you might want to log this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided, otherwise use default
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback 
          error={this.state.error}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error;
  onRetry: () => void;
  onReload: () => void;
}

function ErrorFallback({ error, onRetry, onReload }: ErrorFallbackProps) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.iconContainer}>
          <div style={styles.icon}>⚠️</div>
        </div>
        
        <h2 style={styles.title}>Something went wrong</h2>
        
        <p style={styles.message}>
          We encountered an unexpected error. This has been logged and our team will investigate.
        </p>

        {isDev && error && (
          <details style={styles.details}>
            <summary style={styles.summary}>Technical Details (Development Only)</summary>
            <pre style={styles.errorText}>
              {error.name}: {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}

        <div style={styles.actions}>
          <button
            onClick={onRetry}
            style={styles.primaryButton}
          >
            Try Again
          </button>
          
          <button
            onClick={onReload}
            style={styles.secondaryButton}
          >
            Reload Page
          </button>
        </div>

        <p style={styles.support}>
          If this problem persists, please contact{' '}
          <a href="mailto:support@epq-platform.com" style={styles.link}>
            support@epq-platform.com
          </a>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    background: 'var(--surface-0, #0a0a0f)',
    color: 'var(--text-primary, #ffffff)',
  } as React.CSSProperties,

  content: {
    textAlign: 'center' as const,
    maxWidth: '600px',
    padding: '40px',
    background: 'var(--surface-2, rgba(255, 255, 255, 0.04))',
    borderRadius: '16px',
    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
    backdropFilter: 'blur(20px)',
  } as React.CSSProperties,

  iconContainer: {
    marginBottom: '24px',
  } as React.CSSProperties,

  icon: {
    fontSize: '64px',
    display: 'inline-block',
    animation: 'pulse 2s infinite',
  } as React.CSSProperties,

  title: {
    fontSize: '32px',
    fontWeight: 700,
    margin: '0 0 16px 0',
    color: 'var(--text-primary, #ffffff)',
  } as React.CSSProperties,

  message: {
    fontSize: '16px',
    lineHeight: '1.6',
    margin: '0 0 32px 0',
    color: 'var(--text-secondary, rgba(255, 255, 255, 0.7))',
  } as React.CSSProperties,

  details: {
    margin: '24px 0',
    padding: '16px',
    background: 'var(--surface-1, rgba(255, 255, 255, 0.02))',
    borderRadius: '8px',
    border: '1px solid var(--border-default, rgba(255, 255, 255, 0.1))',
    textAlign: 'left' as const,
  } as React.CSSProperties,

  summary: {
    cursor: 'pointer',
    fontWeight: 600,
    color: 'var(--text-primary, #ffffff)',
    marginBottom: '12px',
  } as React.CSSProperties,

  errorText: {
    fontSize: '14px',
    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
    color: 'var(--color-error, #ef4444)',
    background: 'var(--surface-0, #0a0a0f)',
    padding: '16px',
    borderRadius: '6px',
    overflow: 'auto',
    maxHeight: '200px',
    margin: '12px 0 0 0',
  } as React.CSSProperties,

  actions: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    marginBottom: '32px',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,

  primaryButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 600,
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, var(--accent-blue, #6366f1), var(--accent-purple, #8b5cf6))',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minWidth: '120px',
  } as React.CSSProperties,

  secondaryButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 600,
    borderRadius: '8px',
    border: '1px solid var(--border-default, rgba(255, 255, 255, 0.1))',
    background: 'var(--surface-3, rgba(255, 255, 255, 0.06))',
    color: 'var(--text-primary, #ffffff)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minWidth: '120px',
  } as React.CSSProperties,

  support: {
    fontSize: '14px',
    color: 'var(--text-tertiary, rgba(255, 255, 255, 0.5))',
    margin: 0,
  } as React.CSSProperties,

  link: {
    color: 'var(--accent-blue, #6366f1)',
    textDecoration: 'none',
  } as React.CSSProperties,
};

// Add CSS animations (you might want to add this to a global CSS file instead)
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `;
  document.head.appendChild(style);
}