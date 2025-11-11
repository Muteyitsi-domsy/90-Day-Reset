import React, { useState } from 'react';
import { Settings, InsightFrequency, UserProfile } from '../types';

interface SettingsModalProps {
    settings: Settings;
    userProfile: UserProfile | null;
    onClose: () => void;
    onSave: (newSettings: Settings) => void;
    onPauseJourney: () => void;
    onResumeJourney: () => void;
}

const CloseIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, userProfile, onClose, onSave, onPauseJourney, onResumeJourney }) => {
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState('');

    const handleThemeModeChange = (themeMode: 'light' | 'dark' | 'system') => {
        onSave({ ...settings, themeMode });
    };

    const handleThemeChange = (theme: 'default' | 'ocean' | 'sunset' | 'forest') => {
        onSave({ ...settings, theme });
    };

    const handleInsightChange = (frequency: InsightFrequency) => {
        onSave({ ...settings, insightFrequency: frequency });
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

    const handlePause = () => {
        onPauseJourney();
        onClose();
    };

    const handleResume = () => {
        onResumeJourney();
        onClose();
    };
    
    const themeOptions: { id: Settings['theme']; label: string }[] = [
        { id: 'default', label: 'Default' },
        { id: 'ocean', label: 'Ocean' },
        { id: 'sunset', label: 'Sunset' },
        { id: 'forest', label: 'Forest' },
    ];

    const getThemeModeButtonClass = (themeMode: 'light' | 'dark' | 'system') => {
        const base = "px-4 py-2 rounded-lg transition-colors text-sm font-medium";
        if (settings.themeMode === themeMode) {
            return `${base} bg-[var(--accent-primary)] text-white`;
        }
        return `${base} bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600`;
    };

    const getInsightButtonClass = (frequency: InsightFrequency) => {
        const base = "px-4 py-2 rounded-lg transition-colors text-sm font-medium";
        if (settings.insightFrequency === frequency) {
            return `${base} bg-[var(--accent-primary)] text-white`;
        }
        return `${base} bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600`;
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in-fast" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg max-w-md w-full p-6 relative overflow-y-auto max-h-[90vh]">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
                    aria-label="Close settings"
                >
                    <CloseIcon className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-light text-[var(--text-secondary)] mb-6 text-center">Settings</h2>

                <div className="space-y-6">
                    {/* Theme Mode Settings */}
                    <div>
                        <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200 mb-3">Theme Mode</h3>
                        <div className="flex justify-center space-x-2 p-1 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
                           <button onClick={() => handleThemeModeChange('light')} className={getThemeModeButtonClass('light')}>Light</button>
                           <button onClick={() => handleThemeModeChange('dark')} className={getThemeModeButtonClass('dark')}>Dark</button>
                           <button onClick={() => handleThemeModeChange('system')} className={getThemeModeButtonClass('system')}>System</button>
                        </div>
                    </div>

                    {/* Theme Color Settings */}
                    <div>
                        <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200 mb-3">Theme</h3>
                        <div className="grid grid-cols-2 gap-2">
                           {themeOptions.map(({id, label}) => (
                               <button 
                                key={id} 
                                onClick={() => handleThemeChange(id)} 
                                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium border-2 ${settings.theme === id ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'}`}
                                >
                                    {label}
                                </button>
                           ))}
                        </div>
                    </div>

                    {/* Insight Frequency Settings */}
                    <div>
                        <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200 mb-3">Insight Frequency</h3>
                         <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Choose how often you receive AI-powered reflections.</p>
                        <div className="flex justify-center space-x-2 p-1 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
                           <button onClick={() => handleInsightChange('daily')} className={getInsightButtonClass('daily')}>Daily</button>
                           <button onClick={() => handleInsightChange('weekly')} className={getInsightButtonClass('weekly')}>Weekly</button>
                           <button onClick={() => handleInsightChange('none')} className={getInsightButtonClass('none')}>None</button>
                        </div>
                    </div>
                    
                    {/* Journey Status */}
                    {userProfile && !userProfile.journeyCompleted && (
                        <div>
                             <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200 mb-3">Journey Status</h3>
                            {userProfile.isPaused ? (
                                <>
                                    <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-3">Your journey is currently paused. Resume when you're ready.</p>
                                    <button onClick={handleResume} className="w-full py-2 rounded-lg bg-[var(--accent-primary)] text-white font-medium hover:bg-[var(--accent-primary-hover)] transition-colors">
                                        Resume Journey
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-3">Need a break? Pause your journey to save your progress and streak.</p>
                                    <button onClick={handlePause} className="w-full py-2 rounded-lg border border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-400 font-medium hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors">
                                        Pause Journey
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* Final Summary Settings */}
                    <div>
                        <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200 mb-3">Final Summary</h3>
                        <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-900/50 p-3 rounded-lg">
                            <label htmlFor="includeHunches" className="text-sm text-gray-800 dark:text-gray-200 cursor-pointer flex-1 pr-2">
                                Include Intuitive Insights
                                <p className="text-xs text-gray-600 dark:text-gray-400 font-light">Allow AI to analyze dreams & hunches.</p>
                            </label>
                            <input
                                type="checkbox"
                                id="includeHunches"
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                checked={settings.includeHunchesInFinalSummary}
                                onChange={e => onSave({ ...settings, includeHunchesInFinalSummary: e.target.checked })}
                            />
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
                                    className="flex-grow w-full bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)] transition"
                                />
                                <button
                                    onClick={handlePinSave}
                                    className="px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white font-medium text-sm hover:bg-[var(--accent-primary-hover)] transition-colors"
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