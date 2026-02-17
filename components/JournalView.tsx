
import React, { useState, useMemo } from 'react';
import { JournalEntry, EveningCheckin, Settings, HunchType } from '../types';
import LoadingSpinner from './LoadingSpinner';
import EntryAnalysisView from './EntryAnalysisView';
import FloatingButton from './FloatingButton';
import JournalInputModal from './JournalInputModal';
import EveningCheckinModal from './EveningCheckinModal';

interface JournalViewProps {
  currentDay: number;
  dailyPrompt: string | null | undefined;
  todaysEntry: JournalEntry | undefined;
  allEntries: JournalEntry[];
  isLoading: boolean;
  onSaveDaily: (text: string) => void;
  onSaveHunch: (text: string, hunchType?: HunchType) => void;
  onUpdate: (entryId: string, text: string, reanalyze: boolean, hunchType?: HunchType) => void;
  onDelete: (entryId: string) => void;
  onSaveEveningCheckin: (entryId: string, checkinData: EveningCheckin) => void;
  settings: Settings;
}

const EditIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
);

const TrashIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
);

const CheckinDetailsView: React.FC<{ checkin: EveningCheckin }> = ({ checkin }) => (
    <div className="mt-6 border-t border-gray-300/50 dark:border-gray-700/50 pt-6 space-y-4 animate-fade-in">
        <h3 className="font-medium text-lg text-[var(--accent-primary)] dark:text-[var(--accent-secondary)]">Evening Check-in ✅</h3>
        <div>
            <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-1">Did you complete your micro-action?</h4>
            <p className="font-light text-gray-600 dark:text-gray-400 capitalize">{checkin.completedMicroAction}</p>
        </div>
        <div>
            <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-1">Alignment Reflection</h4>
            <p className="font-light text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{checkin.alignmentReflection}</p>
        </div>
        <div>
            <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-1">What could you do differently?</h4>
            <p className="font-light text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{checkin.improvementReflection}</p>
        </div>
    </div>
);


