import React, { useState } from 'react';
import { Settings } from '../types';

interface SettingsModalProps {
    settings: Settings;
    onClose: () => void;
    onSave: (newSettings: Settings) => void;
}

const CloseIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onClose, onSave }) => {
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState('');

    const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
        onSave({ ...settings, theme });
    };

    const handlePinSave = () => {
        if (/^[a-zA-Z]{4}$/.test(pinInput)) {
            onSave({ ...settings, pin: pinInput.toLowerCase() });
            setPinInput('');
            setPinError('');
        } else {
            setPinError('PIN must be exactly 4 letters.');
        }
    };

    const handlePinRemove = () => {
        const { pin, ...rest } = settings;
        onSave(rest);
        setPinInput('');
        setPinError('');
    };

    const getThemeButtonClass = (theme: 'light' | 'dark' | 'system') => {
        const base = "px-4 py-2 rounded-lg transition-colors text-sm font-medium";
        if (settings.theme === theme) {
            return `${base} bg-[#588157] text-white`;
        }
        return `${base} bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600`;
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in-fast" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg max-w-md w-full p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
                    aria-label="Close settings"
                >
                    <CloseIcon className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-light text-[#3a5a40] dark:text-emerald-300 mb-6 text-center">Settings</h2>

                <div className="space-y-6">
                    {/* Appearance Settings */}
                    <div>
                        <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200 mb-3">Appearance</h3>
                        <div className="flex justify-center space-x-2 p-1 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
                           <button onClick={() => handleThemeChange('light')} className={getThemeButtonClass('light')}>Light</button>
                           <button onClick={() => handleThemeChange('dark')} className={getThemeButtonClass('dark')}>Dark</button>
                           <button onClick={() => handleThemeChange('system')} className={getThemeButtonClass('system')}>System</button>
                        </div>
                    </div>

                    {/* Security Settings */}
                    <div>
                        <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200 mb-3">Security</h3>
                        <div className="space-y-2">
                             <label className="text-sm text-gray-600 dark:text-gray-400">Set a 4-letter PIN to lock your journal.</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={pinInput}
                                    onChange={(e) => {
                                        setPinInput(e.target.value);
                                        if (pinError) setPinError('');
                                    }}
                                    placeholder={settings.pin ? 'Enter new PIN' : 'Enter 4 letters'}
                                    maxLength={4}
                                    className="flex-grow w-full bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-[#344e41] dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#a3b18a] dark:focus:ring-emerald-400 transition"
                                />
                                <button
                                    onClick={handlePinSave}
                                    className="px-4 py-2 rounded-lg bg-[#588157] text-white font-medium text-sm hover:bg-[#3a5a40] transition-colors"
                                >
                                    Save
                                </button>
                            </div>
                            {pinError && <p className="text-red-500 text-xs mt-1">{pinError}</p>}
                             {settings.pin && (
                                <button 
                                    onClick={handlePinRemove}
                                    className="w-full text-center text-sm text-red-600 dark:text-red-400 hover:underline mt-2"
                                >
                                    Remove PIN
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="w-full mt-8 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                    Done
                </button>
            </div>
             <style>{`
                @keyframes fade-in-fast {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in-fast {
                    animation: fade-in-fast 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default SettingsModal;
