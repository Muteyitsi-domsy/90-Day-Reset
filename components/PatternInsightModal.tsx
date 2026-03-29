import React from 'react';
import { PatternInsight } from '../types';

interface PatternInsightModalProps {
  insight: PatternInsight;
  onContinue: () => void;
}

const SCORE_LABEL: Record<string, string> = {
  Low: 'Emerging pattern',
  Moderate: 'Recurring pattern',
  High: 'Deep pattern',
};

const PatternInsightModal: React.FC<PatternInsightModalProps> = ({ insight, onContinue }) => {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pattern-insight-title"
    >
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-2xl border border-[var(--card-border)] max-w-md w-full p-6 animate-scale-in">
        {/* Icon */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-3">
            <span className="text-3xl" aria-hidden="true">🔍</span>
          </div>
          <h2
            id="pattern-insight-title"
            className="text-xl font-semibold text-[var(--text-primary)]"
          >
            Pattern noticed
          </h2>
        </div>

        {/* Insight text */}
        <p className="text-[var(--text-secondary)] text-center mb-4 leading-relaxed">
          {insight.insight_text}
        </p>

        {/* Recurring badge */}
        {insight.is_recurring && (
          <p className="text-center text-sm text-indigo-500 dark:text-indigo-400 mb-2">
            This pattern has come up before.
          </p>
        )}

        {/* Intensity label */}
        <p className="text-center text-xs text-[var(--text-secondary)] mb-6 opacity-70">
          {SCORE_LABEL[insight.score_level] ?? 'Pattern'} · {insight.score_level} intensity
        </p>

        {/* CTA */}
        <button
          onClick={onContinue}
          className="w-full py-3 px-4 rounded-lg bg-[var(--accent-primary)] text-white font-medium hover:bg-[var(--accent-primary-hover)] transition-colors"
        >
          Continue
        </button>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-scale-in { animation: scale-in 0.2s ease-out; }
      `}</style>
    </div>
  );
};

export default PatternInsightModal;
