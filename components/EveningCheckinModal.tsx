import React, { useState } from 'react';
import { EveningCheckin } from '../types';

interface EveningCheckinModalProps {
    onSave: (data: EveningCheckin) => void;
    onClose: () => void;
}

const CloseIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);

const EveningCheckinModal: React.FC<EveningCheckinModalProps> = ({ onSave, onClose }) => {
    const [completedMicroAction, setCompletedMicroAction] = useState<'yes' | 'no' | 'partially' | null>(null);
    const [alignmentReflection, setAlignmentReflection] = useState('');
    const [improvementReflection, setImprovementReflection] = useState('');

    const handleSave = () => {
        if (completedMicroAction && alignmentReflection.trim() && improvementReflection.trim()) {
            onSave({
                completedMicroAction,
                alignmentReflection,
                improvementReflection
            });
        }
    };

    const isSaveDisabled = !completedMicroAction || !alignmentReflection.trim() || !improvementReflection.trim();

    const getRadioClass = (value: string) => {
        const base = "flex-1 text-center px-4 py-3 rounded-lg transition-colors text-md font-medium cursor-pointer";
        if (completedMicroAction === value) {
            return `${base} bg-[var(--accent-primary)] text-white`;
        }
        return `${base} bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600`;
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in-fast" role="dialog" aria-modal="true">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg max-w-lg w-full p-6 relative flex flex-col max-h-[90vh]">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
                    aria-label="Close check-in"
                >
                    <CloseIcon className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-light text-center text-[var(--text-secondary)] mb-6">Evening Check-in 🌙</h2>
                
                <div className="space-y-6 overflow-y-auto pr-2">
                    <div>
                        <label className="block text-lg font-light text-[var(--text-primary)] mb-3">Did you complete your micro-action today?</label>
                        <div className="flex justify-center space-x-2 p-1 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
                            <label className={getRadioClass('yes')}>
                                <input type="radio" name="microAction" value="yes" checked={completedMicroAction === 'yes'} onChange={() => setCompletedMicroAction('yes')} className="sr-only" />
                                Yes
                            </label>
                            <label className={getRadioClass('partially')}>
                                <input type="radio" name="microAction" value="partially" checked={completedMicroAction === 'partially'} onChange={() => setCompletedMicroAction('partially')} className="sr-only" />
                                Partially
                            </label>
                            <label className={getRadioClass('no')}>
                                <input type="radio" name="microAction" value="no" checked={completedMicroAction === 'no'} onChange={() => setCompletedMicroAction('no')} className="sr-only" />
                                No
                            </label>
                        </div>
                    </div>
                    <div>
                        <label className="block text-lg font-light text-[var(--text-primary)] mb-3">Were your actions today aligned with your Ideal Self?</label>
                        <textarea
                            value={alignmentReflection}
                            onChange={(e) => setAlignmentReflection(e.target.value)}
                            placeholder="Reflect on moments of alignment or misalignment..."
                            rows={4}
                            className="w-full bg-[var(--input-bg)] border border-gray-300 dark:border-gray-600 rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)] transition-all resize-none font-light"
                        />
                    </div>
                     <div>
                        <label className="block text-lg font-light text-[var(--text-primary)] mb-3">What's one thing you hope to do better tomorrow?</label>
                        <textarea
                            value={improvementReflection}
                            onChange={(e) => setImprovementReflection(e.target.value)}
                            placeholder="A small adjustment for a better tomorrow..."
                            rows={3}
                             className="w-full bg-[var(--input-bg)] border border-gray-300 dark:border-gray-600 rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)] transition-all resize-none font-light"
                        />
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaveDisabled}
                    className="w-full mt-6 py-3 rounded-lg bg-[var(--accent-primary)] text-white font-medium text-lg hover:bg-[var(--accent-primary-hover)] transition-colors duration-300 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                    Save Check-in
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

export default EveningCheckinModal;