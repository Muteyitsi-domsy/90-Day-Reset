import { useState } from 'react';
import { useAuth } from '../src/hooks/useAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultMode?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, onSuccess, defaultMode = 'signup' }: AuthModalProps) {
  const { signUp, signIn, resetPassword, error, clearError } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    // Validation
    if (!email || !email.includes('@')) {
      setLocalError('Please enter a valid email address');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (mode !== 'reset' && password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        await signUp(email, password);
        onSuccess?.();
        onClose();
      } else if (mode === 'signin') {
        await signIn(email, password);
        onSuccess?.();
        onClose();
      } else if (mode === 'reset') {
        await resetPassword(email);
        setResetEmailSent(true);
      }
    } catch (err: any) {
      // Error is handled by useAuth hook
      console.error('Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setLocalError(null);
    setResetEmailSent(false);
    clearError();
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('skipCloudSync', 'true');
    handleClose();
  };

  const switchMode = (newMode: 'signin' | 'signup' | 'reset') => {
    setMode(newMode);
    setLocalError(null);
    setResetEmailSent(false);
    clearError();
  };

  const displayError = localError || error;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={handleClose}>
          ×
        </button>

        <div className="auth-modal">
          <h2 className="modal-title">
            {mode === 'reset'
              ? 'Reset Password'
              : mode === 'signup'
              ? 'Create Account'
              : 'Sign In'}
          </h2>

          {mode !== 'reset' && (
            <p className="auth-modal-subtitle">
              Prevent data loss • Access from any device • Secure cloud backup
            </p>
          )}

          {resetEmailSent ? (
            <div className="auth-success-message">
              <p>Password reset email sent! Check your inbox.</p>
              <button
                className="primary-button"
                onClick={() => switchMode('signin')}
                style={{ marginTop: '1rem' }}
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              {mode !== 'reset' && (
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    disabled={isLoading}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />
                </div>
              )}

              {mode === 'signup' && (
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </div>
              )}

              {displayError && <div className="error-message">{displayError}</div>}

              <button type="submit" className="primary-button" disabled={isLoading}>
                {isLoading
                  ? mode === 'reset'
                    ? 'Sending...'
                    : mode === 'signup'
                    ? 'Creating Account...'
                    : 'Signing In...'
                  : mode === 'reset'
                  ? 'Send Reset Email'
                  : mode === 'signup'
                  ? 'Create Account'
                  : 'Sign In'}
              </button>

              {mode === 'signin' && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => switchMode('reset')}
                  disabled={isLoading}
                >
                  Forgot Password?
                </button>
              )}

              {mode === 'reset' && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => switchMode('signin')}
                  disabled={isLoading}
                >
                  Back to Sign In
                </button>
              )}

              <div className="auth-mode-toggle">
                {mode === 'signup' ? (
                  <p>
                    Already have an account?{' '}
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => switchMode('signin')}
                      disabled={isLoading}
                    >
                      Sign In
                    </button>
                  </p>
                ) : mode === 'signin' ? (
                  <p>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => switchMode('signup')}
                      disabled={isLoading}
                    >
                      Sign Up
                    </button>
                  </p>
                ) : null}
              </div>

              {mode !== 'reset' && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleSkip}
                  disabled={isLoading}
                  style={{ marginTop: '1rem' }}
                >
                  Skip for now
                </button>
              )}
            </form>
          )}
        </div>
      </div>

      <style>{`
        .auth-modal {
          padding: 0.5rem 0;
        }

        .auth-modal-subtitle {
          font-size: 0.95rem;
          color: var(--text-muted);
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .form-group input {
          padding: 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          font-size: 1rem;
          background: var(--surface-bg);
          color: var(--text-primary);
          transition: border-color 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: var(--accent-color);
        }

        .form-group input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-message {
          padding: 0.75rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #ef4444;
          font-size: 0.9rem;
        }

        .auth-success-message {
          text-align: center;
          padding: 1rem;
        }

        .auth-success-message p {
          color: var(--success-color, #10b981);
          font-size: 1rem;
          margin-bottom: 0.5rem;
        }

        .text-button {
          background: none;
          border: none;
          color: var(--accent-color);
          cursor: pointer;
          font-size: 0.9rem;
          text-align: center;
          padding: 0.5rem;
          text-decoration: underline;
        }

        .text-button:hover {
          opacity: 0.8;
        }

        .text-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .auth-mode-toggle {
          text-align: center;
          margin-top: 0.5rem;
        }

        .auth-mode-toggle p {
          font-size: 0.9rem;
          color: var(--text-muted);
        }

        .link-button {
          background: none;
          border: none;
          color: var(--accent-color);
          cursor: pointer;
          font-size: 0.9rem;
          text-decoration: underline;
          padding: 0;
        }

        .link-button:hover {
          opacity: 0.8;
        }

        .link-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .primary-button:disabled,
        .secondary-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
