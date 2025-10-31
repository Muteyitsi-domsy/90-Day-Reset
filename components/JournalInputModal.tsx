import React, { useState } from 'react';

interface JournalInputModalProps {
    prompt: string | null | undefined;
    onSave: (text: string) => void;
    onClose: () => void;
    isSaving: boolean;
}

const CloseIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);

const JournalInputModal: React.FC<JournalInputModalProps> = ({ prompt, onSave, onClose, isSaving }) => {
    const [text, setText] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            onSave(text);
        }
    };

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-[#fdfbf7] to-[#f4f1ea] z-40 animate-fade-in-fast" role="dialog" aria-modal="true">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition-colors"
                aria-label="Close writing view"
            >
                <CloseIcon className="w-8 h-8" />
            </button>
            <div className="flex flex-col h-full p-4 md:p-8">
                <main className="flex-1 overflow-y-auto flex items-center justify-center">
                    <form onSubmit={handleSubmit} className="max-w-3xl w-full h-full flex flex-col pt-12">
                        <h2 className="text-xl md:text-2xl font-light text-[#3a5a40] mb-6 text-center whitespace-pre-wrap">{prompt || 'Loading...'}</h2>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Write freely..."
                            className="w-full flex-1 bg-transparent p-2 text-[#344e41] placeholder-[#8a9b78] focus:outline-none resize-none text-lg font-light leading-relaxed"
                            disabled={isSaving || !prompt}
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={isSaving || !text.trim() || !prompt}
                            className="w-full mt-4 py-3 rounded-lg bg-[#588157] text-white font-medium text-lg hover:bg-[#3a5a40] transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isSaving ? 'Reflecting...' : 'Save & Reflect'}
                        </button>
                    </form>
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
