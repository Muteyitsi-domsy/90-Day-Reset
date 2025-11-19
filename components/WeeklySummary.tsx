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
                <h2 className="text-xl font-light text-sky-800 dark:text-sky-200 mb-2">Generating Your Weekly Reflection...</h2>
                <p className="text-sm text-sky-700 dark:text-sky-300 mb-4">This can take a moment. Thank you for your patience.</p>
                <div className="flex justify-center">
                    <LoadingSpinner />
                </div>
            </div>
        );
    }

  return (
    <div className="rounded-2xl p-6 border bg-sky-50/70 dark:bg-sky-900/40 border-sky-200 dark:border-sky-800 animate-fade-in">
      <header className="text-center mb-6">
        <h2 className="text-2xl font-light text-sky-800 dark:text-sky-200">Weekly Reflection: Week {data.period}</h2>
        <p className="text-sm text-sky-600 dark:text-sky-400">{data.dateRange}</p>
        <p className="text-md font-medium text-sky-700 dark:text-sky-300 mt-1 capitalize">{data.stage}</p>
      </header>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Section title="Key Themes">
            <ul className="list-disc list-inside space-y-1 font-light text-[var(--text-primary)]">
              {data.themes.map((theme, i) => <li key={i}>{theme}</li>)}
            </ul>
          </Section>
          <Section title="Challenges">
            <ul className="list-disc list-inside space-y-1 font-light text-[var(--text-primary)]">
              {data.challenges.map((challenge, i) => <li key={i}>{challenge}</li>)}
            </ul>
          </Section>
        </div>

        <Section title="Observed Growth">
          <div className="space-y-3">
            {data.growth.map((g, i) => (
              <div key={i}>
                <p className="font-semibold text-sky-900 dark:text-sky-100">{g.observation}</p>
                <p className="font-light text-sm text-sky-700 dark:text-sky-300 pl-2 border-l-2 border-sky-300 dark:border-sky-600 italic">"{g.evidence}"</p>
              </div>
            ))}
          </div>
        </Section>
        
        <Section title="Notable Excerpts">
            <div className="space-y-3 font-light text-[var(--text-primary)] italic">
                {data.notableExcerpts.map((excerpt, i) => <p key={i}>"{excerpt}"</p>)}
            </div>
        </Section>

        <Section title="Action Plan for Next Week">
          <ul className="list-decimal list-inside space-y-1 font-light text-[var(--text-primary)]">
            {data.actionPlan.map((action, i) => <li key={i}>{action}</li>)}
          </ul>
        </Section>
        
        <div className="text-center pt-4">
            <p className="text-lg italic text-sky-800 dark:text-sky-200">"{data.encouragement}"</p>
        </div>
      </div>
    </div>
  );
};

export default WeeklySummary;