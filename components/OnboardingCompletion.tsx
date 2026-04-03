
import React, { useState, useEffect } from 'react';

interface OnboardingCompletionProps {
    onComplete: (settings: { dailyAnalysis: boolean; weeklyReports: boolean; monthlyReports: boolean }) => void;
}

type FrequencyOption = 'daily' | 'weekly' | 'monthly';

const featureItems = [
    { icon: '🗓', label: '90-Day Identity Reset', detail: 'Daily prompts personalised to your reset arc.', color: '#1E7A8A' },
    { icon: '📝', label: 'Daily Journal', detail: 'Capture moods and emotions with guided prompts.', color: '#4E9B58' },
    { icon: '🔄', label: 'Flip Journal', detail: 'Reframe challenges through your future self\'s eyes.', color: '#E87520' },
    { icon: '☰', label: 'Switch journals from the menu', detail: 'Tap the colour-coded toggle — teal for 90-Day, green for Daily, orange for Flip.', color: undefined },
];

const OnboardingCompletion: React.FC<OnboardingCompletionProps> = ({ onComplete }) => {
    const [selected, setSelected] = useState<Set<FrequencyOption>>(new Set(['daily']));
    const [showFeatureReveal, setShowFeatureReveal] = useState(false);
    const [pendingSettings, setPendingSettings] = useState<{ dailyAnalysis: boolean; weeklyReports: boolean; monthlyReports: boolean } | null>(null);
    const [visibleItems, setVisibleItems] = useState(0);
    const [showCta, setShowCta] = useState(false);

    const options: Record<FrequencyOption, { title: string; description: string }> = {
        'daily': {
            title: 'Daily Insights',
            description: 'Receive a reflection after each journal entry.'
        },
        'weekly': {
            title: 'Weekly Summaries',
            description: 'Receive a summary at the end of each week.'
        },
        'monthly': {
            title: 'Monthly Summaries',
            description: 'Receive a summary at the end of each month.'
        }
    };

    const isNoneSelected = selected.size === 0;

    const toggleOption = (option: FrequencyOption) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(option)) {
                next.delete(option);
            } else {
                next.add(option);
            }
            return next;
        });
    };

    const selectNone = () => {
        setSelected(new Set());
    };

    const getOptionClass = (value: FrequencyOption) => {
        const base = "w-full text-left p-4 rounded-lg border-2 transition-colors cursor-pointer flex items-center gap-3";
        if (selected.has(value)) {
            return `${base} bg-emerald-50 dark:bg-emerald-900/50 border-[var(--accent-primary)] dark:border-[var(--accent-secondary)]`;
        }
        return `${base} bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500`;
    };

    const getNoneClass = () => {
        const base = "w-full text-left p-4 rounded-lg border-2 transition-colors cursor-pointer flex items-center gap-3";
        if (isNoneSelected) {
            return `${base} bg-emerald-50 dark:bg-emerald-900/50 border-[var(--accent-primary)] dark:border-[var(--accent-secondary)]`;
        }
        return `${base} bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500`;
    };

    useEffect(() => {
        if (!showFeatureReveal) return;
        let i = 0;
        const interval = setInterval(() => {
            i += 1;
            setVisibleItems(i);
            if (i >= featureItems.length) {
                clearInterval(interval);
                setTimeout(() => setShowCta(true), 400);
            }
        }, 500);
        return () => clearInterval(interval);
    }, [showFeatureReveal]);

    const handleComplete = () => {
        setPendingSettings({
            dailyAnalysis: selected.has('daily'),
            weeklyReports: selected.has('weekly'),
            monthlyReports: selected.has('monthly'),
        });
        setShowFeatureReveal(true);
    };

    const handleBegin = () => {
        if (pendingSettings) onComplete(pendingSettings);
    };

    const CheckboxIcon: React.FC<{ checked: boolean }> = ({ checked }) => (
        <div className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
            checked
                ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] dark:bg-[var(--accent-secondary)] dark:border-[var(--accent-secondary)]'
                : 'border-gray-400 dark:border-gray-500'
        }`}>
            {checked && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
            )}
        </div>
    );

    if (showFeatureReveal) {
        return (
            <div className="flex items-center justify-center min-h-screen px-4 pb-4 sm:px-6 sm:pb-6 safe-area-top">
                <div className="w-full max-w-lg bg-[var(--card-bg)] backdrop-blur-sm rounded-2xl shadow-lg p-8 sm:p-12 border border-[var(--card-border)] animate-fade-in">
                    <div className="text-center mb-8">
                        <p className="text-3xl mb-2">🌿</p>
                        <h2 className="text-2xl font-light text-[var(--accent-primary)] dark:text-[var(--accent-secondary)] mb-1">
                            Happy Journaling!
                        </h2>
                        <p className="text-[var(--text-secondary)] font-light">Here's what's waiting for you:</p>
                    </div>

                    <div className="space-y-4 mb-8">
                        {featureItems.map((item, index) => (
                            <div
                                key={index}
                                className="flex items-start gap-4 p-4 bg-[var(--card-bg-secondary)] rounded-xl border border-[var(--card-border)] transition-all duration-500"
                                style={{
                                    opacity: index < visibleItems ? 1 : 0,
                                    transform: index < visibleItems ? 'translateY(0)' : 'translateY(12px)',
                                }}
                            >
                                <span className="text-2xl mt-0.5">{item.icon}</span>
                                <div>
                                    <p className="font-medium" style={item.color ? { color: item.color } : { color: 'var(--text-primary)' }}>{item.label}</p>
                                    <p className="text-sm text-[var(--text-secondary)]">{item.detail}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div
                        className="transition-all duration-500 mb-5"
                        style={{ opacity: showCta ? 1 : 0, transform: showCta ? 'translateY(0)' : 'translateY(8px)' }}
                    >
                        <p className="text-xs text-center text-gray-400 dark:text-gray-500 leading-relaxed">
                            Pro tip: mood patterns emerge naturally with consistent journalling — the more you log, the more the app learns about you.
                        </p>
                    </div>

                    <div
                        className="transition-all duration-500"
                        style={{ opacity: showCta ? 1 : 0, transform: showCta ? 'translateY(0)' : 'translateY(8px)' }}
                    >
                        <button
                            onClick={handleBegin}
                            disabled={!showCta}
                            className="w-full py-3 rounded-lg bg-[var(--accent-primary)] text-white font-medium text-lg hover:bg-[var(--accent-primary-hover)] transition-colors duration-300 disabled:opacity-0"
                        >
                            Let's Begin 🌿
                        </button>
                    </div>
                </div>
                <style>{`
                    @keyframes fade-in {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .animate-fade-in { animation: fade-in 0.5s ease-out; }
                `}</style>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen px-4 pb-4 sm:px-6 sm:pb-6 safe-area-top">
            <div className="w-full max-w-lg bg-[var(--card-bg)] backdrop-blur-sm rounded-2xl shadow-lg p-8 sm:p-12 border border-[var(--card-border)] animate-fade-in">
                <h2 className="text-2xl font-light text-[var(--text-secondary)] mb-2 text-center">
                    Set Your Intention
                </h2>
                <p className="text-center text-md font-light text-gray-600 dark:text-gray-400 mb-2">
                    How often would you like to receive AI-powered reflections?
                </p>
                <p className="text-center text-sm font-light text-gray-500 dark:text-gray-500 mb-8">
                    Select all that apply.
                </p>

                <div className="space-y-4 mb-8">
                    {(Object.keys(options) as FrequencyOption[]).map((key) => (
                        <div key={key} onClick={() => toggleOption(key)} className={getOptionClass(key)}>
                            <CheckboxIcon checked={selected.has(key)} />
                            <div>
                                <h3 className="font-semibold text-[var(--text-secondary)]">{options[key].title}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{options[key].description}</p>
                            </div>
                        </div>
                    ))}
                    <div onClick={selectNone} className={getNoneClass()}>
                        <CheckboxIcon checked={isNoneSelected} />
                        <div>
                            <h3 className="font-semibold text-[var(--text-secondary)]">No Insights</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Use this as a private journal. No AI analysis will be performed.</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleComplete}
                    className="w-full py-3 rounded-lg bg-[var(--accent-primary)] text-white font-medium text-lg hover:bg-[var(--accent-primary-hover)] transition-colors duration-300"
                >
                    Start My Journey
                </button>
                <div className="text-center mt-6 space-y-2">
                    <p className="text-sm font-medium text-[var(--text-secondary)]">
                        You can always customize your report preferences in Settings.
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Your first prompt is ready. You can begin today or return tomorrow.
                    </p>
                </div>
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
