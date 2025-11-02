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
}

const EntryCard: React.FC<{ entry: JournalEntry; isToday?: boolean }> = ({ entry, isToday = false }) => (
  <div className={`bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white transition-shadow hover:shadow-md animate-fade-in ${isToday ? 'shadow-lg' : 'shadow-sm'}`}>
    <div className="flex justify-between items-center mb-3">
        <p className="font-semibold text-sm text-[#3a5a40]">{entry.prompt}</p>
        <span className="text-xs text-gray-500 font-light">{isToday ? "Today" : new Date(entry.date).toLocaleDateString()}</span>
    </div>
    <p className="font-light text-gray-700 leading-relaxed whitespace-pre-wrap">
        {entry.rawText}
    </p>
    {entry.analysis ? <EntryAnalysisView analysis={entry.analysis} /> : (isToday && <div className="mt-4"><LoadingSpinner/></div>)}
  </div>
);

const JournalView: React.FC<JournalViewProps> = ({ dailyPrompt, todaysEntry, allEntries, isLoading, onSave }) => {
  const [isWritingModalOpen, setIsWritingModalOpen] = useState(false);

  const sortedEntries = useMemo(() => {
    return allEntries.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allEntries]);

  const hasWrittenToday = !!todaysEntry;

  const handleSave = (text: string) => {
    onSave(text);
    setIsWritingModalOpen(false);
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
          {sortedEntries.map(entry => (
            <EntryCard key={entry.id} entry={entry} isToday={entry.id === todaysEntry?.id}/>
          ))}
           {sortedEntries.length === 0 && !hasWrittenToday && (
              <div className="text-center py-20">
                  <h2 className="text-xl font-light text-gray-500">Your journal is a quiet space.</h2>
                  <p className="text-gray-400 mt-2">Tap the pen to begin today's reflection.</p>
              </div>
           )}
        </div>
      </main>

      {!hasWrittenToday && dailyPrompt && (
        <FloatingButton onClick={() => setIsWritingModalOpen(true)} />
      )}
      
      {isWritingModalOpen && (
        <JournalInputModal 
          prompt={dailyPrompt}
          onSave={handleSave}
          onClose={() => setIsWritingModalOpen(false)}
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
      `}</style>
    </>
  );
};

export default JournalView;