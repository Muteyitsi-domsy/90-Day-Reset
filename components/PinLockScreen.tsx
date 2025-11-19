
import React, { useState, useRef, KeyboardEvent } from 'react';

interface PinLockScreenProps {
    correctPin: string;
    onUnlock: () => void;
}

const PinLockScreen: React.FC<PinLockScreenProps> = ({ correctPin, onUnlock }) => {
    const [pin, setPin] = useState<string[]>(Array(4).fill(''));
    const [error, setError] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [email, setEmail] = useState('');
    const [resetSent, setResetSent] = useState(false);
    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

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
    
    const handleForgotSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, this would call an API.
        // Here we simulate the delay and success.
        setTimeout(() => {
            setResetSent(true);
        }, 1000);
    };

    if (showForgot) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 font-sans">
                <div className="max-w-sm w-full bg-[var(--card-bg)] backdrop-blur-sm rounded-2xl shadow-lg p-8 sm:p-12 border border-[var(--card-border)] text-center animate-fade-in">
                    <h1 className="text-2xl font-light text-[var(--text-secondary)] mb-4">Reset PIN</h1>
                    {!resetSent ? (
                        <>
                            <p className="text-md text-[var(--text-primary)] mb-6">
                                Enter your email address to receive a reset link.
                            </p>
                            <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
                                <input 
                                    type="email" 
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)} 
                                    placeholder="your@email.com" 
                                    required
                                    className="w-full bg-[var(--input-bg)] border-2 border-[var(--input-border)] rounded-lg p-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)]"
                                />
                                <button
                                    type="submit"
                                    className="bg-[var(--accent-primary)] text-white px-8 py-3 rounded-lg text-lg font-medium shadow hover:bg-[var(--accent-primary-hover)] transition-colors duration-300"
                                >
                                    Send Reset Link
                                </button>
                                <button type="button" onClick={() => setShowForgot(false)} className="text-gray-500 text-sm mt-2 hover:underline">Cancel</button>
                            </form>
                        </>
                    ) : (
                        <div className="space-y-4">
                             <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                             </div>
                             <p className="text-lg text-[var(--text-primary)]">Link Sent!</p>
                             <p className="text-sm text-gray-500">Please check your inbox for instructions to reset your PIN.</p>
                             <button onClick={() => {setShowForgot(false); setResetSent(false);}} className="text-[var(--accent-primary)] hover:underline mt-4">Back to Login</button>
                        </div>
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
