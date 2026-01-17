import { useState } from 'react';
import { useAuth } from '../src/hooks/useAuth';
import { validateEmail, validatePassword, getPasswordStrength } from '../src/utils/validation';

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
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Password strength calculation
  const passwordStrength = mode === 'signup' && password ? getPasswordStrength(password) : null;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    // Email validation
    const emailError = validateEmail(email);
    if (emailError) {
      setLocalError(emailError);
      return;
    }

    // Password validation for signup only (not signin - allows users with older weaker passwords to sign in)
    if (mode === 'signup') {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setLocalError(passwordError);
        return;
      }

      // Check password match on signup
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match');
        return;
      }

      // Check terms agreement on signup
      if (!agreedToTerms) {
        setLocalError('You must agree to the Terms of Service and Privacy Policy');
        return;
      }
    }

    // Basic password check for signin (just ensure it's not empty)
    if (mode === 'signin' && !password.trim()) {
      setLocalError('Please enter your password');
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
    setAgreedToTerms(false);
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
    setAgreedToTerms(false);
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
                    placeholder={mode === 'signup' ? 'Min 12 chars with uppercase, lowercase & number' : 'Enter your password'}
                    required
                    disabled={isLoading}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />
                  {mode === 'signup' && passwordStrength && (
                    <div className="password-strength">
                      <div className="password-strength-bar">
                        <div
                          className="password-strength-fill"
                          style={{
                            width: `${passwordStrength.score}%`,
                            backgroundColor: passwordStrength.color
                          }}
                        />
                      </div>
                      <span className="password-strength-label" style={{ color: passwordStrength.color }}>
                        {passwordStrength.label}
                      </span>
                    </div>
                  )}
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

              {mode === 'signup' && (
                <div className="terms-agreement">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      disabled={isLoading}
                      className="terms-checkbox"
                    />
                    <span className="terms-text">
                      I agree to the{' '}
                      <a
                        href="/TERMS_OF_SERVICE.md"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="terms-link"
                      >
                        Terms of Service
                      </a>
                      {' '}and{' '}
                      <a
                        href="/PRIVACY_POLICY.md"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="terms-link"
                      >
                        Privacy Policy
                      </a>
                    </span>
                  </label>
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
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
        }

        .modal-container {
          position: relative;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          margin: 1rem;
          background-color: var(--card-bg);
          border-radius: 1rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          overflow-y: auto;
          padding: 1.5rem;
        }

        .modal-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: none;
          border: none;
          font-size: 2rem;
          line-height: 1;
          cursor: pointer;
          color: var(--text-secondary);
          transition: color 0.2s;
          padding: 0.25rem;
          z-index: 10;
        }

        .modal-close:hover {
          color: var(--text-primary);
        }

        .modal-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
          text-align: center;
        }

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

        .password-strength {
          margin-top: 0.5rem;
        }

        .password-strength-bar {
          width: 100%;
          height: 4px;
          background: var(--border-color);
          border-radius: 2px;
          overflow: hidden;
        }

        .password-strength-fill {
          height: 100%;
          transition: all 0.3s ease;
          border-radius: 2px;
        }

        .password-strength-label {
          display: block;
          margin-top: 0.25rem;
          font-size: 0.75rem;
          font-weight: 600;
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

        .primary-button {
          width: 100%;
          padding: 0.75rem;
          background: linear-gradient(135deg, var(--accent-primary, #6366f1) 0%, var(--accent-secondary, #8b5cf6) 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .primary-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        .secondary-button {
          width: 100%;
          padding: 0.75rem;
          background: var(--card-bg-secondary);
          color: var(--text-primary);
          border: 1px solid var(--card-border);
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .secondary-button:hover:not(:disabled) {
          background: var(--card-bg);
          border-color: var(--accent-primary);
        }

        .primary-button:disabled,
        .secondary-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .terms-agreement {
          margin: 1rem 0;
          padding: 0.75rem;
          background: var(--card-bg-secondary, rgba(0, 0, 0, 0.02));
          border-radius: 0.5rem;
        }

        .checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .terms-checkbox {
          width: 1.125rem;
          height: 1.125rem;
          margin-top: 0.125rem;
          cursor: pointer;
          flex-shrink: 0;
          accent-color: var(--accent-primary);
        }

        .terms-checkbox:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .terms-text {
          color: var(--text-secondary);
          flex: 1;
        }

        .terms-link {
          color: var(--accent-primary);
          text-decoration: underline;
          font-weight: 500;
          transition: opacity 0.2s;
        }

        .terms-link:hover {
          opacity: 0.8;
        }

        .terms-link:focus {
          outline: 2px solid var(--accent-primary);
          outline-offset: 2px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
