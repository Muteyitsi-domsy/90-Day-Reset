interface TermsOfServiceProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TermsOfService({ isOpen, onClose }: TermsOfServiceProps) {
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
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
        <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-[var(--card-bg)] rounded-2xl shadow-2xl overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
          {/* Header with Close Button */}
          <div className="sticky top-0 z-10 bg-[var(--card-bg)] border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-light text-[var(--text-primary)]">Terms of Service</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Last Updated: March 15, 2026</p>
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
          <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6 terms-content">

          <div className="terms-section">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using 90-Day Identity Reset Journal ("the App"), you accept and agree to be bound by
              these Terms of Service. If you do not agree, please do not use the App.
            </p>
          </div>

          <div className="terms-section">
            <h2>2. Description of Service</h2>
            <p>
              The App provides a 90-day guided journaling experience designed for personal identity transformation.
              Features include:
            </p>
            <ul>
              <li>Daily journaling prompts tailored to your personal arc</li>
              <li>AI-powered insights and reflections using Google Gemini</li>
              <li>Weekly and monthly summary reports</li>
              <li>Optional cloud backup and multi-device access</li>
              <li>Local storage option for complete privacy</li>
            </ul>
          </div>

          <div className="terms-section">
            <h2>3. User Accounts</h2>
            <h3>Account Creation (Optional)</h3>
            <ul>
              <li>Creating an account is entirely optional</li>
              <li>You may use the App without an account (local storage mode)</li>
              <li>If you create an account, you must provide a valid email and password</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials</li>
              <li>You are responsible for all activities under your account</li>
            </ul>
          </div>

          <div className="terms-section">
            <h2>4. User Conduct</h2>
            <p>You agree NOT to:</p>
            <ul>
              <li>Use the App for any illegal purpose</li>
              <li>Attempt to gain unauthorized access to the service or other users' accounts</li>
              <li>Interfere with or disrupt the App's functionality</li>
              <li>Reverse engineer, decompile, or attempt to extract the source code</li>
              <li>Use automated systems to access the App without permission</li>
            </ul>
          </div>

          <div className="terms-section">
            <h2>5. Content and Intellectual Property</h2>
            <h3>Your Content</h3>
            <p>
              You retain all rights to the journal entries and content you create ("Your Content"). By using cloud backup,
              you grant us a license to store and process Your Content solely to provide the service.
            </p>
            <h3>App Content</h3>
            <p>
              The App's design, prompts, code, and features are protected by copyright and other intellectual property laws.
              You may not copy, modify, or distribute any part of the App without permission.
            </p>
          </div>

          <div className="terms-section">
            <h2>6. AI-Generated Content</h2>
            <p className="warning">
              <strong>IMPORTANT: AI CAN MAKE MISTAKES AND IS NOT ALWAYS ACCURATE</strong>
            </p>
            <p>
              The App uses Google Gemini AI to analyze your journal entries and generate insights, reports, and prompts.
            </p>
            <ul>
              <li><strong>Verify all AI content:</strong> AI-generated insights, reports, and suggestions should be independently verified before relying on them</li>
              <li><strong>Not professional advice:</strong> AI content is NOT medical, psychological, therapeutic, or professional advice of any kind</li>
              <li><strong>Accuracy not guaranteed:</strong> AI may contain errors, inaccuracies, or inappropriate suggestions</li>
              <li><strong>Interpretation errors:</strong> AI may misinterpret context, tone, cultural nuances, or meaning</li>
              <li><strong>Your responsibility:</strong> You are solely responsible for evaluating and acting on AI-generated content</li>
              <li><strong>Optional feature:</strong> You can disable AI analysis in Settings</li>
            </ul>
            <p className="note">
              AI-generated content is provided "AS IS" without warranty. We make no guarantees about accuracy, completeness, or appropriateness of AI insights.
            </p>
          </div>

          <div className="terms-section">
            <h2>7. Mental Health Disclaimer</h2>
            <p className="warning">
              <strong>IMPORTANT:</strong> This App is a personal development tool, NOT a mental health service.
            </p>
            <ul>
              <li>The App does not provide medical, psychological, or therapeutic advice</li>
              <li>If you are experiencing a mental health crisis, please contact emergency services or a crisis hotline immediately</li>
              <li>The App includes crisis detection features, but these are not infallible</li>
              <li>Do not rely solely on the App for mental health support</li>
            </ul>
          </div>

          <div className="terms-section">
            <h2>8. Data and Privacy</h2>
            <p>
              Your use of the App is also governed by our Privacy Policy. Key points:
            </p>
            <ul>
              <li>Local storage mode: Data stays on your device only</li>
              <li>Cloud backup mode: Data stored securely in Firebase (Google Cloud)</li>
              <li>You can export or delete your data at any time</li>
              <li>See our Privacy Policy for complete details</li>
            </ul>
          </div>

          <div className="terms-section">
            <h2>9. Service Availability</h2>
            <p>
              We strive to keep the App available, but we do not guarantee:
            </p>
            <ul>
              <li>Uninterrupted or error-free operation</li>
              <li>That all features will work on all devices</li>
              <li>That the service will be available indefinitely</li>
            </ul>
            <p>
              We reserve the right to modify, suspend, or discontinue the App at any time with reasonable notice.
            </p>
          </div>

          <div className="terms-section">
            <h2>10. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW:
            </p>
            <ul>
              <li>The App is provided "AS IS" without warranties of any kind</li>
              <li>We are not liable for any indirect, incidental, or consequential damages</li>
              <li>Our total liability shall not exceed the amount you paid to use the App (if applicable)</li>
              <li>We are not responsible for data loss (please maintain backups)</li>
            </ul>
          </div>

          <div className="terms-section">
            <h2>11. Subscriptions &amp; Payments</h2>
            <h3>Subscription Plans</h3>
            <p>The App offers three access plans, all processed through Google Play (Android):</p>
            <ul>
              <li><strong>Monthly:</strong> Recurring monthly subscription. Cancel anytime; access continues until the end of the paid billing period.</li>
              <li><strong>Annual:</strong> Recurring annual subscription. Provides 12 months of continuous access. See asterisk note below regarding journey count.</li>
              <li><strong>90-Day Journey:</strong> A one-time prepaid subscription valid for 90 days from the date of purchase. Does not auto-renew. Access expires at the end of the 90-day period.</li>
            </ul>

            <h3>Annual Plan — Journey Count</h3>
            <p>
              The Annual plan provides 12 months of continuous access. The number of complete 90-day journeys you can undertake within that period depends on your usage, including any pauses or journey restarts. Annual subscribers may complete <strong>up to 4</strong> consecutive journeys within a 12-month period; the actual number may be fewer depending on individual usage patterns. The Annual plan does not guarantee exactly 4 journeys.
            </p>

            <h3>Journey Pause Feature</h3>
            <p>
              The ability to pause your journey is available to <strong>Monthly and Annual subscribers only</strong> and is offered as a flexibility benefit of those recurring plans. The 90-Day Journey (one-time prepaid plan) does not include the pause feature. This is because pausing suspends access to time-sensitive features while your access period continues to count down, which would be inconsistent with the fixed-term nature of the one-time purchase.
            </p>

            <h3>Payment Processing</h3>
            <p>
              All payments are processed by <strong>Google Play</strong> (for Android users). We use <strong>RevenueCat</strong> as our subscription management platform to verify entitlements and manage access. RevenueCat receives purchase metadata (subscription status, product ID, platform) but does not store your full payment details. Your payment information is handled directly by Google Play under their terms.
            </p>
            <ul>
              <li>RevenueCat Privacy Policy: <strong>revenuecat.com/privacy</strong></li>
              <li>Google Play Terms: <strong>play.google.com/about/play-terms</strong></li>
            </ul>

            <h3>Cancellations &amp; Refunds</h3>
            <ul>
              <li>Subscriptions (Monthly and Annual) can be cancelled at any time through your Google Play account. Access continues until the end of the current billing period.</li>
              <li>The 90-Day Journey plan does not auto-renew and requires no cancellation.</li>
              <li>Refund requests are subject to Google Play's refund policies. We do not process refunds directly.</li>
              <li>We do not offer partial refunds for unused portions of a subscription period.</li>
            </ul>

            <h3>Price Changes</h3>
            <p>
              We reserve the right to change subscription prices with reasonable advance notice. Price changes will not affect your current billing period. Continued use after a price change constitutes acceptance of the new price.
            </p>
          </div>

          <div className="terms-section">
            <h2>12. Third-Party Services</h2>
            <p>
              The App integrates with third-party services including Firebase, Google Gemini AI, RevenueCat, and Sentry. Your use of these services is subject to their respective terms and policies. See our Privacy Policy for the full list of third-party processors.
            </p>
          </div>

          <div className="terms-section">
            <h2>13. Termination</h2>
            <p>
              You may stop using the App at any time. You may delete your account and all data via the Menu.
              We reserve the right to suspend or terminate accounts that violate these Terms.
            </p>
          </div>

          <div className="terms-section">
            <h2>14. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the App after changes constitutes
              acceptance of the new Terms. Material changes will be communicated via the App or email.
            </p>
          </div>

          <div className="terms-section">
            <h2>15. Governing Law & Dispute Resolution</h2>
            <p>
              These Terms are governed by the laws of the Republic of Kenya.
            </p>
            <h3>Arbitration</h3>
            <ul>
              <li>Disputes shall be resolved through binding arbitration</li>
              <li>Arbitration conducted under the <strong>Arbitration Act, 1995 (Cap 49, Laws of Kenya)</strong></li>
              <li>Administered by the <strong>Nairobi Centre for International Arbitration (NCIA)</strong></li>
              <li>Seat of arbitration: <strong>Nairobi, Kenya</strong></li>
              <li>Language of proceedings: <strong>English</strong></li>
            </ul>
            <h3>USA Users</h3>
            <p>
              For US residents, applicable federal and state consumer protection laws also apply. You agree to resolve disputes on an individual basis and waive any right to participate in class action lawsuits.
            </p>
          </div>

          <div className="terms-section">
            <h2>16. Contact</h2>
            <p>
              For questions about these Terms, please contact us:
            </p>
            <ul>
              <li><strong>General inquiries:</strong> <a href="mailto:support@renew90.app" className="text-[var(--accent-primary)] hover:underline">support@renew90.app</a></li>
              <li><strong>Administration:</strong> <a href="mailto:admin@renew90.app" className="text-[var(--accent-primary)] hover:underline">admin@renew90.app</a></li>
            </ul>
            <p>
              You can also reach us through the app's Contact page in the Menu.
            </p>
          </div>

          <div className="terms-section">
            <p className="text-center text-sm text-gray-500 mt-8">
              By using this App, you acknowledge that you have read and understood these Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>

    <style>{`
      .terms-section {
        margin-bottom: 2rem;
      }

      .terms-section h2 {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 0.75rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid var(--accent-color);
      }

      .terms-section h3 {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 1rem 0 0.5rem 0;
      }

      .terms-section p {
        color: var(--text-secondary);
        line-height: 1.6;
        margin-bottom: 0.75rem;
      }

      .terms-section ul {
        list-style: disc;
        margin-left: 1.5rem;
        color: var(--text-secondary);
        line-height: 1.8;
      }

      .terms-section ul li {
        margin-bottom: 0.5rem;
      }

      .terms-section .warning {
        background: rgba(239, 68, 68, 0.1);
        border-left: 4px solid #ef4444;
        padding: 0.75rem;
        margin: 1rem 0;
        border-radius: 4px;
        font-weight: 500;
      }

      .terms-section .note {
        background: rgba(99, 102, 241, 0.1);
        border-left: 4px solid var(--accent-color);
        padding: 0.75rem;
        margin: 1rem 0;
        border-radius: 4px;
      }
    `}</style>
  </>
  );
}
