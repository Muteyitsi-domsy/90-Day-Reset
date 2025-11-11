import React, { useState, useRef, KeyboardEvent } from 'react';

interface PinLockScreenProps {
    correctPin: string;
    onUnlock: () => void;
}

const PinLockScreen: React.FC<PinLockScreenProps> = ({ correctPin, onUnlock }) => {
    const [pin, setPin] = useState<string[]>(Array(4).fill(''));
    const [error, setError] = useState(false);
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
            `}</style>
        </div>
    );
};

export default PinLockScreen;