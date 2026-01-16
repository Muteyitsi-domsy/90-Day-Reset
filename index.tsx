
import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

/**
 * Sanitizes sensitive data before sending to Sentry
 * Removes: emails, journal text, passwords, tokens, user details
 */
function sanitizeSentryData(data: any): any {
  if (!data) return data;

  // Convert to string for pattern matching
  const dataStr = JSON.stringify(data);

  // Pattern replacements
  const sanitized = dataStr
    // Remove email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]')
    // Remove potential passwords (password fields)
    .replace(/"password"\s*:\s*"[^"]*"/gi, '"password":"[REDACTED]"')
    // Remove API keys and tokens
    .replace(/(apiKey|api_key|token|accessToken|auth|authorization)\s*:\s*"[^"]*"/gi, '$1:"[REDACTED]"')
    // Remove Firebase UIDs (28 character alphanumeric)
    .replace(/\b[A-Za-z0-9]{28}\b/g, '[UID_REDACTED]')
    // Remove potential journal content (rawText field)
    .replace(/"rawText"\s*:\s*"[^"]*"/gi, '"rawText":"[CONTENT_REDACTED]"')
    // Remove mood notes
    .replace(/"notes"\s*:\s*"[^"]*"/gi, '"notes":"[REDACTED]"')
    // Remove manifesto content
    .replace(/"idealSelfManifesto"\s*:\s*"[^"]*"/gi, '"idealSelfManifesto":"[REDACTED]"');

  try {
    return JSON.parse(sanitized);
  } catch {
    return '[SANITIZATION_ERROR]';
  }
}

/**
 * Scrubs sensitive URLs and query parameters
 */
function sanitizeUrl(url: string): string {
  if (!url) return url;

  try {
    const urlObj = new URL(url);

    // Remove sensitive query parameters
    const sensitiveParams = ['token', 'key', 'auth', 'password', 'email', 'uid'];
    sensitiveParams.forEach(param => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '[REDACTED]');
      }
    });

    return urlObj.toString();
  } catch {
    // If URL parsing fails, just return sanitized string
    return url.replace(/[?&](token|key|auth|password|email|uid)=[^&]*/gi, '$1=[REDACTED]');
  }
}

// Initialize Sentry for error tracking and performance monitoring
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE, // 'development' or 'production'

    // Performance Monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      // Capture console errors automatically
      Sentry.consoleLoggingIntegration({ levels: ['error'] }),
    ],

    // Performance trace sampling
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,

    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Enable structured logging
    enableLogs: true,

    // Don't send errors in development (optional - remove if you want dev errors too)
    enabled: import.meta.env.MODE === 'production',

    // SECURITY: Sanitize data before sending to Sentry
    beforeSend(event, hint) {
      // Sanitize user data
      if (event.user) {
        event.user = {
          id: event.user.id ? '[REDACTED]' : undefined,
          email: event.user.email ? '[EMAIL_REDACTED]' : undefined,
          username: event.user.username ? '[REDACTED]' : undefined,
        };
      }

      // Sanitize request URLs
      if (event.request?.url) {
        event.request.url = sanitizeUrl(event.request.url);
      }

      // Sanitize breadcrumb URLs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.data?.url) {
            breadcrumb.data.url = sanitizeUrl(breadcrumb.data.url);
          }
          // Sanitize any sensitive data in breadcrumb
          if (breadcrumb.data) {
            breadcrumb.data = sanitizeSentryData(breadcrumb.data);
          }
          return breadcrumb;
        });
      }

      // Sanitize exception values and stack traces
      if (event.exception?.values) {
        event.exception.values = event.exception.values.map(exception => {
          if (exception.value) {
            // Remove email addresses from error messages
            exception.value = exception.value.replace(
              /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
              '[EMAIL_REDACTED]'
            );
          }
          return exception;
        });
      }

      // Sanitize extra data
      if (event.extra) {
        event.extra = sanitizeSentryData(event.extra);
      }

      // Sanitize context data
      if (event.contexts) {
        event.contexts = sanitizeSentryData(event.contexts);
      }

      return event;
    },

    // SECURITY: Sanitize breadcrumbs before recording
    beforeBreadcrumb(breadcrumb, hint) {
      // Don't record console breadcrumbs that might contain sensitive data
      if (breadcrumb.category === 'console') {
        if (breadcrumb.message) {
          breadcrumb.message = breadcrumb.message.replace(
            /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
            '[EMAIL_REDACTED]'
          );
        }
      }

      // Sanitize fetch/XHR breadcrumbs
      if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
        if (breadcrumb.data?.url) {
          breadcrumb.data.url = sanitizeUrl(breadcrumb.data.url);
        }
      }

      // Remove localStorage/sessionStorage breadcrumbs entirely (sensitive data)
      if (breadcrumb.category === 'storage') {
        return null; // Don't record storage events
      }

      return breadcrumb;
    },
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
