"use client";

import React from 'react';

// Loading State Component
interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'spinner' | 'skeleton' | 'dots';
}

export function LoadingState({ 
  message = "Loading...", 
  size = 'medium',
  variant = 'spinner'
}: LoadingStateProps) {
  const sizeStyles = {
    small: { container: styles.containerSmall, spinner: styles.spinnerSmall },
    medium: { container: styles.containerMedium, spinner: styles.spinnerMedium },
    large: { container: styles.containerLarge, spinner: styles.spinnerLarge },
  };

  if (variant === 'skeleton') {
    return <SkeletonLoader size={size} />;
  }

  if (variant === 'dots') {
    return <DotsLoader message={message} size={size} />;
  }

  return (
    <div style={{ ...styles.loadingContainer, ...sizeStyles[size].container }}>
      <div style={{ ...styles.spinner, ...sizeStyles[size].spinner }}>
        <div style={styles.spinnerInner}></div>
      </div>
      {message && (
        <p style={styles.loadingText}>{message}</p>
      )}
    </div>
  );
}

// Skeleton Loader Component
function SkeletonLoader({ size }: { size: LoadingStateProps['size'] }) {
  const count = size === 'large' ? 5 : size === 'medium' ? 3 : 2;
  
  return (
    <div style={styles.skeletonContainer}>
      {Array(count).fill(0).map((_, i) => (
        <div key={i} style={styles.skeletonItem}></div>
      ))}
    </div>
  );
}

// Dots Loader Component
function DotsLoader({ message, size }: { message: string; size: LoadingStateProps['size'] }) {
  return (
    <div style={styles.loadingContainer}>
      <div style={styles.dotsContainer}>
        <div style={styles.dot}></div>
        <div style={styles.dot}></div>
        <div style={styles.dot}></div>
      </div>
      {message && (
        <p style={styles.loadingText}>{message}</p>
      )}
    </div>
  );
}

// Empty State Component
interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: React.ReactNode;
}