const EntryCard: React.FC<{
    entry: JournalEntry;
    isToday?: boolean;
    isMostRecentDaily?: boolean;
    onEdit?: (entry: JournalEntry) => void;
    onDelete?: (entry: JournalEntry) => void;
    isDeleting?: boolean;
    onStartCheckin?: () => void;
    dailyAnalysisEnabled?: boolean;
}> = ({ entry, isToday = false, isMostRecentDaily = false, onEdit, onDelete, isDeleting = false, onStartCheckin, dailyAnalysisEnabled = true }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isHunch = entry.type === 'hunch';
    const isSummary = entry.type === 'weekly_summary' || entry.type === 'weekly_summary_report' || entry.type === 'monthly_summary_report';

    let cardColorClasses = 'bg-[var(--card-bg)] backdrop-blur-sm border-[var(--card-border)]';
    let promptColorClasses = 'text-[var(--text-secondary)]';

    if (isHunch) {
        if (entry.hunchType === 'dream') {
            cardColorClasses = 'bg-sky-50/70 dark:bg-sky-900/30 backdrop-blur-sm border-sky-200 dark:border-sky-800';
            promptColorClasses = 'text-sky-700 dark:text-sky-300';
        } else if (entry.hunchType === 'insight') {
            cardColorClasses = 'bg-purple-50/70 dark:bg-purple-900/30 backdrop-blur-sm border-purple-200 dark:border-purple-800';
            promptColorClasses = 'text-purple-700 dark:text-purple-300';
        } else {
            // Hunch or default
            cardColorClasses = 'bg-amber-50/70 dark:bg-amber-900/30 backdrop-blur-sm border-amber-200 dark:border-amber-800';
            promptColorClasses = 'text-amber-700 dark:text-amber-300';
        }
    }

    const cardBaseClasses = "rounded-2xl p-6 border transition-all duration-500";
    const cardShadowClasses = isToday ? 'shadow-lg' : 'shadow-sm';
    const animationClasses = isDeleting ? 'animate-fade-out-shrink' : 'animate-fade-in';
    
    const TRUNCATE_LENGTH = 350;
    const isTruncated = entry.rawText.length > TRUNCATE_LENGTH;
    const displayText = isExpanded ? entry.rawText : `${entry.rawText.slice(0, TRUNCATE_LENGTH)}${isTruncated ? '...' : ''}`;

    return (
        <div className={`${cardBaseClasses} ${cardColorClasses} ${cardShadowClasses} ${animationClasses}`}>
            <div className="flex justify-between items-center mb-3">
                <div className="flex flex-col">
                    <p className={`font-semibold text-sm ${promptColorClasses}`}>{entry.prompt}</p>
                    {isHunch && entry.hunchType && (
                         <span className="text-xs uppercase tracking-wider opacity-70 font-bold mt-1">{entry.hunchType}</span>
                    )}
                </div>
                <div className="flex items-center space-x-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-light">{isToday ? "Today" : new Date(entry.date).toLocaleDateString()}</span>
                {!isSummary && onEdit && (isMostRecentDaily || isHunch) && (
                    <button onClick={() => onEdit(entry)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" aria-label="Edit entry">
                        <EditIcon className="w-4 h-4" />
                    </button>
                )}
                {!isSummary && onDelete && (
                    <button onClick={() => onDelete(entry)} className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors" aria-label="Delete entry">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                )}
                </div>
            </div>
            <p className="font-light text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                {displayText}
            </p>
            {isTruncated && (
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-sm font-semibold text-[var(--accent-primary)] dark:text-[var(--accent-secondary)] mt-2 hover:underline"
                >
                    {isExpanded ? 'Show Less' : 'Read More'}
                </button>
            )}
            {entry.analysis ? (
              <EntryAnalysisView analysis={entry.analysis} />
            ) : entry.crisisFlagged ? (
              null // Crisis-flagged entries: no analysis shown, evening check-in still available below
            ) : (
              isToday && entry.type === 'daily' && dailyAnalysisEnabled && <div className="mt-4"><LoadingSpinner/></div>
            )}
            
            {isToday && (entry.analysis || entry.crisisFlagged || (entry.type === 'daily' && !dailyAnalysisEnabled)) && !entry.eveningCheckin && onStartCheckin && (
                <div className="mt-6 pt-6 border-t border-gray-300/50 dark:border-gray-700/50">
                    <h3 className="text-lg font-light text-center text-[var(--text-secondary)] mb-3">Ready to reflect on your day?</h3>
                    <button
                        onClick={onStartCheckin}
                        className="w-full py-3 rounded-lg bg-[var(--accent-primary-hover)] text-white font-medium hover:bg-[var(--accent-primary)] transition-colors duration-300"
                    >
                        🌙 Start Evening Check-in
                    </button>
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">Return this evening to reflect, or continue your journey tomorrow.</p>
                </div>
            )}

            {entry.eveningCheckin && <CheckinDetailsView checkin={entry.eveningCheckin} />}
        </div>
    );
};

const JournalView: React.FC<JournalViewProps> = ({ currentDay, dailyPrompt, todaysEntry, allEntries, isLoading, onSaveDaily, onSaveHunch, onUpdate, onDelete, onSaveEveningCheckin, settings }) => {
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [isHunchModalOpen, setIsHunchModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<JournalEntry | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [showPromptOptions, setShowPromptOptions] = useState(false);

  const sortedEntries = useMemo(() => {
    // Filter out reports (they're accessible via Reports section modal only)
    // Sort by day (descending) first, then by creation timestamp (id) for entries on the same day
    // This ensures entries maintain their original order even after edits
    return allEntries
      .filter(entry => entry.type !== 'weekly_summary_report' && entry.type !== 'monthly_summary_report')
      .slice()
      .sort((a, b) => {
        if (b.day !== a.day) {
          return b.day - a.day; // Newer days first
        }
        // For same day, sort by creation time (id is ISO timestamp)
        return new Date(b.id).getTime() - new Date(a.id).getTime();
      });
  }, [allEntries]);
  
  const mostRecentDailyEntry = useMemo(() => {
    return sortedEntries.find(e => e.type === 'daily');
  }, [sortedEntries]);

  const hasWrittenToday = !!todaysEntry;

  const handleEditClick = (entry: JournalEntry) => {
    setEntryToEdit(entry);
    if (entry.type === 'hunch') {
        setIsHunchModalOpen(true);
    } else {
        setIsDailyModalOpen(true);
    }
  };

  const handleDeleteClick = (entry: JournalEntry) => {
    if (window.confirm("Are you sure you want to delete this entry? This action cannot be undone.")) {
        setDeletingEntryId(entry.id);
        setTimeout(() => {
            onDelete(entry.id);
            setDeletingEntryId(null);
        }, 500);
    }
  };

  const handleCloseModal = () => {
    setIsDailyModalOpen(false);
    setIsHunchModalOpen(false);
    setEntryToEdit(null);
    setCustomPrompt('');
    setShowPromptOptions(false);
  };

  const handleSaveFromDailyModal = (text: string, reanalyze: boolean) => {
    if (entryToEdit) {
      onUpdate(entryToEdit.id, text, reanalyze);
    } else {
      onSaveDaily(text);
    }
    handleCloseModal();
  }

  const handleSaveFromHunchModal = (text: string, reanalyze: boolean, hunchType?: HunchType) => {
    if (entryToEdit) {
        onUpdate(entryToEdit.id, text, reanalyze, hunchType);
    } else {
        onSaveHunch(text, hunchType);
    }
    handleCloseModal();
  }

  const handleStartCheckin = () => {
    if (todaysEntry) {
        setIsCheckinModalOpen(true);
    }
  };

  const handleSaveCheckin = (data: EveningCheckin) => {
    if (todaysEntry) {
        onSaveEveningCheckin(todaysEntry.id, data);
    }
    setIsCheckinModalOpen(false);
  };
  
  if (isLoading && allEntries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-40">
        <div className="max-w-3xl mx-auto w-full">
            <div className="mb-8 animate-fade-in">
              <div className="flex justify-between items-center mb-1 text-sm font-light text-[var(--text-secondary)]">
                <span>Progress</span>
                <span>Day {currentDay} of 90</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-[var(--accent-primary)] dark:bg-[var(--accent-secondary)] h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, (currentDay / 90) * 100)}%`, transition: 'width 0.5s ease-out' }}
                ></div>
              </div>
            </div>

            {/* Prompt card when no entry for today - ALWAYS show when no entry exists */}
            {!hasWrittenToday && (
              <div className="mb-6 animate-fade-in bg-gradient-to-br from-[var(--accent-primary)]/10 to-[var(--accent-secondary)]/10 dark:from-[var(--accent-primary)]/20 dark:to-[var(--accent-secondary)]/20 rounded-2xl p-6 border-2 border-[var(--accent-primary)]/30 dark:border-[var(--accent-secondary)]/30 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 text-4xl">✍️</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                        Ready to Journal for Day {currentDay}?
                      </h3>
                      {dailyPrompt && (
                        <button
                          onClick={() => setShowPromptOptions(!showPromptOptions)}
                          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                          </svg>
                          {showPromptOptions ? 'Hide' : 'Customize'}
                        </button>
                      )}
                    </div>

                    {dailyPrompt && showPromptOptions && (
                      <div className="mb-4 p-4 bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)] space-y-3">
                        <p className="text-sm text-[var(--text-secondary)]">
                          Want to write about something specific? Enter your own prompt:
                        </p>
                        <textarea
                          value={customPrompt}
                          onChange={(e) => setCustomPrompt(e.target.value)}
                          placeholder="e.g., What am I grateful for today?"
                          className="w-full px-4 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none"
                          rows={2}
                        />
                        <button
                          onClick={() => {
                            setShowPromptOptions(false);
                            setCustomPrompt('');
                          }}
                          className="text-sm text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] font-medium"
                        >
                          Use suggested prompt instead
                        </button>
                      </div>
                    )}

                    {dailyPrompt && (
                      <p className="text-[var(--text-secondary)] mb-4 leading-relaxed font-medium">
                        {customPrompt || dailyPrompt}
                      </p>
                    )}

                    {!dailyPrompt && !customPrompt && (
                      <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">
                        Reflect on your day and document your journey.
                      </p>
                    )}

                    <button
                      onClick={() => setIsDailyModalOpen(true)}
                      className="w-full py-3 px-6 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-medium transition-colors duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Start Writing Today's Entry
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
                {sortedEntries.map(entry => {
                    // Reports are filtered out and accessible only via Reports section modal
                    const isMostRecentDaily = mostRecentDailyEntry ? entry.id === mostRecentDailyEntry.id : false;
                    const isToday = entry.id === todaysEntry?.id;

                    return (
                    <EntryCard
                        key={entry.id}
                        entry={entry}
                        isToday={isToday}
                        isMostRecentDaily={isMostRecentDaily}
                        onEdit={handleEditClick}
                        onDelete={handleDeleteClick}
                        isDeleting={entry.id === deletingEntryId}
                        onStartCheckin={isToday ? handleStartCheckin : undefined}
                        dailyAnalysisEnabled={settings.dailyAnalysis}
                    />
                    )
                })}
                {sortedEntries.length === 0 && !hasWrittenToday && (
                    <div className="text-center py-20">
                        <h2 className="text-xl font-light text-gray-500 dark:text-gray-400">Your journal is a quiet space.</h2>
                        <p className="text-gray-400 dark:text-gray-500 mt-2">Tap the pen to begin today's reflection.</p>
                    </div>
                )}
            </div>
        </div>
      </main>

      <FloatingButton icon="moon" onClick={() => setIsHunchModalOpen(true)} positionClasses="bottom-24 right-6" />
      {!hasWrittenToday && dailyPrompt && (
        <FloatingButton icon="pen" onClick={() => setIsDailyModalOpen(true)} positionClasses="bottom-6 right-6" />
      )}
      
      {isDailyModalOpen && (
        <JournalInputModal
          prompt={entryToEdit ? entryToEdit.prompt : (customPrompt || dailyPrompt)}
          initialText={entryToEdit?.rawText}
          onSave={handleSaveFromDailyModal}
          onClose={handleCloseModal}
          isSaving={isLoading}
          settings={settings}
          entryType="daily"
          isEditMode={!!entryToEdit}
        />
      )}
      {isHunchModalOpen && (
         <JournalInputModal 
          prompt={entryToEdit ? entryToEdit.prompt : "Record a Dream, Hunch, or Insight ✨"}
          initialText={entryToEdit?.rawText}
          onSave={handleSaveFromHunchModal}
          onClose={handleCloseModal}
          isSaving={false}
          settings={settings}
          entryType="hunch"
          isEditMode={!!entryToEdit}
          initialHunchType={entryToEdit?.hunchType}
        />
      )}
      {isCheckinModalOpen && todaysEntry && (
        <EveningCheckinModal
            onSave={handleSaveCheckin}
            onClose={() => setIsCheckinModalOpen(false)}
            dailyAnalysisEnabled={settings.dailyAnalysis}
        />
       )}
      <style>{`
        @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fade-in 0.5s ease-out;
        }

        @keyframes fade-out-shrink {
            from {
                opacity: 1;
                transform: scale(1);
                max-height: 1000px;
                margin-bottom: 1.5rem;
                padding-top: 1.5rem;
                padding-bottom: 1.5rem;
                border-width: 1px;
            }
            to {
                opacity: 0;
                transform: scale(0.95);
                max-height: 0;
                margin-bottom: 0;
                padding-top: 0;
                padding-bottom: 0;
                border-width: 0;
            }
        }
        .animate-fade-out-shrink {
            animation: fade-out-shrink 0.5s ease-out forwards;
            overflow: hidden;
        }
      `}</style>
    </>
  );
};

export default JournalView;
