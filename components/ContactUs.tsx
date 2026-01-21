import React, { useState } from 'react';

interface ContactUsProps {
  isOpen: boolean;
  onClose: () => void;
}

type ContactCategory = 'support' | 'feedback' | 'bugs' | 'privacy' | null;

// Placeholder emails - replace with actual emails
const CONTACT_EMAILS = {
  support: 'support@example.com',    // TODO: Replace with actual support email
  feedback: 'feedback@example.com',  // TODO: Replace with actual feedback email
  bugs: 'bugs@example.com',          // TODO: Replace with actual bugs email
  privacy: 'privacy@example.com',    // TODO: Replace with actual privacy email
};

const CONTACT_CONFIG = {
  support: {
    icon: '💬',
    title: 'General Support',
    description: 'Questions about using the app, your account, or general inquiries',
    subjectPrefix: '[Support Request]',
    placeholder: 'Describe what you need help with...',
    encourageScreenshot: true,
    responseTime: 'We typically respond within 24-48 hours',
  },
  feedback: {
    icon: '💡',
    title: 'Feedback & Suggestions',
    description: 'Share ideas to help us improve the app experience',
    subjectPrefix: '[Feedback]',
    placeholder: 'Share your thoughts, ideas, or suggestions...',
    encourageScreenshot: false,
    responseTime: 'We read every piece of feedback',
  },
  bugs: {
    icon: '🐛',
    title: 'Report a Bug',
    description: 'Found something broken? Help us fix it!',
    subjectPrefix: '[Bug Report]',
    placeholder: 'Describe what happened and what you expected to happen...',
    encourageScreenshot: true,
    responseTime: 'We prioritize bug fixes',
  },
  privacy: {
    icon: '🔒',
    title: 'Privacy & Data',
    description: 'Questions about your data, privacy, or security concerns',
    subjectPrefix: '[Privacy Inquiry]',
    placeholder: 'Describe your privacy-related question or concern...',
    encourageScreenshot: false,
    responseTime: 'We take privacy seriously and respond promptly',
  },
};

