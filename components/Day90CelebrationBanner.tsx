import { useState, useEffect } from 'react';

export function Day90CelebrationBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('day90BannerDismissed');
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('day90BannerDismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="day90-banner">
      <div className="banner-content">
        <div className="banner-icon">✨</div>
        <div className="banner-text">
          <h3>Day 90. You actually did it.</h3>
          <p>Wow — see how far you came. Revel in how it feels to become the version of yourself you've been unlocking all along.</p>
          <p className="banner-note">🎉 Your monthly report is ready today. Your keepsake will be waiting for you tomorrow.</p>
        </div>
        <div className="banner-actions">
          <button className="day90-dismiss-button" onClick={handleDismiss}>
            I feel it
          </button>
        </div>
      </div>

      <style>{`
        .day90-banner {
          background: linear-gradient(135deg, #b49b6e 0%, #c4a97d 50%, #9b82c4 100%);
          color: white;
          padding: 1rem 1.5rem;
          margin-bottom: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(180, 155, 110, 0.35);
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .day90-banner .banner-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .day90-banner .banner-icon {
          font-size: 2rem;
          line-height: 1;
        }

        .day90-banner .banner-text {
          flex: 1;
        }

        .day90-banner .banner-text h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: white;
        }

        .day90-banner .banner-text p {
          margin: 0;
          font-size: 0.9rem;
          opacity: 0.92;
          color: white;
        }

        .day90-banner .banner-text .banner-note {
          margin-top: 0.5rem;
          font-size: 0.85rem;
          font-weight: 500;
          opacity: 1;
        }

        .day90-banner .banner-actions {
          display: flex;
          gap: 0.75rem;
        }

        .day90-dismiss-button {
          padding: 0.5rem 1.25rem;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          background: white;
          color: #b49b6e;
          white-space: nowrap;
        }

        .day90-dismiss-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        @media (max-width: 640px) {
          .day90-banner {
            padding: 1rem;
          }

          .day90-banner .banner-content {
            flex-direction: column;
            text-align: center;
            gap: 0.75rem;
          }

          .day90-banner .banner-actions {
            width: 100%;
          }

          .day90-dismiss-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
