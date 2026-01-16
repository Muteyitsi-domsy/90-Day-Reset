import React, { useState, useEffect } from 'react';
import {
  generateMFASetup,
  verifyTOTPCode,
  getTOTPTimeRemaining,
  MFASetupData,
  hashBackupCodes,
} from '../src/utils/mfa';

interface MFASetupModalProps {
  userEmail: string;
  userName?: string;
  onComplete: (mfaSecret: string, hashedBackupCodes: string[]) => Promise<void>;
  onCancel: () => void;
}

type SetupStep = 'intro' | 'qrcode' | 'verify' | 'backup' | 'complete';

const MFASetupModal: React.FC<MFASetupModalProps> = ({
  userEmail,
  userName,
  onComplete,
  onCancel,
}) => {
  const [step, setStep] = useState<SetupStep>('intro');
  const [setupData, setSetupData] = useState<MFASetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

  // Update time remaining counter
  useEffect(() => {
    if (step === 'qrcode' || step === 'verify') {
      const interval = setInterval(() => {
        setTimeRemaining(getTOTPTimeRemaining());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step]);

  const handleStartSetup = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await generateMFASetup(userEmail, userName);
      setSetupData(data);
      setStep('qrcode');
    } catch (err) {
      setError('Failed to generate MFA setup. Please try again.');
      console.error('MFA setup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = () => {
    if (!setupData) return;

    setError('');

    const result = verifyTOTPCode(verificationCode, setupData.secret);

    if (result.valid) {
      setStep('backup');
    } else {
      setError(result.error || 'Invalid code. Please try again.');
      setVerificationCode('');
    }
  };

  const handleCompleteSetup = async () => {
    if (!setupData) return;

    setIsLoading(true);
    setError('');

    try {
      // Hash backup codes for secure storage
      const hashedCodes = await hashBackupCodes(setupData.backupCodes);

      // Save MFA settings to user profile
      await onComplete(setupData.secret, hashedCodes);

      setStep('complete');
    } catch (err) {
      setError('Failed to enable MFA. Please try again.');
      console.error('MFA completion error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySecret = async () => {
    if (setupData) {
      await navigator.clipboard.writeText(setupData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleCopyBackupCodes = async () => {
    if (setupData) {
      const text = setupData.backupCodes.join('\n');
      await navigator.clipboard.writeText(text);
      setCopiedBackupCodes(true);
      setTimeout(() => setCopiedBackupCodes(false), 2000);
    }
  };

  const handleDownloadBackupCodes = () => {
    if (!setupData) return;

    const text = `90-Day Reset - MFA Backup Codes
Generated: ${new Date().toISOString()}

IMPORTANT: Save these codes in a secure location.
Each code can only be used once.

${setupData.backupCodes.join('\n')}

Keep these codes safe and secure!`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '90-day-reset-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--card-bg-opaque)] rounded-2xl shadow-lg max-w-lg w-full p-6 border border-[var(--card-border)]">
        {/* Intro Step */}
        {step === 'intro' && (
          <>
            <h2 className="text-2xl font-light text-[var(--text-primary)] mb-4">
              Enable Two-Factor Authentication
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              Add an extra layer of security to your account by requiring a verification code
              from your phone when signing in.
            </p>
            <div className="bg-[var(--card-bg-secondary)] rounded-lg p-4 mb-6">
              <h3 className="font-medium text-[var(--text-primary)] mb-2">What you'll need:</h3>
              <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-1">
                <li>An authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)</li>
                <li>Access to your phone or device</li>
                <li>A safe place to store backup codes</li>
              </ul>
            </div>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-2 px-4 rounded-lg bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] font-medium hover:opacity-80 transition-opacity"
              >
                Cancel
              </button>
              <button
                onClick={handleStartSetup}
                disabled={isLoading}
                className="flex-1 py-2 px-4 rounded-lg bg-[var(--accent-primary)] text-white font-medium hover:bg-[var(--accent-primary-hover)] transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Setting up...' : 'Get Started'}
              </button>
            </div>
          </>
        )}

        {/* QR Code Step */}
        {step === 'qrcode' && setupData && (
          <>
            <h2 className="text-2xl font-light text-[var(--text-primary)] mb-4">
              Scan QR Code
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              Open your authenticator app and scan this QR code:
            </p>
            <div className="flex justify-center mb-4">
              <img
                src={setupData.qrCodeUrl}
                alt="MFA QR Code"
                className="w-64 h-64 border-2 border-[var(--card-border)] rounded-lg"
              />
            </div>
            <div className="bg-[var(--card-bg-secondary)] rounded-lg p-4 mb-4">
              <p className="text-xs text-[var(--text-secondary)] mb-2">
                Can't scan? Enter this code manually:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-[var(--input-bg)] px-3 py-2 rounded font-mono text-sm text-[var(--text-primary)] border border-[var(--input-border)]">
                  {setupData.secret}
                </code>
                <button
                  onClick={handleCopySecret}
                  className="py-2 px-3 rounded bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] text-sm hover:opacity-80 transition-opacity"
                >
                  {copiedSecret ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-[var(--text-secondary)]">
                Code refreshes in: {timeRemaining}s
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-2 px-4 rounded-lg bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] font-medium hover:opacity-80 transition-opacity"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep('verify')}
                className="flex-1 py-2 px-4 rounded-lg bg-[var(--accent-primary)] text-white font-medium hover:bg-[var(--accent-primary-hover)] transition-colors"
              >
                Next
              </button>
            </div>
          </>
        )}

        {/* Verify Step */}
        {step === 'verify' && setupData && (
          <>
            <h2 className="text-2xl font-light text-[var(--text-primary)] mb-4">
              Verify Setup
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              Enter the 6-digit code from your authenticator app to verify:
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full px-4 py-3 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)] mb-4"
              autoFocus
            />
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-[var(--text-secondary)]">
                Code refreshes in: {timeRemaining}s
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep('qrcode')}
                className="flex-1 py-2 px-4 rounded-lg bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] font-medium hover:opacity-80 transition-opacity"
              >
                Back
              </button>
              <button
                onClick={handleVerifyCode}
                disabled={verificationCode.length !== 6}
                className="flex-1 py-2 px-4 rounded-lg bg-[var(--accent-primary)] text-white font-medium hover:bg-[var(--accent-primary-hover)] transition-colors disabled:opacity-50"
              >
                Verify
              </button>
            </div>
          </>
        )}

        {/* Backup Codes Step */}
        {step === 'backup' && setupData && (
          <>
            <h2 className="text-2xl font-light text-[var(--text-primary)] mb-4">
              Save Backup Codes
            </h2>
            <div className="bg-amber-50 dark:bg-amber-900/50 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mb-4">
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                Important: Save these codes in a secure location. You can use them to access
                your account if you lose your device.
              </p>
            </div>
            <div className="bg-[var(--card-bg-secondary)] rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {setupData.backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="bg-[var(--input-bg)] px-3 py-2 rounded border border-[var(--input-border)] text-[var(--text-primary)]"
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleCopyBackupCodes}
                className="flex-1 py-2 px-3 rounded bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] text-sm hover:opacity-80 transition-opacity"
              >
                {copiedBackupCodes ? 'Copied!' : 'Copy Codes'}
              </button>
              <button
                onClick={handleDownloadBackupCodes}
                className="flex-1 py-2 px-3 rounded bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] text-sm hover:opacity-80 transition-opacity"
              >
                Download Codes
              </button>
            </div>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}
            <button
              onClick={handleCompleteSetup}
              disabled={isLoading}
              className="w-full py-2 px-4 rounded-lg bg-[var(--accent-primary)] text-white font-medium hover:bg-[var(--accent-primary-hover)] transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Enabling MFA...' : 'Complete Setup'}
            </button>
          </>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-light text-[var(--text-primary)] mb-2">
                MFA Enabled Successfully
              </h2>
              <p className="text-[var(--text-secondary)] mb-6">
                Your account is now protected with two-factor authentication.
                You'll need your authenticator app to sign in.
              </p>
              <button
                onClick={onCancel}
                className="w-full py-2 px-4 rounded-lg bg-[var(--accent-primary)] text-white font-medium hover:bg-[var(--accent-primary-hover)] transition-colors"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MFASetupModal;
