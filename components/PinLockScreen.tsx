
import React, { useState, useRef, KeyboardEvent, useEffect } from 'react';
import emailjs from '@emailjs/browser';

interface PinLockScreenProps {
    correctPin: string;
    userEmail?: string;
    onUnlock: () => void;
    onPinReset: (newPin: string) => void;
}

const PinLockScreen: React.FC<PinLockScreenProps> = ({ correctPin, userEmail, onUnlock, onPinReset }) => {
    const [pin, setPin] = useState<string[]>(Array(4).fill(''));
    const [error, setError] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [recoveryStep, setRecoveryStep] = useState<'email' | 'code' | 'newpin'>('email');
    const [email, setEmail] = useState(userEmail || '');
    const [recoveryCode, setRecoveryCode] = useState('');
    const [enteredCode, setEnteredCode] = useState('');
    const [newPin, setNewPin] = useState<string[]>(Array(4).fill(''));
    const [resetSent, setResetSent] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [emailError, setEmailError] = useState('');
    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
    const newPinInputsRef = useRef<(HTMLInputElement | null)[]>([]);

    // Initialize EmailJS
    useEffect(() => {
        emailjs.init('uAtxjwzd4c2lx_6xT'); // Initialize with public key
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const { value } = e.target;
        const newPin = [...pin];
        
        // Only allow a single letter
        const letter = value.match(/[a-zA-Z]/);
        newPin[index] = letter ? letter[0].toUpperCase() : '';

        setPin(newPin);

        if (newPin[index] !== '' && index < 3) {
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
        const enteredPin = pin.join('');
        if (enteredPin.toLowerCase() === correctPin.toLowerCase()) {
            onUnlock();
        } else {
            setError(true);
            setPin(Array(4).fill(''));
            inputsRef.current[0]?.focus();
            setTimeout(() => setError(false), 500); // Reset error state after animation
        }
    };
    
    const generateRecoveryCode = (): string => {
        return Math.floor(100000 + Math.random() * 900000).toString();
    };

    const handleForgotSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailError('');

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError('Please enter a valid email address.');
            return;
        }

        if (userEmail && email.toLowerCase() !== userEmail.toLowerCase()) {
            setEmailError('This email does not match the one on file.');
            return;
        }

        setSendingEmail(true);
        const code = generateRecoveryCode();
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
            setEmailError('Incorrect code. Please try again.');
            return;
        }

        // Code verified successfully
        localStorage.removeItem('pinRecovery');
        setRecoveryStep('newpin');
    };

    const handleNewPinChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const { value } = e.target;
        const updatedNewPin = [...newPin];

        const letter = value.match(/[a-zA-Z]/);
        updatedNewPin[index] = letter ? letter[0].toUpperCase() : '';

        setNewPin(updatedNewPin);

        if (updatedNewPin[index] !== '' && index < 3) {
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

        if (pinValue.length !== 4 || !/^[a-zA-Z]{4}$/.test(pinValue)) {
            setEmailError('PIN must be exactly 4 letters.');
            return;
        }

        onPinReset(pinValue.toLowerCase());
        setShowForgot(false);
        setResetSent(false);
        setRecoveryStep('email');
        setNewPin(Array(4).fill(''));
        setEnteredCode('');
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
                            <p className="text-sm text-gray-500 mb-6">Please check your email and enter the 6-digit code below.</p>
                            <form onSubmit={handleCodeVerification} className="flex flex-col gap-4">
                                <input
                                    type="text"
                                    value={enteredCode}
                                    onChange={e => {setEnteredCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setEmailError('');}}
                                    placeholder="000000"
                                    maxLength={6}
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
                                Enter your new 4-letter PIN.
                            </p>
                            <form onSubmit={handleNewPinSubmit} className="flex flex-col items-center">
                                <div className="flex justify-center gap-3 mb-6">
                                    {newPin.map((digit, index) => (
                                        <input
                                            key={index}
                                            ref={(el) => (newPinInputsRef.current[index] = el)}
                                            type="text"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleNewPinChange(e, index)}
                                            onKeyDown={(e) => handleNewPinKeyDown(e, index)}
                                            className="w-12 h-14 text-center text-2xl font-semibold bg-[var(--input-bg)] border-2 border-[var(--input-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)] transition"
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
                    Enter your 4-letter PIN to continue.
                </p>
                <form onSubmit={handleSubmit} className="flex flex-col items-center">
                    <div className="flex justify-center gap-3 mb-6">
                        {pin.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => (inputsRef.current[index] = el)}
                                type="text"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(e, index)}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                className="w-12 h-14 text-center text-2xl font-semibold bg-[var(--input-bg)] border-2 border-[var(--input-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)] transition"
                                autoFocus={index === 0}
                            />
                        ))}
                    </div>
                    <button
                        type="submit"
                        className="bg-[var(--accent-primary)] text-white px-8 py-3 rounded-lg text-lg font-medium shadow hover:bg-[var(--accent-primary-hover)] transition-colors duration-300"
                    >
                        Unlock
                    </button>
                    <button type="button" onClick={() => setShowForgot(true)} className="mt-6 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline transition-colors">
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
