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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fdfbf7] to-[#f4f1ea] dark:from-gray-900 dark:to-gray-800 p-6 font-sans">
            <div className={`max-w-sm w-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-lg p-8 sm:p-12 border border-white dark:border-gray-700 text-center ${error ? 'animate-shake' : ''}`}>
                <h1 className="text-2xl font-light text-[#3a5a40] dark:text-emerald-300 mb-4">Enter PIN</h1>
                <p className="text-md text-[#344e41] dark:text-gray-200 mb-8">
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
                                className="w-12 h-14 text-center text-2xl font-semibold bg-white/50 dark:bg-gray-700/50 border-2 border-white dark:border-gray-600 rounded-lg text-[#344e41] dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#a3b18a] dark:focus:ring-emerald-400 transition"
                                autoFocus={index === 0}
                            />
                        ))}
                    </div>
                    <button
                        type="submit"
                        className="bg-[#588157] text-white px-8 py-3 rounded-lg text-lg font-medium shadow hover:bg-[#3a5a40] transition-colors duration-300"
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
