import React from 'react';
import { SummaryData } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface WeeklySummaryProps {
  data: SummaryData;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-[var(--card-bg-secondary)] p-4 rounded-lg">
    <h3 className="font-semibold text-lg text-[var(--accent-primary)] dark:text-[var(--accent-secondary)] mb-2">{title}</h3>
    {children}
  </div>
);

const WeeklySummary: React.FC<WeeklySummaryProps> = ({ data }) => {
    // Handle loading state if placeholder data is passed
    if ((data as any).status === 'loading') {
        return (
            <div className="rounded-2xl p-6 border bg-sky-50/70 dark:bg-sky-900/40 border-sky-200 dark:border-sky-800 text-center animate-fade-in">
                <h2 className="text-xl font-light text-sky-800 dark:text-sky-200 mb-2">Generating Your Reflection...</h2>
                <p className="text-sm text-sky-700 dark:text-sky-300 mb-4">This can take a moment. Thank you for your patience.</p>
                <div className="flex justify-center">
                    <LoadingSpinner />
                </div>
            </div>
        );
    }

    // Check if this is old format data (has themes/challenges) vs new format (has dominantThemes/tensions)
    const isOldFormat = !!(data as any).themes && !(data as any).dominantThemes;

    // If old format, render legacy view
    if (isOldFormat) {
        const oldData = data as any;
        return (
            <div className="rounded-2xl p-6 border bg-sky-50/70 dark:bg-sky-900/40 border-sky-200 dark:border-sky-800 animate-fade-in">
                <header className="text-center mb-6">
                    <h2 className="text-2xl font-light text-sky-800 dark:text-sky-200">Weekly Reflection: Week {oldData.period}</h2>
                    <p className="text-sm text-sky-600 dark:text-sky-400">{oldData.dateRange}</p>
                </header>
                <div className="space-y-4">
                    {oldData.themes && oldData.themes.length > 0 && (
                        <Section title="Key Themes">
                            <ul className="list-disc list-inside space-y-1 font-light text-[var(--text-primary)]">
                                {oldData.themes.map((theme: string, i: number) => <li key={i}>{theme}</li>)}
                            </ul>
                        </Section>
                    )}
                    {oldData.growth && oldData.growth.length > 0 && (
                        <Section title="Observed Growth">
                            <div className="space-y-3">
                                {oldData.growth.map((g: any, i: number) => (
                                    <div key={i}>
                                        <p className="font-semibold text-sky-900 dark:text-sky-100">{g.observation}</p>
                                        <p className="font-light text-sm text-sky-700 dark:text-sky-300 pl-2 border-l-2 border-sky-300 dark:border-sky-600 italic">"{g.evidence}"</p>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}
                    {oldData.notableExcerpts && oldData.notableExcerpts.length > 0 && (
                        <Section title="Notable Excerpts">
                            <div className="space-y-3 font-light text-[var(--text-primary)] italic">
                                {oldData.notableExcerpts.map((excerpt: string, i: number) => <p key={i}>"{excerpt}"</p>)}
                            </div>
                        </Section>
                    )}
                    {oldData.encouragement && (
                        <div className="text-center pt-4">
                            <p className="text-lg italic text-sky-800 dark:text-sky-200">"{oldData.encouragement}"</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // New format rendering
    return (
        <div className="rounded-2xl p-6 border bg-sky-50/70 dark:bg-sky-900/40 border-sky-200 dark:border-sky-800 animate-fade-in">
            <header className="text-center mb-6">
                <h2 className="text-2xl font-light text-sky-800 dark:text-sky-200">{data.title}</h2>
                <p className="text-sm text-sky-600 dark:text-sky-400">{data.dateRange}</p>
            </header>

            <div className="space-y-4">
                {/* Emotional Terrain */}
                {data.emotionalTerrain && (
                    <div className="text-center px-4 py-3 bg-sky-100/50 dark:bg-sky-800/30 rounded-lg">
                        <p className="font-light text-sky-800 dark:text-sky-200 italic leading-relaxed">
                            {data.emotionalTerrain}
                        </p>
                    </div>
                )}

                {/* Dominant Themes */}
                {data.dominantThemes && data.dominantThemes.length > 0 && (
                    <Section title="What Emerged">
                        <ul className="list-disc list-inside space-y-1 font-light text-[var(--text-primary)]">
                            {data.dominantThemes.map((theme, i) => <li key={i}>{theme}</li>)}
                        </ul>
                    </Section>
                )}

                {/* Patterns Grid */}
                {((data.recurringThreads && data.recurringThreads.length > 0) || (data.shifts && data.shifts.length > 0)) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {data.recurringThreads && data.recurringThreads.length > 0 && (
                            <Section title="Recurring Threads">
                                <ul className="list-disc list-inside space-y-1 font-light text-[var(--text-primary)]">
                                    {data.recurringThreads.map((thread, i) => <li key={i}>{thread}</li>)}
                                </ul>
                            </Section>
                        )}
                        {data.shifts && data.shifts.length > 0 && (
                            <Section title="Shifts Observed">
                                <ul className="list-disc list-inside space-y-1 font-light text-[var(--text-primary)]">
                                    {data.shifts.map((shift, i) => <li key={i}>{shift}</li>)}
                                </ul>
                            </Section>
                        )}
                    </div>
                )}

                {/* Mirrors - User's Own Words */}
                {data.mirrors && data.mirrors.length > 0 && (
                    <Section title="Your Words">
                        <div className="space-y-3">
                            {data.mirrors.map((mirror, i) => (
                                <div key={i} className="pl-3 border-l-2 border-sky-300 dark:border-sky-600">
                                    <p className="text-xs font-medium text-sky-600 dark:text-sky-400 mb-1">
                                        {mirror.pattern} — Day {mirror.day}
                                    </p>
                                    <p className="font-light text-[var(--text-primary)] italic">
                                        "{mirror.excerpt}"
                                    </p>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                {/* Tensions */}
                {data.tensions && data.tensions.length > 0 && (
                    <Section title="Present Tensions">
                        <div className="space-y-2 font-light text-[var(--text-primary)]">
                            {data.tensions.map((tension, i) => (
                                <p key={i} className="pl-3 border-l-2 border-amber-300 dark:border-amber-600">
                                    {tension}
                                </p>
                            ))}
                        </div>
                    </Section>
                )}

                {/* Synthesis - Closing Reflection */}
                {data.synthesis && (
                    <div className="text-center pt-4 px-4">
                        <p className="text-lg font-light text-sky-800 dark:text-sky-200 leading-relaxed">
                            {data.synthesis}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WeeklySummary;