export function ContactUs({ isOpen, onClose }: ContactUsProps) {
  const [selectedCategory, setSelectedCategory] = useState<ContactCategory>(null);
  const [message, setMessage] = useState('');
  const [includeDeviceInfo, setIncludeDeviceInfo] = useState(true);

  if (!isOpen) return null;

  const handleCategorySelect = (category: ContactCategory) => {
    setSelectedCategory(category);
    setMessage('');
    setIncludeDeviceInfo(category === 'bugs' || category === 'support');
  };

  const handleBack = () => {
    setSelectedCategory(null);
    setMessage('');
  };

  const handleClose = () => {
    setSelectedCategory(null);
    setMessage('');
    onClose();
  };

  const getDeviceInfo = () => {
    const info = [];
    info.push(`Browser: ${navigator.userAgent}`);
    info.push(`Screen: ${window.screen.width}x${window.screen.height}`);
    info.push(`Viewport: ${window.innerWidth}x${window.innerHeight}`);
    info.push(`Platform: ${navigator.platform}`);
    info.push(`Language: ${navigator.language}`);
    info.push(`Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
    return info.join('\n');
  };

  const handleSendEmail = () => {
    if (!selectedCategory || !message.trim()) return;

    const config = CONTACT_CONFIG[selectedCategory];
    const email = CONTACT_EMAILS[selectedCategory];

    let body = message;

    if (includeDeviceInfo && (selectedCategory === 'bugs' || selectedCategory === 'support')) {
      body += '\n\n---\nDevice Information:\n' + getDeviceInfo();
    }

    const subject = encodeURIComponent(`${config.subjectPrefix} 90-Day Identity Reset`);
    const encodedBody = encodeURIComponent(body);

    window.location.href = `mailto:${email}?subject=${subject}&body=${encodedBody}`;
  };

  const renderCategoryList = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <p className="text-[var(--text-secondary)]">
          Choose the type of message you'd like to send
        </p>
      </div>

      <div className="grid gap-3">
        {(Object.keys(CONTACT_CONFIG) as Array<keyof typeof CONTACT_CONFIG>).map((key) => {
          const config = CONTACT_CONFIG[key];
          return (
            <button
              key={key}
              onClick={() => handleCategorySelect(key)}
              className="flex items-start gap-4 p-4 bg-[var(--input-bg)] hover:bg-[var(--card-bg-secondary)] border border-[var(--card-border)] rounded-xl transition-all duration-200 text-left group hover:border-[var(--accent-primary)] hover:shadow-md"
            >
              <span className="text-3xl">{config.icon}</span>
              <div className="flex-1">
                <h3 className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                  {config.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {config.description}
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-[var(--accent-primary)] transition-colors mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          );
        })}
      </div>

      {/* Emergency Resources */}
      <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
        <h3 className="font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
          <span>🚨</span> Emergency Resources
        </h3>
        <p className="text-sm text-red-600 dark:text-red-300 mb-2">
          If you're experiencing a mental health crisis:
        </p>
        <ul className="text-sm text-red-600 dark:text-red-300 space-y-1 ml-4">
          <li>• <strong>Emergency:</strong> 911 (US) or local emergency</li>
          <li>• <strong>Suicide Prevention (US):</strong> 988</li>
          <li>• <strong>Crisis Text Line (US):</strong> Text HOME to 741741</li>
        </ul>
        <p className="text-xs text-red-500 dark:text-red-400 mt-3 font-medium">
          This app is not a substitute for professional mental health care.
        </p>
      </div>
    </div>
  );

  const renderContactForm = () => {
    if (!selectedCategory) return null;

    const config = CONTACT_CONFIG[selectedCategory];
    const showScreenshotHint = config.encourageScreenshot;

    return (
      <div className="space-y-4">
        {/* Category Header */}
        <div className="text-center pb-4 border-b border-[var(--card-border)]">
          <span className="text-4xl mb-2 block">{config.icon}</span>
          <h3 className="text-xl font-medium text-[var(--text-primary)]">{config.title}</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{config.responseTime}</p>
        </div>

        {/* Message Input */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Your Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={config.placeholder}
            rows={6}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-4 text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)] transition-all resize-none"
            autoFocus
          />
        </div>

        {/* Screenshot Hint for Bugs/Support */}
        {showScreenshotHint && (
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
            <span className="text-xl">📸</span>
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Screenshots help!
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                After sending, consider replying with screenshots showing the issue. This helps us understand and resolve it faster.
              </p>
            </div>
          </div>
        )}

        {/* Device Info Toggle for Bugs/Support */}
        {(selectedCategory === 'bugs' || selectedCategory === 'support') && (
          <label className="flex items-center gap-3 p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg cursor-pointer hover:bg-[var(--card-bg-secondary)] transition-colors">
            <input
              type="checkbox"
              checked={includeDeviceInfo}
              onChange={(e) => setIncludeDeviceInfo(e.target.checked)}
              className="w-5 h-5 accent-[var(--accent-primary)]"
            />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Include device information
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Helps us troubleshoot (browser, screen size, etc.)
              </p>
            </div>
          </label>
        )}

        {/* Send Button */}
        <button
          onClick={handleSendEmail}
          disabled={!message.trim()}
          className="w-full py-3 rounded-xl bg-[var(--accent-primary)] text-white font-medium text-lg hover:bg-[var(--accent-primary-hover)] transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Open in Email App
        </button>

        <p className="text-xs text-center text-[var(--text-secondary)]">
          This will open your default email app with the message pre-filled
        </p>
      </div>
    );
  };

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
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scaleIn 0.3s ease-out;
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>

      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
      >
        <div
          className="relative w-full max-w-lg max-h-[90vh] mx-4 bg-[var(--card-bg)] rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-[var(--card-bg)] border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              {selectedCategory && (
                <button
                  onClick={handleBack}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Back"
                >
                  <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div>
                <h2 className="text-xl font-light text-[var(--text-primary)]">
                  {selectedCategory ? 'Compose Message' : 'Contact Us'}
                </h2>
                {!selectedCategory && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">We're here to help</p>
                )}
              </div>
            </div>
            <button
              onClick={handleClose}
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

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
            <div className={selectedCategory ? 'animate-slide-in' : ''}>
              {selectedCategory ? renderContactForm() : renderCategoryList()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
