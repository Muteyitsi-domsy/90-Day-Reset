import React, { useState } from 'react';
import { Settings } from '../types';

interface JournalInputModalProps {
    prompt: string | null | undefined;
    onSave: (text: string, reanalyze: boolean) => void;
    onClose: () => void;
    isSaving: boolean;
    initialText?: string;
    settings: Settings;
    entryType: 'daily' | 'hunch';
    isEditMode: boolean;
}

const CloseIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);

const JournalInputModal: React.FC<JournalInputModalProps> = ({ prompt, onSave, onClose, isSaving, initialText, settings, entryType, isEditMode }) => {
    const [text, setText] = useState(initialText || '');

    const handleSave = (reanalyze: boolean) => {
        if (text.trim()) {
            onSave(text, reanalyze);
        }
    };

    const renderButtons = () => {
        const isDisabled = isSaving || !text.trim() || !prompt;
        const isHunch = entryType === 'hunch';

        // --- EDIT MODE ---
        if (isEditMode) {
            const canReanalyze = !isHunch && settings.insightFrequency === 'daily';
            if (canReanalyze) {
                return (
                    <div className="flex flex-col sm:flex-row gap-3 mt-4">
                        <button
                            type="button"
                            onClick={() => handleSave(false)}
                            disabled={isDisabled}
                            className="w-full py-3 rounded-lg border border-[#588157] text-[#588157] dark:border-emerald-400 dark:text-emerald-400 font-medium text-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSave(true)}
                            disabled={isDisabled}
                            className="w-full py-3 rounded-lg bg-[#588157] text-white font-medium text-lg hover:bg-[#3a5a40] transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isSaving ? 'Saving...' : 'Save & Re-analyze'}
                        </button>
                    </div>
                );
            }
            // Edit mode but cannot re-analyze (it's a hunch or insights are off)
            return (
                 <button
                    type="button"
                    onClick={() => handleSave(false)}
                    disabled={isDisabled}
                    className="w-full mt-4 py-3 rounded-lg bg-[#588157] text-white font-medium text-lg hover:bg-[#3a5a40] transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
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
                    Save Insight
                </button>
            );
        }

        // New daily entry
        return (
            <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isDisabled}
                className="w-full mt-4 py-3 rounded-lg bg-[#588157] text-white font-medium text-lg hover:bg-[#3a5a40] transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                {isSaving ? 'Reflecting...' : 'Save & Reflect'}
            </button>
        );
    };


    return (
        <div className="fixed inset-0 bg-gradient-to-br from-[#fdfbf7] to-[#f4f1ea] dark:from-gray-900 dark:to-gray-800 z-40 animate-fade-in-fast" role="dialog" aria-modal="true">
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
                        <h2 className="text-xl md:text-2xl font-light text-[#3a5a40] dark:text-emerald-300 mb-6 text-center whitespace-pre-wrap">{prompt || 'Loading...'}</h2>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Write freely..."
                            className="w-full flex-1 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white dark:border-gray-700 rounded-xl p-4 text-[#344e41] dark:text-gray-100 placeholder-[#8a9b78] dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#a3b18a] dark:focus:ring-emerald-400 transition-all resize-none text-lg font-light leading-relaxed"
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