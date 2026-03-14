import React from 'react';
import { SummaryData } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface MonthlyReportProps {
  data: SummaryData;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-[var(--card-bg-secondary)] p-4 rounded-lg">
    <h3 className="font-semibold text-lg text-[var(--accent-primary)] dark:text-[var(--accent-secondary)] mb-2">{title}</h3>
    {children}
  </div>
);

const MonthlyReport: React.FC<MonthlyReportProps> = ({ data }) => {
  if ((data as any).status === 'loading') {
    return (
      <div className="rounded-2xl p-6 border bg-amber-50/70 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800 text-center animate-fade-in">
        <h2 className="text-xl font-light text-amber-800 dark:text-amber-200 mb-2">Generating Your Monthly Reflection...</h2>
        <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">This can take a moment. Thank you for your patience.</p>
        <div className="flex justify-center"><LoadingSpinner /></div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-6 border bg-amber-50/70 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800 animate-fade-in">
      <header className="text-center mb-6">
        {data.arcPhase && (
          <span className="inline-block px-3 py-1 text-xs tracking-[0.12em] uppercase font-medium bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-full mb-3">
            {data.arcPhase} Terrain
          </span>
        )}
        <h2 className="text-2xl font-light text-amber-800 dark:text-amber-200">{data.title}</h2>
        <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">{data.dateRange}</p>
      </header>

      <div className="space-y-4">
        {/* Emotional Terrain */}
        {data.emotionalTerrain && (
          <div className="text-center px-4 py-3 bg-amber-100/50 dark:bg-amber-800/30 rounded-lg">
            <p className="font-light text-amber-800 dark:text-amber-200 italic leading-relaxed">
              {data.emotionalTerrain}
            </p>
          </div>
        )}

        {/* Dominant Themes */}
        {data.dominantThemes && data.dominantThemes.length > 0 && (
          <Section title="What Emerged This Month">
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

        {/* Mirrors — keep identical to weekly (user's own words) */}
        {data.mirrors && data.mirrors.length > 0 && (
          <Section title="Your Words">
            <div className="space-y-3">
              {data.mirrors.map((mirror, i) => (
                <div key={i} className="pl-3 border-l-2 border-amber-400 dark:border-amber-600">
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
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

        {/* Synthesis */}
        {data.synthesis && (
          <div className="text-center pt-4 px-4">
            <p className="text-lg font-light text-amber-800 dark:text-amber-200 leading-relaxed">
              {data.synthesis}
            </p>
          </div>
        )}

        {/* Metrics */}
        {data.metrics && (
          <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800 flex justify-center gap-8">
            <div className="text-center">
              <p className="text-2xl font-light text-amber-700 dark:text-amber-300">{data.metrics.entries}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wide">entries</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-light text-amber-700 dark:text-amber-300">{data.metrics.completionRate}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wide">completion</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyReport;
