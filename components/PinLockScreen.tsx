
import React, { useState, useRef, KeyboardEvent, useEffect } from 'react';
import emailjs from '@emailjs/browser';
import { validateEmail, validatePin, generateRecoveryCode, VALIDATION_LIMITS } from '../src/utils/validation';

interface PinLockScreenProps {
    correctPin: string;
    userEmail?: string;
    onUnlock: () => void;
    onPinReset: (newPin: string) => void;
}

interface RateLimitData {
    attempts: number;
    lockedUntil: number;
}

const PIN_LENGTH = VALIDATION_LIMITS.PIN_LENGTH; // 6 characters
const RECOVERY_CODE_LENGTH = VALIDATION_LIMITS.RECOVERY_CODE_LENGTH; // 7 digits
const MAX_PIN_ATTEMPTS = 5; // Lock after 5 failed attempts
const MAX_CODE_ATTEMPTS = 3; // Lock after 3 failed code verifications
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

const PinLockScreen: React.FC<PinLockScreenProps> = ({ correctPin, userEmail, onUnlock, onPinReset }) => {
    const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(''));
    const [error, setError] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [recoveryStep, setRecoveryStep] = useState<'email' | 'code' | 'newpin'>('email');
    const [email, setEmail] = useState(userEmail || '');
    const [recoveryCode, setRecoveryCode] = useState('');
    const [enteredCode, setEnteredCode] = useState('');
    const [newPin, setNewPin] = useState<string[]>(Array(PIN_LENGTH).fill(''));
    const [resetSent, setResetSent] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [isLocked, setIsLocked] = useState(false);
    const [lockoutMessage, setLockoutMessage] = useState('');
    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
    const newPinInputsRef = useRef<(HTMLInputElement | null)[]>([]);

    // Initialize EmailJS
    useEffect(() => {
        emailjs.init('uAtxjwzd4c2lx_6xT'); // Initialize with public key

        // Check if currently locked out
        checkLockoutStatus();
    }, []);

    // Rate limiting functions
    const getRateLimitKey = (type: 'pin' | 'code'): string => {
        return `rateLimit_${type}_${userEmail || 'guest'}`;
    };

    const getRateLimitData = (type: 'pin' | 'code'): RateLimitData => {
        const key = getRateLimitKey(type);
        const data = localStorage.getItem(key);
        if (!data) {
            return { attempts: 0, lockedUntil: 0 };
        }
        return JSON.parse(data);
    };

    const setRateLimitData = (type: 'pin' | 'code', data: RateLimitData): void => {
        const key = getRateLimitKey(type);
        localStorage.setItem(key, JSON.stringify(data));
    };

    const checkLockoutStatus = (): boolean => {
        const pinData = getRateLimitData('pin');
        const codeData = getRateLimitData('code');
        const now = Date.now();

        // Check PIN lockout
        if (pinData.lockedUntil > now) {
            const minutesLeft = Math.ceil((pinData.lockedUntil - now) / 60000);
            setIsLocked(true);
            setLockoutMessage(`Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`);
            return true;
        }

        // Check code lockout
        if (codeData.lockedUntil > now && recoveryStep === 'code') {
            const minutesLeft = Math.ceil((codeData.lockedUntil - now) / 60000);
            setEmailError(`Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`);
            return true;
        }

        setIsLocked(false);
        setLockoutMessage('');
        return false;
    };

    const recordFailedAttempt = (type: 'pin' | 'code'): void => {
        const data = getRateLimitData(type);
        const maxAttempts = type === 'pin' ? MAX_PIN_ATTEMPTS : MAX_CODE_ATTEMPTS;

        data.attempts += 1;

        if (data.attempts >= maxAttempts) {
            data.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
            setRateLimitData(type, data);
            checkLockoutStatus();
        } else {
            setRateLimitData(type, data);
        }
    };

    const resetAttempts = (type: 'pin' | 'code'): void => {
        setRateLimitData(type, { attempts: 0, lockedUntil: 0 });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const { value } = e.target;
        const newPin = [...pin];

        // Allow both letters and numbers for more security
        const char = value.match(/[a-zA-Z0-9]/);
        newPin[index] = char ? char[0].toUpperCase() : '';

        setPin(newPin);

        if (newPin[index] !== '' && index < PIN_LENGTH - 1) {
            inputsRef.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace' && pin[index] === '' && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Check if locked out
        if (checkLockoutStatus()) {
            return;
        }

        const enteredPin = pin.join('');

        // Validate PIN format
        const validationError = validatePin(enteredPin);
        if (validationError) {
            setError(true);
            setTimeout(() => setError(false), 500);
            return;
        }

        if (enteredPin.toLowerCase() === correctPin.toLowerCase()) {
            // Success - reset attempts and unlock
            resetAttempts('pin');
            onUnlock();
        } else {
            // Failed attempt - record it
            recordFailedAttempt('pin');
            setError(true);
            setPin(Array(PIN_LENGTH).fill(''));
            inputsRef.current[0]?.focus();
            setTimeout(() => setError(false), 500);

            // Check if now locked out
            checkLockoutStatus();
        }
    };

    const handleForgotSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailError('');

        // Validate email using our validation utility
        const emailValidationError = validateEmail(email);
        if (emailValidationError) {
            setEmailError(emailValidationError);
            return;
        }

        if (userEmail && email.toLowerCase() !== userEmail.toLowerCase()) {
            setEmailError('This email does not match the one on file.');
            return;
        }

        setSendingEmail(true);
        const code = generateRecoveryCode(); // Now generates 7-digit code
        setRecoveryCode(code);

        // Store recovery code with expiration (15 minutes)
        const recoveryData = {
            code,
            email: email.toLowerCase(),
            expiration: Date.now() + 15 * 60 * 1000
        };
        localStorage.setItem('pinRecovery', JSON.stringify(recoveryData));

        try {
            // Send email via EmailJS
            const templateParams = {
                to_email: email,
                to_name: email.split('@')[0],
                recovery_code: code,
                reply_to: email,
            };

            console.log('Sending email with params:', { ...templateParams, recovery_code: '******' });

            const response = await emailjs.send(
                'service_n8jla35', // EmailJS service ID
                'template_ltdniz9', // EmailJS template ID
                templateParams
            );

            console.log('Email sent successfully:', response);
            setResetSent(true);
            setRecoveryStep('code');
        } catch (error: any) {
            console.error('Email sending failed - Full error:', error);
            console.error('Error status:', error?.status);
            console.error('Error text:', error?.text);
            setEmailError(`Failed to send email: ${error?.text || error?.message || 'Unknown error'}`);
        } finally {
            setSendingEmail(false);
        }
    };

    const handleCodeVerification = (e: React.FormEvent) => {
        e.preventDefault();
        setEmailError('');

        // Check if locked out from too many code attempts
        if (checkLockoutStatus()) {
            return;
        }

        const storedData = localStorage.getItem('pinRecovery');
        if (!storedData) {
            setEmailError('Recovery code expired. Please request a new one.');
            setRecoveryStep('email');
            setResetSent(false);
            return;
        }

        const { code, expiration } = JSON.parse(storedData);
        if (Date.now() > expiration) {
            setEmailError('Recovery code expired. Please request a new one.');
            localStorage.removeItem('pinRecovery');
            setRecoveryStep('email');
            setResetSent(false);
            return;
        }

        if (enteredCode !== code) {
            // Record failed code attempt
            recordFailedAttempt('code');
            const attemptsData = getRateLimitData('code');
            const remainingAttempts = MAX_CODE_ATTEMPTS - attemptsData.attempts;

            if (remainingAttempts > 0) {
                setEmailError(`Incorrect code. ${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining.`);
            }

            // Check if now locked out
            checkLockoutStatus();
            return;
        }

        // Code verified successfully - reset attempts and proceed
        resetAttempts('code');
        localStorage.removeItem('pinRecovery');
        setRecoveryStep('newpin');
    };

    const handleNewPinChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const { value } = e.target;
        const updatedNewPin = [...newPin];

        // Allow both letters and numbers for better security
        const char = value.match(/[a-zA-Z0-9]/);
        updatedNewPin[index] = char ? char[0].toUpperCase() : '';

        setNewPin(updatedNewPin);

        if (updatedNewPin[index] !== '' && index < PIN_LENGTH - 1) {
            newPinInputsRef.current[index + 1]?.focus();
        }
    };

    const handleNewPinKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace' && newPin[index] === '' && index > 0) {
            newPinInputsRef.current[index - 1]?.focus();
        }
    };

    const handleNewPinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const pinValue = newPin.join('');

        // Validate PIN using our validation utility
        const validationError = validatePin(pinValue);
        if (validationError) {
            setEmailError(validationError);
            return;
        }

        onPinReset(pinValue.toLowerCase());
        setShowForgot(false);
        setResetSent(false);
        setRecoveryStep('email');
        setNewPin(Array(PIN_LENGTH).fill(''));
        setEnteredCode('');

        // Reset rate limiting for new PIN
        resetAttempts('pin');
        resetAttempts('code');
    };

    if (showForgot) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 font-sans">
                <div className="max-w-sm w-full bg-[var(--card-bg)] backdrop-blur-sm rounded-2xl shadow-lg p-8 sm:p-12 border border-[var(--card-border)] text-center animate-fade-in">
                    <h1 className="text-2xl font-light text-[var(--text-secondary)] mb-4">Reset PIN</h1>

                    {recoveryStep === 'email' && (
                        <>
                            <p className="text-md text-[var(--text-primary)] mb-6">
                                Enter your email address to receive a recovery code.
                            </p>
                            <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => {setEmail(e.target.value); setEmailError('');}}
                                    placeholder="your@email.com"
                                    required
                                    disabled={sendingEmail}
                                    className="w-full bg-[var(--input-bg)] border-2 border-[var(--input-border)] rounded-lg p-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)] disabled:opacity-50"
                                />
                                {emailError && <p className="text-red-500 text-sm">{emailError}</p>}
                                <button
                                    type="submit"
                                    disabled={sendingEmail}
                                    className="bg-[var(--accent-primary)] text-white px-8 py-3 rounded-lg text-lg font-medium shadow hover:bg-[var(--accent-primary-hover)] transition-colors duration-300 disabled:opacity-50"
                                >
                                    {sendingEmail ? 'Sending...' : 'Send Recovery Code'}
                                </button>
                                <button type="button" onClick={() => {setShowForgot(false); setEmailError('');}} className="text-gray-500 text-sm mt-2 hover:underline">Cancel</button>
                            </form>
                        </>
                    )}

                    {recoveryStep === 'code' && (
                        <>
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                            </div>
                            <p className="text-lg text-[var(--text-primary)] mb-2">Code Sent!</p>
                            <p className="text-sm text-gray-500 mb-6">Please check your email and enter the 7-digit code below.</p>
                            <form onSubmit={handleCodeVerification} className="flex flex-col gap-4">
                                <input
                                    type="text"
                                    value={enteredCode}
                                    onChange={e => {setEnteredCode(e.target.value.replace(/\D/g, '').slice(0, RECOVERY_CODE_LENGTH)); setEmailError('');}}
                                    placeholder="0000000"
                                    maxLength={RECOVERY_CODE_LENGTH}
                                    required
                                    className="w-full bg-[var(--input-bg)] border-2 border-[var(--input-border)] rounded-lg p-3 text-[var(--text-primary)] text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)]"
                                    autoFocus
                                />
                                {emailError && <p className="text-red-500 text-sm">{emailError}</p>}
                                <button
                                    type="submit"
                                    className="bg-[var(--accent-primary)] text-white px-8 py-3 rounded-lg text-lg font-medium shadow hover:bg-[var(--accent-primary-hover)] transition-colors duration-300"
                                >
                                    Verify Code
                                </button>
                                <button type="button" onClick={() => {setRecoveryStep('email'); setResetSent(false); setEmailError('');}} className="text-gray-500 text-sm mt-2 hover:underline">Back</button>
                            </form>
                        </>
                    )}

                    {recoveryStep === 'newpin' && (
                        <>
                            <p className="text-md text-[var(--text-primary)] mb-8">
                                Enter your new 6-character PIN (letters and numbers).
                            </p>
                            <form onSubmit={handleNewPinSubmit} className="flex flex-col items-center">
                                <div className="flex justify-center gap-2 mb-6 flex-wrap">
                                    {newPin.map((digit, index) => (
                                        <input
                                            key={index}
                                            ref={(el) => (newPinInputsRef.current[index] = el)}
                                            type="text"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleNewPinChange(e, index)}
                                            onKeyDown={(e) => handleNewPinKeyDown(e, index)}
                                            className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-semibold bg-[var(--input-bg)] border-2 border-[var(--input-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)] transition"
                                            autoFocus={index === 0}
                                        />
                                    ))}
                                </div>
                                {emailError && <p className="text-red-500 text-sm mb-4">{emailError}</p>}
                                <button
                                    type="submit"
                                    className="bg-[var(--accent-primary)] text-white px-8 py-3 rounded-lg text-lg font-medium shadow hover:bg-[var(--accent-primary-hover)] transition-colors duration-300"
                                >
                                    Set New PIN
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 font-sans">
            <div className={`max-w-sm w-full bg-[var(--card-bg)] backdrop-blur-sm rounded-2xl shadow-lg p-8 sm:p-12 border border-[var(--card-border)] text-center ${error ? 'animate-shake' : ''}`}>
                <h1 className="text-2xl font-light text-[var(--text-secondary)] mb-4">Enter PIN</h1>
                <p className="text-md text-[var(--text-primary)] mb-8">
                    Enter your 6-character PIN to continue.
                </p>
                {isLocked && lockoutMessage && (
                    <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
                        <p className="text-red-600 dark:text-red-400 text-sm font-medium">{lockoutMessage}</p>
                    </div>
                )}
                <form onSubmit={handleSubmit} className="flex flex-col items-center">
                    <div className="flex justify-center gap-2 mb-6">
                        {pin.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => (inputsRef.current[index] = el)}
                                type="text"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(e, index)}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                disabled={isLocked}
                                className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-semibold bg-[var(--input-bg)] border-2 border-[var(--input-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                                autoFocus={index === 0}
                            />
                        ))}
                    </div>
                    <button
                        type="submit"
                        disabled={isLocked}
                        className="bg-[var(--accent-primary)] text-white px-8 py-3 rounded-lg text-lg font-medium shadow hover:bg-[var(--accent-primary-hover)] transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Unlock
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowForgot(true)}
                        disabled={isLocked}
                        className="mt-6 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Forgot PIN?
                    </button>
                </form>
            </div>
            <style>{`
                @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }
                .animate-shake {
                    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out;
                }
            `}</style>
        </div>
    );
};

export default PinLockScreen;
