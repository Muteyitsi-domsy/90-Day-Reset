import React, { useState, useMemo } from 'react';
import { JournalEntry } from '../types';
import LoadingSpinner from './LoadingSpinner';
import EntryAnalysisView from './EntryAnalysisView';
import FloatingButton from './FloatingButton';
import JournalInputModal from './JournalInputModal';

interface JournalViewProps {
  dailyPrompt: string | null | undefined;
  todaysEntry: JournalEntry | undefined;
  allEntries: JournalEntry[];
  isLoading: boolean;
  onSave: (text: string) => void;
  onUpdate: (entryId: string, text: string) => void;
  onDelete: (entryId: string) => void;
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


const EntryCard: React.FC<{ 
    entry: JournalEntry; 
    isToday?: boolean; 
    isMostRecent?: boolean; 
    onEdit?: (entry: JournalEntry) => void;
    onDelete?: (entry: JournalEntry) => void;
    isDeleting?: boolean;
}> = ({ entry, isToday = false, isMostRecent = false, onEdit, onDelete, isDeleting = false }) => (
  <div className={`bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-white dark:border-gray-700 transition-all duration-500 ${isToday ? 'shadow-lg' : 'shadow-sm'} ${isDeleting ? 'animate-fade-out-shrink' : 'animate-fade-in'}`}>
    <div className="flex justify-between items-center mb-3">
        <p className="font-semibold text-sm text-[#3a5a40] dark:text-emerald-300">{entry.prompt}</p>
        <div className="flex items-center space-x-3">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-light">{isToday ? "Today" : new Date(entry.date).toLocaleDateString()}</span>
          {isMostRecent && onEdit && (
              <button onClick={() => onEdit(entry)} className="text-gray-400 hover:text-[#3a5a40] dark:hover:text-emerald-300 transition-colors" aria-label="Edit entry">
                  <EditIcon className="w-4 h-4" />
              </button>
          )}
          {onDelete && (
             <button onClick={() => onDelete(entry)} className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors" aria-label="Delete entry">
                <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>
    </div>
    <p className="font-light text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
        {entry.rawText}
    </p>
    {entry.analysis ? <EntryAnalysisView analysis={entry.analysis} /> : (isToday && <div className="mt-4"><LoadingSpinner/></div>)}
  </div>
);

const JournalView: React.FC<JournalViewProps> = ({ dailyPrompt, todaysEntry, allEntries, isLoading, onSave, onUpdate, onDelete }) => {
  const [isWritingModalOpen, setIsWritingModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<JournalEntry | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  const sortedEntries = useMemo(() => {
    return allEntries.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allEntries]);
  
  const mostRecentUserEntry = useMemo(() => {
    return sortedEntries.find(e => !e.prompt.includes("Reflection on Week"));
  }, [sortedEntries]);

  const hasWrittenToday = !!todaysEntry;

  const handleEditClick = (entry: JournalEntry) => {
    setEntryToEdit(entry);
    setIsWritingModalOpen(true);
  };

  const handleDeleteClick = (entry: JournalEntry) => {
    if (window.confirm("Are you sure you want to delete this entry? This action cannot be undone.")) {
        setDeletingEntryId(entry.id);
        // Wait for animation to finish before removing from state
        setTimeout(() => {
            onDelete(entry.id);
            setDeletingEntryId(null); // Reset after deletion is processed
        }, 500); // Must match animation duration
    }
  };

  const handleCloseModal = () => {
    setIsWritingModalOpen(false);
    setEntryToEdit(null);
  };

  const handleSaveFromModal = (text: string) => {
    if (entryToEdit) {
      onUpdate(entryToEdit.id, text);
    } else {
      onSave(text);
    }
    handleCloseModal();
  }
  
  if (isLoading && allEntries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
        <div className="max-w-3xl mx-auto w-full space-y-6">
          {sortedEntries.map(entry => {
            const isMostRecent = mostRecentUserEntry ? entry.id === mostRecentUserEntry.id : false;
            const isUserEntry = !entry.prompt.includes("Reflection on Week");

            return (
              <EntryCard 
                key={entry.id} 
                entry={entry} 
                isToday={entry.id === todaysEntry?.id}
                isMostRecent={isMostRecent}
                onEdit={isMostRecent && isUserEntry ? handleEditClick : undefined}
                onDelete={isUserEntry ? handleDeleteClick : undefined}
                isDeleting={entry.id === deletingEntryId}
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
      </main>

      {!hasWrittenToday && dailyPrompt && (
        <FloatingButton onClick={() => setIsWritingModalOpen(true)} />
      )}
      
      {isWritingModalOpen && (
        <JournalInputModal 
          prompt={entryToEdit ? entryToEdit.prompt : dailyPrompt}
          initialText={entryToEdit?.rawText}
          onSave={handleSaveFromModal}
          onClose={handleCloseModal}
          isSaving={isLoading}
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