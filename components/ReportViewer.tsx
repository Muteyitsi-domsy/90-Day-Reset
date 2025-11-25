import React from 'react';
import { JournalEntry } from '../types';
import WeeklySummary from './WeeklySummary';

interface ReportViewerProps {
    report: JournalEntry | null;
    onClose: () => void;
}

const ReportViewer: React.FC<ReportViewerProps> = ({ report, onClose }) => {
    if (!report) return null;

    return (
        <>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                .animate-fade-in {
                    animation: fadeIn 0.2s ease-out;
                }
                .animate-scale-in {
                    animation: scaleIn 0.3s ease-out;
                }
            `}</style>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                {/* Modal Container */}
                <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-[var(--card-bg)] rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                {/* Header with Close Button */}
                <div className="sticky top-0 z-10 bg-[var(--card-bg)] border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-light text-[var(--text-primary)]">
                            {report.type === 'monthly_summary_report' ? '📅 Monthly Report' : '🌿 Weekly Report'}
                        </h2>
                        {report.summaryData && (
                            <p className="text-sm text-[var(--text-secondary)] mt-1">
                                {report.summaryData.title || `Period ${report.summaryData.period}`}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                        aria-label="Close report"
                    >
                        <svg
                            className="w-6 h-6 text-gray-500 group-hover:text-[var(--text-primary)]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Report Content - Scrollable */}
                <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
                    {report.summaryData ? (
                        <WeeklySummary data={report.summaryData} />
                    ) : (
                        <div className="text-center text-[var(--text-secondary)] py-8">
                            <p>No report data available.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default ReportViewer;