export function EmptyState({
  title = "No data found",
  message = "There's nothing to show here yet.",
  icon = "📭",
  actionLabel,
  onAction,
  children
}: EmptyStateProps) {
  return (
    <div style={styles.emptyContainer}>
      <div style={styles.emptyIcon}>{icon}</div>
      <h3 style={styles.emptyTitle}>{title}</h3>
      <p style={styles.emptyMessage}>{message}</p>
      
      {children}
      
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={styles.emptyAction}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// Error State Component
interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error | string;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An error occurred while loading the data.",
  error,
  onRetry,
  onDismiss,
  showDetails = false
}: ErrorStateProps) {
  const [showErrorDetails, setShowErrorDetails] = React.useState(false);
  
  const errorMessage = React.useMemo(() => {
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    return null;
  }, [error]);

  const errorStack = React.useMemo(() => {
    if (error instanceof Error) return error.stack;
    return null;
  }, [error]);

  return (
    <div style={styles.errorContainer}>
      <div style={styles.errorIcon}>⚠️</div>
      <h3 style={styles.errorTitle}>{title}</h3>
      <p style={styles.errorMessage}>{message}</p>
      
      {errorMessage && (
        <p style={styles.errorDetails}>{errorMessage}</p>
      )}

      {showDetails && errorStack && (
        <details style={styles.technicalDetails}>
          <summary 
            style={styles.detailsSummary}
            onClick={() => setShowErrorDetails(!showErrorDetails)}
          >
            Technical Details
          </summary>
          {showErrorDetails && (
            <pre style={styles.errorStack}>{errorStack}</pre>
          )}
        </details>
      )}

      <div style={styles.errorActions}>
        {onRetry && (
          <button
            onClick={onRetry}
            style={styles.retryButton}
          >
            Try Again
          </button>
        )}
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={styles.dismissButton}
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

// Styles
const styles = {
  // Loading States
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
  },
  
  containerSmall: { padding: '20px 10px' },
  containerMedium: { padding: '40px 20px' },
  containerLarge: { padding: '80px 40px' },

  spinner: {
    borderRadius: '50%',
    border: '3px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
    borderTop: '3px solid var(--accent-blue, #6366f1)',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },

  spinnerSmall: { width: '24px', height: '24px' },
  spinnerMedium: { width: '40px', height: '40px' },
  spinnerLarge: { width: '60px', height: '60px' },

  spinnerInner: {},

  loadingText: {
    fontSize: '16px',
    color: 'var(--text-secondary, rgba(255, 255, 255, 0.7))',
    margin: 0,
    textAlign: 'center' as const,
  },

  // Skeleton Loader
  skeletonContainer: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },

  skeletonItem: {
    height: '20px',
    background: 'linear-gradient(90deg, var(--surface-2, rgba(255, 255, 255, 0.04)) 25%, var(--surface-3, rgba(255, 255, 255, 0.06)) 50%, var(--surface-2, rgba(255, 255, 255, 0.04)) 75%)',
    backgroundSize: '200% 100%',
    borderRadius: '6px',
    animation: 'shimmer 1.5s infinite',
  },

  // Dots Loader
  dotsContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },

  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--accent-blue, #6366f1)',
    animation: 'bounce 1.4s infinite both',
  },

  // Empty State
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center' as const,
  },

  emptyIcon: {
    fontSize: '48px',
    marginBottom: '24px',
    opacity: 0.6,
  },

  emptyTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: 'var(--text-primary, #ffffff)',
    margin: '0 0 12px 0',
  },

  emptyMessage: {
    fontSize: '16px',
    color: 'var(--text-secondary, rgba(255, 255, 255, 0.7))',
    margin: '0 0 32px 0',
    maxWidth: '400px',
    lineHeight: '1.5',
  },

  emptyAction: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 600,
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, var(--accent-blue, #6366f1), var(--accent-purple, #8b5cf6))',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  // Error State
  errorContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center' as const,
  },

  errorIcon: {
    fontSize: '48px',
    marginBottom: '24px',
    opacity: 0.8,
  },

  errorTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: 'var(--color-error, #ef4444)',
    margin: '0 0 12px 0',
  },

  errorMessage: {
    fontSize: '16px',
    color: 'var(--text-secondary, rgba(255, 255, 255, 0.7))',
    margin: '0 0 16px 0',
    maxWidth: '400px',
    lineHeight: '1.5',
  },

  errorDetails: {
    fontSize: '14px',
    color: 'var(--text-tertiary, rgba(255, 255, 255, 0.5))',
    margin: '0 0 24px 0',
    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
    background: 'var(--surface-1, rgba(255, 255, 255, 0.02))',
    padding: '12px 16px',
    borderRadius: '6px',
    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
    maxWidth: '500px',
  },

  technicalDetails: {
    marginTop: '16px',
    marginBottom: '24px',
    maxWidth: '500px',
    textAlign: 'left' as const,
  },

  detailsSummary: {
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-secondary, rgba(255, 255, 255, 0.7))',
    marginBottom: '8px',
  },

  errorStack: {
    fontSize: '12px',
    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
    color: 'var(--text-tertiary, rgba(255, 255, 255, 0.5))',
    background: 'var(--surface-0, #0a0a0f)',
    padding: '16px',
    borderRadius: '6px',
    overflow: 'auto',
    maxHeight: '200px',
    margin: '8px 0 0 0',
    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
  },

  errorActions: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
  },

  retryButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 600,
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, var(--accent-blue, #6366f1), var(--accent-purple, #8b5cf6))',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  dismissButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 600,
    borderRadius: '8px',
    border: '1px solid var(--border-default, rgba(255, 255, 255, 0.1))',
    background: 'var(--surface-3, rgba(255, 255, 255, 0.06))',
    color: 'var(--text-primary, #ffffff)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};

// Add CSS animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    
    @keyframes bounce {
      0%, 80%, 100% { 
        transform: scale(0);
        opacity: 0.5;
      }
      40% { 
        transform: scale(1);
        opacity: 1;
      }
    }
    
    /* Stagger the dot animations */
    .dots-container .dot:nth-child(1) { animation-delay: -0.32s; }
    .dots-container .dot:nth-child(2) { animation-delay: -0.16s; }
    .dots-container .dot:nth-child(3) { animation-delay: 0s; }
  `;
  document.head.appendChild(style);
}