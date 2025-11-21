
import React, { useState } from 'react';
import { Settings, HunchType } from '../types';

interface JournalInputModalProps {
    prompt: string | null | undefined;
    onSave: (text: string, reanalyze: boolean, hunchType?: HunchType) => void;
    onClose: () => void;
    isSaving: boolean;
    initialText?: string;
    settings: Settings;
    entryType: 'daily' | 'hunch';
    isEditMode: boolean;
    initialHunchType?: HunchType;
}

const CloseIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);

const JournalInputModal: React.FC<JournalInputModalProps> = ({ prompt, onSave, onClose, isSaving, initialText, settings, entryType, isEditMode, initialHunchType }) => {
    const [text, setText] = useState(initialText || '');
    const [hunchType, setHunchType] = useState<HunchType>(initialHunchType || 'hunch');

    const handleSave = (reanalyze: boolean) => {
        if (text.trim()) {
            onSave(text, reanalyze, entryType === 'hunch' ? hunchType : undefined);
        }
    };

    const renderHunchTypeSelector = () => {
        if (entryType !== 'hunch') return null;
        
        const types: {id: HunchType, label: string, color: string}[] = [
            { id: 'insight', label: 'Insight', color: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-purple-300' },
            { id: 'dream', label: 'Dream', color: 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 border-sky-300' },
            { id: 'hunch', label: 'Hunch', color: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-300' },
        ];

        return (
            <div className="flex gap-2 mb-4 justify-center">
                {types.map(t => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => setHunchType(t.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${hunchType === t.id ? `ring-2 ring-offset-1 ring-[var(--ring-color)] ${t.color}` : 'bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-500'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
        );
    };

    const renderButtons = () => {
        const isDisabled = isSaving || !text.trim() || !prompt;
        const isHunch = entryType === 'hunch';

        // --- EDIT MODE ---
        if (isEditMode) {
            const canReanalyze = !isHunch && settings.dailyAnalysis;
            if (canReanalyze) {
                return (
                    <div className="flex flex-col sm:flex-row gap-3 mt-4">
                        <button
                            type="button"
                            onClick={() => handleSave(false)}
                            disabled={isDisabled}
                            className="w-full py-3 rounded-lg border border-[var(--accent-primary)] text-[var(--accent-primary)] dark:border-[var(--accent-secondary)] dark:text-[var(--accent-secondary)] font-medium text-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSave(true)}
                            disabled={isDisabled}
                            className="w-full py-3 rounded-lg bg-[var(--accent-primary)] text-white font-medium text-lg hover:bg-[var(--accent-primary-hover)] transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isSaving ? 'Saving...' : 'Save & Re-analyze'}
                        </button>
                    </div>
                );
            }
            return (
                 <button
                    type="button"
                    onClick={() => handleSave(false)}
                    disabled={isDisabled}
                    className="w-full mt-4 py-3 rounded-lg bg-[var(--accent-primary)] text-white font-medium text-lg hover:bg-[var(--accent-primary-hover)] transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            );
        }

        // --- NEW ENTRY MODE ---
        if (isHunch) {
            return (
                <button
                    type="button"
                    onClick={() => handleSave(false)}
                    disabled={isDisabled}
                    className="w-full mt-4 py-3 rounded-lg bg-indigo-500 text-white font-medium text-lg hover:bg-indigo-600 transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    Save {hunchType.charAt(0).toUpperCase() + hunchType.slice(1)}
                </button>
            );
        }

        return (
            <button
                type="button"
                onClick={() => handleSave(settings.dailyAnalysis)}
                disabled={isDisabled}
                className="w-full mt-4 py-3 rounded-lg bg-[var(--accent-primary)] text-white font-medium text-lg hover:bg-[var(--accent-primary-hover)] transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                {isSaving ? 'Processing...' : (settings.dailyAnalysis ? 'Save & Reflect' : 'Save Entry')}
            </button>
        );
    };


    return (
        <div className="fixed inset-0 bg-gradient-to-br from-[var(--bg-from)] to-[var(--bg-to)] z-40 animate-fade-in-fast" role="dialog" aria-modal="true">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
                aria-label="Close writing view"
            >
                <CloseIcon className="w-8 h-8" />
            </button>
            <div className="flex flex-col h-full p-4 md:p-8">
                <main className="flex-1 overflow-y-auto flex items-center justify-center">
                    <div className="max-w-3xl w-full h-full flex flex-col pt-12">
                        <h2 className="text-xl md:text-2xl font-light text-[var(--text-secondary)] mb-6 text-center whitespace-pre-wrap">{prompt || 'Loading...'}</h2>
                        {renderHunchTypeSelector()}
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Write freely..."
                            className="w-full flex-1 bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--card-border)] rounded-xl p-4 text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)] transition-all resize-none text-lg font-light leading-relaxed"
                            disabled={isSaving || !prompt}
                            autoFocus
                        />
                        {renderButtons()}
                    </div>
                </main>
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

export default JournalInputModal;
