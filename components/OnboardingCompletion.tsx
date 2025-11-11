import React, { useState } from 'react';
import { InsightFrequency } from '../types';

interface OnboardingCompletionProps {
    onComplete: (insightFrequency: InsightFrequency) => void;
}

const OnboardingCompletion: React.FC<OnboardingCompletionProps> = ({ onComplete }) => {
    const [frequency, setFrequency] = useState<InsightFrequency>('daily');

    const options = {
        'daily': {
            title: 'Daily Insights',
            description: 'Receive a reflection after each journal entry.'
        },
        'weekly': {
            title: 'Weekly Summaries',
            description: 'Receive a summary at the end of each week, with no daily analysis.'
        },
        'none': {
            title: 'No Insights',
            description: 'Use this as a private journal. No AI analysis will be performed.'
        }
    };

    const getOptionClass = (value: InsightFrequency) => {
        const base = "w-full text-left p-4 rounded-lg border-2 transition-colors cursor-pointer";
        if (frequency === value) {
            return `${base} bg-emerald-50 dark:bg-emerald-900/50 border-[var(--accent-primary)] dark:border-[var(--accent-secondary)]`;
        }
        return `${base} bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500`;
    };

    return (
        <div className="flex items-center justify-center min-h-screen p-4 sm:p-6">
            <div className="w-full max-w-lg bg-[var(--card-bg)] backdrop-blur-sm rounded-2xl shadow-lg p-8 sm:p-12 border border-[var(--card-border)] animate-fade-in">
                <h2 className="text-2xl font-light text-[var(--text-secondary)] mb-2 text-center">
                    Set Your Intention
                </h2>
                <p className="text-center text-md font-light text-gray-600 dark:text-gray-400 mb-8">
                    How often would you like to receive AI-powered reflections? You can change this any time in settings.
                </p>

                <div className="space-y-4 mb-8">
                    {(Object.keys(options) as InsightFrequency[]).map((key) => (
                        <div key={key} onClick={() => setFrequency(key)} className={getOptionClass(key)}>
                            <h3 className="font-semibold text-[var(--text-secondary)]">{options[key].title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{options[key].description}</p>
                        </div>
                    ))}
                </div>

                <button 
                    onClick={() => onComplete(frequency)} 
                    className="w-full py-3 rounded-lg bg-[var(--accent-primary)] text-white font-medium text-lg hover:bg-[var(--accent-primary-hover)] transition-colors duration-300"
                >
                    Start My Journey
                </button>
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
                    Your first prompt is ready. You can begin today or return tomorrow.
                </p>
            </div>
             <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out;
                }
            `}</style>
        </div>
    );
};

export default OnboardingCompletion;