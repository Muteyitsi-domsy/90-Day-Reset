import { useEffect, useState } from 'react';

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface SyncStatusIndicatorProps {
  status?: SyncStatus;
  error?: string | null;
}

export function SyncStatusIndicator({ status = 'idle', error }: SyncStatusIndicatorProps) {
  const [showSynced, setShowSynced] = useState(false);

  useEffect(() => {
    if (status === 'synced') {
      setShowSynced(true);
      const timer = setTimeout(() => {
        setShowSynced(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  if (status === 'idle' && !showSynced) return null;

  return (
    <div className="sync-status-indicator" title={error || getStatusText(status)}>
      {status === 'syncing' && (
        <div className="sync-icon syncing">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray="31.4 31.4"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
      {(status === 'synced' || showSynced) && (
        <div className="sync-icon synced">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M20 6L9 17L4 12"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
      {status === 'error' && (
        <div className="sync-icon error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M12 8v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1" fill="currentColor" />
          </svg>
        </div>
      )}

      <style>{`
        .sync-status-indicator {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .sync-icon {
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sync-icon.syncing {
          color: var(--accent-color, #6366f1);
          animation: spin 1s linear infinite;
        }

        .sync-icon.synced {
          color: var(--success-color, #10b981);
          animation: fadeIn 0.3s ease-out;
        }

        .sync-icon.error {
          color: #ef4444;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

function getStatusText(status: SyncStatus): string {
  switch (status) {
    case 'syncing':
      return 'Syncing to cloud...';
    case 'synced':
      return 'Synced to cloud';
    case 'error':
      return 'Sync error';
    default:
      return '';
  }
}
