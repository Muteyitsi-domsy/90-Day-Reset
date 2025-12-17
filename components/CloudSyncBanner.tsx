import { useState, useEffect } from 'react';

interface CloudSyncBannerProps {
  onSetup: () => void;
}

export function CloudSyncBanner({ onSetup }: CloudSyncBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if banner was dismissed
    const dismissed = localStorage.getItem('cloudSyncBannerDismissed');
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('cloudSyncBannerDismissed', 'true');
    setIsVisible(false);
  };

  const handleSetup = () => {
    onSetup();
    // Don't dismiss - let user come back if they cancel the modal
  };

  if (!isVisible) return null;

  return (
    <div className="cloud-sync-banner">
      <div className="banner-content">
        <div className="banner-icon">☁️</div>
        <div className="banner-text">
          <h3>Enable Cloud Backup</h3>
          <p>Protect your 90-day journey and access from any device</p>
        </div>
        <div className="banner-actions">
          <button className="setup-button" onClick={handleSetup}>
            Set Up
          </button>
          <button className="dismiss-button" onClick={handleDismiss}>
            Dismiss
          </button>
        </div>
      </div>

      <style>{`
        .cloud-sync-banner {
          background: linear-gradient(135deg, var(--accent-color, #6366f1) 0%, var(--accent-secondary, #8b5cf6) 100%);
          color: white;
          padding: 1rem 1.5rem;
          margin-bottom: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .banner-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .banner-icon {
          font-size: 2rem;
          line-height: 1;
        }

        .banner-text {
          flex: 1;
        }

        .banner-text h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: white;
        }

        .banner-text p {
          margin: 0;
          font-size: 0.9rem;
          opacity: 0.9;
          color: white;
        }

        .banner-actions {
          display: flex;
          gap: 0.75rem;
        }

        .setup-button,
        .dismiss-button {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .setup-button {
          background: white;
          color: var(--accent-color, #6366f1);
        }

        .setup-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        .dismiss-button {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .dismiss-button:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        @media (max-width: 640px) {
          .cloud-sync-banner {
            padding: 1rem;
          }

          .banner-content {
            flex-direction: column;
            text-align: center;
            gap: 0.75rem;
          }

          .banner-actions {
            width: 100%;
            flex-direction: column;
          }

          .setup-button,
          .dismiss-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
