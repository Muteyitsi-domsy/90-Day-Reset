import React from 'react';
import * as Sentry from '@sentry/react';

/**
 * Sentry Test Component
 *
 * This component helps you verify Sentry is working correctly.
 * Add it to your app temporarily during development, then remove it.
 *
 * Usage:
 * 1. Import: import SentryTest from './components/SentryTest';
 * 2. Add to your app: <SentryTest />
 * 3. Click the buttons to test error tracking
 * 4. Check your Sentry dashboard to see the errors
 * 5. Remove this component before production launch
 */

const SentryTest: React.FC = () => {
  const handleTestError = () => {
    // Test a caught error
    try {
      throw new Error('Test error from Sentry test button');
    } catch (error) {
      Sentry.captureException(error, {
        extra: {
          source: 'SentryTest component',
          timestamp: new Date().toISOString()
        }
      });
      alert('Test error sent to Sentry! Check your Sentry dashboard.');
    }
  };

  const handleTestCrash = () => {
    // Test an uncaught error (will be caught by ErrorBoundary)
    throw new Error('Test crash from Sentry - ErrorBoundary should catch this');
  };

  const handleTestMessage = () => {
    // Test sending a custom message
    Sentry.captureMessage('Test message from Sentry', {
      level: 'info',
      extra: {
        source: 'SentryTest component',
        timestamp: new Date().toISOString()
      }
    });
    alert('Test message sent to Sentry! Check your Sentry dashboard.');
  };

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-500 text-black p-4 rounded-lg shadow-lg max-w-sm z-50">
      <div className="mb-2">
        <strong>⚠️ Sentry Test Panel</strong>
        <p className="text-xs mt-1">Remove before production!</p>
      </div>
      <div className="flex flex-col gap-2">
        <button
          onClick={handleTestError}
          className="px-3 py-2 bg-white rounded text-sm font-medium hover:bg-gray-100"
        >
          Test Caught Error
        </button>
        <button
          onClick={handleTestCrash}
          className="px-3 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700"
        >
          Test Crash (ErrorBoundary)
        </button>
        <button
          onClick={handleTestMessage}
          className="px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
        >
          Test Message
        </button>
      </div>
    </div>
  );
};

export default SentryTest;
