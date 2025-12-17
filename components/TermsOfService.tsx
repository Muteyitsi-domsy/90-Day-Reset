interface TermsOfServiceProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TermsOfService({ isOpen, onClose }: TermsOfServiceProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>

        <div className="terms-content">
          <h1 className="modal-title">Terms of Service</h1>
          <p className="text-sm text-gray-500 mb-6">Last Updated: December 2024</p>

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
            <p>
              The App uses Google Gemini AI to analyze your journal entries and generate insights. Please note:
            </p>
            <ul>
              <li>AI-generated insights are suggestions, not professional advice</li>
              <li>The App is not a substitute for professional mental health care</li>
              <li>AI responses may not always be accurate or appropriate</li>
              <li>You should use your own judgment when considering AI insights</li>
            </ul>
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
            <h2>11. Third-Party Services</h2>
            <p>
              The App integrates with third-party services (Firebase, Google Gemini AI, Sentry). Your use of these
              services is subject to their respective terms and policies.
            </p>
          </div>

          <div className="terms-section">
            <h2>12. Termination</h2>
            <p>
              You may stop using the App at any time. You may delete your account and all data via the Menu.
              We reserve the right to suspend or terminate accounts that violate these Terms.
            </p>
          </div>

          <div className="terms-section">
            <h2>13. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the App after changes constitutes
              acceptance of the new Terms. Material changes will be communicated via the App or email.
            </p>
          </div>

          <div className="terms-section">
            <h2>14. Governing Law</h2>
            <p>
              These Terms are governed by the laws of [Your Jurisdiction]. Any disputes shall be resolved in
              the courts of [Your Jurisdiction].
            </p>
          </div>

          <div className="terms-section">
            <h2>15. Contact</h2>
            <p>
              For questions about these Terms, please contact us through the app's Contact page or via the Menu.
            </p>
          </div>

          <div className="terms-section">
            <p className="text-center text-sm text-gray-500 mt-8">
              By using this App, you acknowledge that you have read and understood these Terms of Service.
            </p>
          </div>
        </div>

        <style>{`
          .terms-content {
            max-height: 70vh;
            overflow-y: auto;
            padding: 1rem;
          }

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
            color: var(--text-muted);
            line-height: 1.6;
            margin-bottom: 0.75rem;
          }

          .terms-section ul {
            list-style: disc;
            margin-left: 1.5rem;
            color: var(--text-muted);
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
        `}</style>
      </div>
    </div>
  );
}
