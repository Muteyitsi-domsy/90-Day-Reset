interface PrivacyPolicyProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyPolicy({ isOpen, onClose }: PrivacyPolicyProps) {
  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
        <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-[var(--card-bg)] rounded-2xl shadow-2xl overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
          {/* Header with Close Button */}
          <div className="sticky top-0 z-10 bg-[var(--card-bg)] border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-light text-[var(--text-primary)]">Privacy Policy</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Last Updated: December 2024</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
              aria-label="Close"
            >
              <svg
                className="w-6 h-6 text-gray-500 group-hover:text-[var(--text-primary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6 privacy-policy-content">

          <div className="policy-section">
            <h2>1. Introduction</h2>
            <p>
              Welcome to 90-Day Identity Reset Journal. We respect your privacy and are committed to protecting your personal data.
              This policy explains how we handle your information.
            </p>
          </div>

          <div className="policy-section">
            <h2>2. Data Collection</h2>
            <h3>What We Collect:</h3>
            <ul>
              <li><strong>Email address</strong> (only if you create an account)</li>
              <li><strong>Journal entries</strong> and reflections you write</li>
              <li><strong>App settings</strong> and preferences</li>
              <li><strong>Usage data</strong> for error monitoring (via Sentry)</li>
            </ul>
            <p className="note">
              <strong>Important:</strong> Creating an account is <strong>completely optional</strong>. You can use the app
              entirely offline with local storage without providing any personal information.
            </p>
          </div>

          <div className="policy-section">
            <h2>3. How We Store Your Data</h2>
            <h3>Two Storage Options:</h3>
            <ul>
              <li><strong>Local Storage (Default):</strong> Data stored only on your device. Private and never leaves your browser.</li>
              <li><strong>Cloud Backup (Optional):</strong> If you create an account, data is stored in Google Cloud Firestore with encryption.</li>
            </ul>
            <p>Security measures:</p>
            <ul>
              <li>All data encrypted in transit (HTTPS)</li>
              <li>Cloud data encrypted at rest</li>
              <li>Access protected by email/password authentication</li>
            </ul>
          </div>

          <div className="policy-section">
            <h2>4. How We Use Your Data</h2>
            <ul>
              <li>To provide the journaling experience and save your entries</li>
              <li>To analyze entries using Google Gemini AI for insights and reflections</li>
              <li>To improve the app (using aggregate, anonymized data only)</li>
              <li>To send password reset emails (if requested)</li>
            </ul>
            <p className="highlight">
              We do <strong>NOT</strong> sell, rent, or share your data with third parties for marketing purposes.
            </p>
          </div>

          <div className="policy-section">
            <h2>5. Third-Party Services</h2>
            <ul>
              <li><strong>Firebase (Google):</strong> Cloud storage, authentication, and hosting</li>
              <li><strong>Google Gemini AI:</strong> Analyzes journal entries to generate insights (processed securely, not used for AI training)</li>
              <li><strong>Sentry:</strong> Error monitoring and performance tracking (no journal content logged)</li>
              <li><strong>Vercel:</strong> Application hosting</li>
            </ul>
          </div>

          <div className="policy-section">
            <h2>6. Admin Access</h2>
            <p>
              If you use cloud backup, project administrators can technically access data for debugging and support purposes.
              However:
            </p>
            <ul>
              <li>We do not actively read your journal entries</li>
              <li>Access is only used for legitimate support and technical purposes</li>
              <li>All admin access is logged and monitored</li>
            </ul>
            <p className="note">
              If you prefer complete privacy, use the app without creating an account (local storage only).
            </p>
          </div>

          <div className="policy-section">
            <h2>7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li><strong>Export:</strong> Download all your data as JSON (Menu → Data & Privacy → Download All Data)</li>
              <li><strong>Delete:</strong> Permanently delete your account and all data (Menu → Data & Privacy → Delete All Data)</li>
              <li><strong>Access:</strong> View all your stored data within the app</li>
              <li><strong>Opt-out:</strong> Use the app entirely offline without an account</li>
            </ul>
          </div>

          <div className="policy-section">
            <h2>8. Data Retention</h2>
            <ul>
              <li>Data stored as long as your account is active</li>
              <li>Deleted data removed immediately from production database</li>
              <li>Firebase backups retained for up to 30 days, then permanently deleted</li>
              <li>Local storage data can be cleared via browser settings</li>
            </ul>
          </div>

          <div className="policy-section">
            <h2>9. Children's Privacy</h2>
            <p>
              This app is not intended for children under 13. We do not knowingly collect data from children under 13.
            </p>
          </div>

          <div className="policy-section">
            <h2>10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify users of material changes via the app
              or email (if you have an account).
            </p>
          </div>

          <div className="policy-section">
            <h2>11. Contact Us</h2>
            <p>
              For privacy concerns or questions, please contact us through the app's Contact page or via the Menu.
            </p>
          </div>
        </div>
      </div>
    </div>

    <style>{`
      .policy-section {
        margin-bottom: 2rem;
      }

      .policy-section h2 {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 0.75rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid var(--accent-color);
      }

      .policy-section h3 {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 1rem 0 0.5rem 0;
      }

      .policy-section p {
        color: var(--text-secondary);
        line-height: 1.6;
        margin-bottom: 0.75rem;
      }

      .policy-section ul {
        list-style: disc;
        margin-left: 1.5rem;
        color: var(--text-secondary);
        line-height: 1.8;
      }

      .policy-section ul li {
        margin-bottom: 0.5rem;
      }

      .policy-section .note {
        background: rgba(99, 102, 241, 0.1);
        border-left: 4px solid var(--accent-color);
        padding: 0.75rem;
        margin: 1rem 0;
        border-radius: 4px;
      }

      .policy-section .highlight {
        background: rgba(16, 185, 129, 0.1);
        border-left: 4px solid #10b981;
        padding: 0.75rem;
        margin: 1rem 0;
        border-radius: 4px;
        font-weight: 500;
      }
    `}</style>
  </>
  );
}
