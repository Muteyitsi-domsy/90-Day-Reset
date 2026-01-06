interface ContactUsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactUs({ isOpen, onClose }: ContactUsProps) {
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
        <div className="relative w-full max-w-3xl max-h-[90vh] mx-4 bg-[var(--card-bg)] rounded-2xl shadow-2xl overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
          {/* Header with Close Button */}
          <div className="sticky top-0 z-10 bg-[var(--card-bg)] border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-light text-[var(--text-primary)]">Contact Us</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">We're here to help</p>
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
          <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6 contact-content">

          <div className="contact-intro">
            <p>
              We'd love to hear from you! Whether you have questions, feedback, or need support,
              please don't hesitate to reach out.
            </p>
          </div>

          <div className="contact-methods">
            <div className="contact-method">
              <div className="icon">📧</div>
              <h3>Email</h3>
              <p className="method-description">
                For general inquiries, support, or feedback
              </p>
              <a href="mailto:support@identityreset.app" className="contact-link">
                support@identityreset.app
              </a>
              <p className="response-time">We typically respond within 24-48 hours</p>
            </div>

            <div className="contact-method">
              <div className="icon">🔒</div>
              <h3>Privacy Concerns</h3>
              <p className="method-description">
                For data privacy or security questions
              </p>
              <a href="mailto:privacy@identityreset.app" className="contact-link">
                privacy@identityreset.app
              </a>
            </div>

            <div className="contact-method">
              <div className="icon">🐛</div>
              <h3>Bug Reports</h3>
              <p className="method-description">
                Found a bug? Help us improve the app!
              </p>
              <p className="method-info">
                Please include:
              </p>
              <ul className="bug-info">
                <li>What you were doing when the bug occurred</li>
                <li>Your device and browser information</li>
                <li>Screenshots if possible</li>
              </ul>
              <a href="mailto:bugs@identityreset.app" className="contact-link">
                bugs@identityreset.app
              </a>
            </div>
          </div>

          <div className="contact-note">
            <h3>Emergency Resources</h3>
            <p>
              If you're experiencing a mental health crisis, please contact:
            </p>
            <ul>
              <li><strong>Emergency Services:</strong> 911 (US) or your local emergency number</li>
              <li><strong>National Suicide Prevention Lifeline (US):</strong> 988</li>
              <li><strong>Crisis Text Line (US):</strong> Text HOME to 741741</li>
              <li><strong>International Association for Suicide Prevention:</strong> <a href="https://www.iasp.info/resources/Crisis_Centres/" target="_blank" rel="noopener noreferrer">Find resources worldwide</a></li>
            </ul>
            <p className="warning-text">
              This app is not a substitute for professional mental health care.
            </p>
          </div>
        </div>
      </div>
    </div>

    <style>{`
      .contact-intro {
        color: var(--text-secondary);
        margin-bottom: 2rem;
        text-align: center;
        font-size: 1rem;
        line-height: 1.6;
      }

      .contact-methods {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        margin-bottom: 2rem;
      }

      .contact-method {
        padding: 1.5rem;
        background: var(--card-bg-secondary);
        border: 1px solid var(--card-border);
        border-radius: 12px;
        text-align: center;
      }

      .contact-method .icon {
        font-size: 2.5rem;
        margin-bottom: 0.5rem;
      }

      .contact-method h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 0.5rem;
      }

      .method-description {
        color: var(--text-secondary);
        margin-bottom: 1rem;
        font-size: 0.95rem;
      }

      .contact-link {
        display: inline-block;
        color: var(--accent-primary);
        text-decoration: none;
        font-weight: 500;
        padding: 0.5rem 1rem;
        background: rgba(99, 102, 241, 0.1);
        border-radius: 8px;
        margin: 0.5rem 0;
        transition: all 0.2s;
      }

      .contact-link:hover {
        background: rgba(99, 102, 241, 0.2);
        transform: translateY(-1px);
      }

      .response-time {
        font-size: 0.85rem;
        color: var(--text-secondary);
        margin-top: 0.5rem;
        font-style: italic;
      }

      .method-info {
        font-size: 0.9rem;
        color: var(--text-secondary);
        margin-top: 1rem;
        margin-bottom: 0.5rem;
      }

      .bug-info {
        list-style: disc;
        text-align: left;
        margin-left: 2rem;
        color: var(--text-secondary);
        font-size: 0.85rem;
        line-height: 1.6;
      }

      .bug-info li {
        margin-bottom: 0.25rem;
      }

      .contact-note {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 8px;
        padding: 1.5rem;
        margin-top: 2rem;
      }

      .contact-note h3 {
        color: #ef4444;
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 0.75rem;
      }

      .contact-note p {
        color: var(--text-secondary);
        margin-bottom: 0.75rem;
        font-size: 0.95rem;
      }

      .contact-note ul {
        list-style: disc;
        margin-left: 1.5rem;
        color: var(--text-secondary);
        line-height: 1.8;
        font-size: 0.9rem;
      }

      .contact-note ul li {
        margin-bottom: 0.5rem;
      }

      .contact-note a {
        color: var(--accent-primary);
        text-decoration: underline;
      }

      .warning-text {
        font-weight: 600;
        color: #ef4444;
        margin-top: 1rem;
      }
    `}</style>
  </>
  );
}
