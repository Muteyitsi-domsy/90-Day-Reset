import React from 'react';

interface SuspendedAccountScreenProps {
  suspendedDate?: string;
  userEmail?: string;
}

const SuspendedAccountScreen: React.FC<SuspendedAccountScreenProps> = ({
  suspendedDate,
  userEmail,
}) => {
  const formattedDate = suspendedDate
    ? new Date(suspendedDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'recently';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--bg-from)] to-[var(--bg-to)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[var(--card-bg)] backdrop-blur-sm rounded-2xl shadow-xl border border-[var(--card-border)] p-8 text-center">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-10 h-10 text-amber-600 dark:text-amber-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">
          Account Paused for Your Safety
        </h1>

        {/* Message */}
        <p className="text-[var(--text-secondary)] mb-6 leading-relaxed">
          We noticed some concerning entries and want to make sure you're okay.
          Your account was paused on {formattedDate} to give you space to seek
          support.
        </p>

        {/* Crisis Resources Box */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
          <h2 className="font-semibold text-red-700 dark:text-red-300 mb-3">
            If you're in crisis, please reach out:
          </h2>
          <div className="space-y-2 text-sm">
            <a
              href="tel:988"
              className="block text-red-600 dark:text-red-400 hover:underline font-medium"
            >
              988 - Suicide & Crisis Lifeline (US)
            </a>
            <a
              href="sms:741741&body=HOME"
              className="block text-red-600 dark:text-red-400 hover:underline font-medium"
            >
              Text HOME to 741741 - Crisis Text Line
            </a>
            <a
              href="https://findahelpline.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-red-600 dark:text-red-400 hover:underline font-medium"
            >
              findahelpline.com - International Resources
            </a>
          </div>
        </div>

        {/* Unlock Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
          <h2 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">
            To Unlock Your Account
          </h2>
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-3">
            Please contact our support team. We'll help you get back on your
            journey when you're ready.
          </p>
          <a
            href="mailto:support@90dayreset.app?subject=Account%20Unlock%20Request&body=Please%20unlock%20my%20account.%20I%20am%20ready%20to%20continue%20my%20journey.%0A%0AEmail%3A%20{email}"
            className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Contact Support
          </a>
        </div>

        {/* Reassurance */}
        <p className="text-sm text-[var(--text-secondary)] italic">
          Your journal entries are safe and will be here when you return. Take
          care of yourself first.
        </p>

        {/* Account Info */}
        {userEmail && (
          <p className="mt-4 text-xs text-gray-400">
            Account: {userEmail}
          </p>
        )}
      </div>
    </div>
  );
};

export default SuspendedAccountScreen;
