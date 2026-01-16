import React, { useState, useEffect } from 'react';
import { getTOTPTimeRemaining } from '../src/utils/mfa';

interface MFAVerificationModalProps {
  onVerify: (code: string, isBackupCode?: boolean) => Promise<{ success: boolean; error?: string }>;
  onCancel: () => void;
  userEmail?: string;
}

const MFAVerificationModal: React.FC<MFAVerificationModalProps> = ({
  onVerify,
  onCancel,
  userEmail,
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);

  // Update time remaining counter (only for TOTP codes)
  useEffect(() => {
    if (!useBackupCode) {
      const interval = setInterval(() => {
        setTimeRemaining(getTOTPTimeRemaining());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [useBackupCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      setError('Please enter a code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await onVerify(code, useBackupCode);

      if (result.success) {
        // Verification successful - parent component will handle navigation
      } else {
        setError(result.error || 'Invalid code. Please try again.');
        setCode('');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
      console.error('MFA verification error:', err);
      setCode('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBackupCode = () => {
    setUseBackupCode(!useBackupCode);
    setCode('');
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--card-bg-opaque)] rounded-2xl shadow-lg max-w-md w-full p-6 border border-[var(--card-border)]">
        <h2 className="text-2xl font-light text-[var(--text-primary)] mb-2">
          Two-Factor Authentication
        </h2>

        {userEmail && (
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            {userEmail}
          </p>
        )}

        <p className="text-[var(--text-secondary)] mb-6">
          {useBackupCode
            ? 'Enter one of your backup recovery codes:'
            : 'Enter the 6-digit code from your authenticator app:'}
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            inputMode={useBackupCode ? 'text' : 'numeric'}
            maxLength={useBackupCode ? 9 : 6}
            value={code}
            onChange={(e) => {
              const value = useBackupCode
                ? e.target.value.toUpperCase()
                : e.target.value.replace(/\D/g, '');
              setCode(value);
            }}
            placeholder={useBackupCode ? 'XXXX-XXXX' : '000000'}
            className="w-full px-4 py-3 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)] mb-4"
            autoFocus
            disabled={isLoading}
          />

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {!useBackupCode && (
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-[var(--text-secondary)]">
                Code refreshes in: {timeRemaining}s
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || code.length < (useBackupCode ? 8 : 6)}
            className="w-full py-3 px-4 rounded-lg bg-[var(--accent-primary)] text-white font-medium hover:bg-[var(--accent-primary-hover)] transition-colors disabled:opacity-50 mb-4"
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        <div className="border-t border-[var(--card-border)] pt-4">
          <button
            onClick={handleToggleBackupCode}
            className="w-full py-2 px-4 rounded-lg bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] text-sm font-medium hover:opacity-80 transition-opacity mb-2"
          >
            {useBackupCode ? 'Use Authenticator Code' : 'Use Backup Code'}
          </button>

          <button
            onClick={onCancel}
            className="w-full py-2 px-4 rounded-lg bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] text-sm font-medium hover:opacity-80 transition-opacity"
          >
            Cancel
          </button>
        </div>

        {useBackupCode && (
          <div className="mt-4 bg-amber-50 dark:bg-amber-900/50 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Note: Backup codes can only be used once. After using a backup code,
              it will be invalidated.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MFAVerificationModal;
