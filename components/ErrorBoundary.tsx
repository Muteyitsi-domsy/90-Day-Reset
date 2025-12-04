import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { errorLogger } from '../utils/errorLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Store error details in state
    this.setState({
      error,
      errorInfo
    });

    // Log to your error tracking service here
    // Example: Sentry.captureException(error, { extra: errorInfo });
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService(error: Error, errorInfo: ErrorInfo): void {
    // Send to Sentry for real-time monitoring
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
        type: 'ErrorBoundary'
      }
    });

    // Also log locally for offline review
    errorLogger.log(error, {
      componentStack: errorInfo.componentStack,
      type: 'ErrorBoundary'
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI or use provided fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--app-bg)] p-4">
          <div className="max-w-md w-full bg-[var(--card-bg)] rounded-2xl shadow-xl p-8 border border-[var(--card-border)]">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                Oops! Something went wrong
              </h1>
              <p className="text-[var(--text-secondary)] mb-6">
                We encountered an unexpected error. Your data is safe, but the app needs to restart.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-6 text-left">
                  <summary className="cursor-pointer text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-2">
                    Error Details (Development Only)
                  </summary>
                  <div className="bg-[var(--card-bg-secondary)] p-4 rounded-lg text-xs overflow-auto max-h-48">
                    <p className="text-red-500 font-mono mb-2">{this.state.error.message}</p>
                    <pre className="text-[var(--text-secondary)] whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  </div>
                </details>
              )}

              <div className="flex flex-col gap-3">
                <button
                  onClick={this.handleReset}
                  className="w-full px-6 py-3 bg-[var(--accent-primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-6 py-3 bg-[var(--button-secondary-bg)] text-[var(--text-primary)] rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Reload App
                </button>
              </div>

              <p className="text-xs text-[var(--text-secondary)] mt-6">
                If this problem persists, please contact support.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
