import React, { useState, useEffect } from 'react';
import { getDayAndMonth, generateWeeklySummary, generateFinalSummary, getDailyPrompt, analyzeJournalEntry } from './services/geminiService';
import { JournalEntry, UserProfile, EntryAnalysis } from './types';
import Header from './components/Header';
import Onboarding from './components/Onboarding';
import IdealSelfScripting from './components/IdealSelfScripting';
import { requestNotificationPermission, scheduleDailyReminder } from './utils/notifications';
import CelebrationScreen from './components/CelebrationScreen';
import JournalView from './components/JournalView';
import { detectCrisis, CrisisSeverity } from './utils/crisisDetector';
import CrisisModal from './components/CrisisModal';

type AppState = 'onboarding' | 'scripting' | 'journal';

const App: React.FC = () => {
   const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [appState, setAppState] = useState<AppState>('onboarding');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isJourneyOver, setIsJourneyOver] = useState(false);
  const [finalSummaryText, setFinalSummaryText] = useState('');
  const [dailyPrompt, setDailyPrompt] = useState<{ text: string, isMilestone: boolean } | null>(null);
  const [crisisSeverity, setCrisisSeverity] = useState<CrisisSeverity>(0);


  // On app load, schedule the next daily reminder if permission is granted.
  useEffect(() => {
    scheduleDailyReminder();
  }, []);

  const handleSaveEntry = async (text: string) => {
    if (isLoading || !text.trim() || !userProfile || !dailyPrompt) return;

    setIsLoading(true);

    const severity = detectCrisis(text);

    const { day, month } = getDayAndMonth(userProfile.startDate);
    const currentWeek = Math.floor((day - 1) / 7) + 1;

    const newEntry: JournalEntry = {
      id: new Date().toISOString(),
      date: new Date().toISOString(),
      day: day,
      week: currentWeek,
      prompt: dailyPrompt.text,
      rawText: text,
    };

    // Save the raw entry immediately, regardless of crisis level
    const updatedEntries = [...journalEntries, newEntry];
    setJournalEntries(updatedEntries);


    if (severity >= 2) {
      setCrisisSeverity(severity);
      setIsLoading(false);
      return; // Stop here, do not call AI analysis
    }
    
    // Proceed with AI analysis only if crisis level is low
    try {
      const analysis: EntryAnalysis = await analyzeJournalEntry(text);
      const completeEntry: JournalEntry = { ...newEntry, analysis };
      
      setJournalEntries(prev => prev.map(entry => entry.id === completeEntry.id ? completeEntry : entry));

      if (dailyPrompt.isMilestone) {
          const milestoneDay = day - 1;
          setUserProfile(prev => ({ ...prev!, lastMilestoneDayCompleted: milestoneDay }));
      }

    } catch (error) {
      console.error("Error analyzing entry:", error);
      const entryWithError: JournalEntry = {
          ...newEntry,
          analysis: {
              summary: "Could not analyze this entry. Your thoughts are saved, and you can reflect on them yourself.",
              insights: [],
              tags: ["Error"],
              microAction: "Take a deep breath. Technology has its moments."
          }
      }
      setJournalEntries(prev => prev.map(entry => entry.id === entryWithError.id ? entryWithError : entry));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateWeeklySummary = async (weekToSummarize: number, newWeek: number) => {
    if (!userProfile || !userProfile.idealSelfManifesto) return;

    setIsLoading(true);
    
    const summaryEntryId = new Date().toISOString();
    const { day } = getDayAndMonth(userProfile.startDate);

    // Add a placeholder entry for the summary
    const summaryPlaceholder: JournalEntry = {
        id: summaryEntryId,
        date: new Date().toISOString(),
        day: day,
        week: weekToSummarize,
        prompt: `🌿 A Reflection on Week ${weekToSummarize}`,
        rawText: '...',
    }
    setJournalEntries(prev => [...prev, summaryPlaceholder]);

    try {
        const weekHistory = journalEntries.filter(entry => entry.week === weekToSummarize && !entry.prompt.includes("Reflection on Week"));
        const summaryText = await generateWeeklySummary(weekHistory, userProfile.idealSelfManifesto);
        
        setJournalEntries(prev => prev.map(entry => 
            entry.id === summaryEntryId ? {...entry, rawText: summaryText} : entry
        ));

        setUserProfile(prev => ({ ...prev!, week_count: newWeek }));
    } catch (error) {
        console.error("Error generating weekly summary:", error);
        setJournalEntries(prev => prev.map(entry => 
            entry.id === summaryEntryId ? {...entry, rawText: "I had some trouble reflecting on the past week. Let's move forward gently."} : entry
        ));
         setUserProfile(prev => ({ ...prev!, week_count: newWeek }));
    } finally {
        setIsLoading(false);
    }
};

const handleFinalSummary = async () => {
    if (!userProfile) return;

    setIsLoading(true);
    
    try {
        const summaryText = await generateFinalSummary(userProfile, journalEntries);
        setFinalSummaryText(summaryText);
        setUserProfile(prev => ({ ...prev!, journeyCompleted: true }));
        setIsJourneyOver(true);
    } catch (error) {
        console.error("Error generating final summary:", error);
        const fallbackSummary = "**Your 90-Day Evolution**\n\nThe journey may be over, but the growth continues. Thank you for showing up for yourself.";
        setFinalSummaryText(fallbackSummary);
        setUserProfile(prev => ({ ...prev!, journeyCompleted: true }));
        setIsJourneyOver(true);
    } finally {
        setIsLoading(false);
    }
};

  useEffect(() => {
    const setupJournal = async () => {
        if (userProfile) {
            setIsLoading(true);
            const { day } = getDayAndMonth(userProfile.startDate);

            if (day > 90 && !userProfile.journeyCompleted) {
                await handleFinalSummary();
                return;
            } else if (userProfile.journeyCompleted) {
                 if (!finalSummaryText) await handleFinalSummary();
                else setIsJourneyOver(true);
                setIsLoading(false);
                return;
            }

            const expectedWeek = Math.floor((day - 1) / 7) + 1;

            if (userProfile.week_count < expectedWeek) {
                for (let week = userProfile.week_count; week < expectedWeek; week++) {
                    await handleGenerateWeeklySummary(week, week + 1);
                }
            }
            
            const todayEntry = journalEntries.find(entry => entry.day === day);
            if (!todayEntry) {
                 const { prompt, isMilestone } = await getDailyPrompt(userProfile);
                 setDailyPrompt({ text: prompt, isMilestone });
            }
            setIsLoading(false);
        }
    };

    if (appState === 'journal' && userProfile) {
        setupJournal();
    }
  }, [appState, userProfile]);

  const handleOnboardingComplete = (profile: Omit<UserProfile, 'idealSelfManifesto' | 'week_count' | 'lastMilestoneDayCompleted' | 'journeyCompleted'> & { week_count: number, lastMilestoneDayCompleted: number, journeyCompleted: boolean }) => {
    setUserProfile(profile);
    setAppState('scripting');
  }
  
  const handleScriptingComplete = async (manifesto: string) => {
    if (userProfile) {
        setUserProfile(prev => ({...prev!, idealSelfManifesto: manifesto}));
        setAppState('journal');
        const permissionGranted = await requestNotificationPermission();
        if (permissionGranted) {
          scheduleDailyReminder();
        }
    }
  }

  const restartJourney = () => {
    window.location.reload();
  };

  const exportSummary = () => {
    if (!finalSummaryText) return;
    const plainTextSummary = finalSummaryText.replace(/\*\*/g, '');
    const blob = new Blob([plainTextSummary], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '90-Day-Identity-Reset-Summary.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const renderContent = () => {
    if (isJourneyOver && finalSummaryText) {
      return (
        <CelebrationScreen
          completionSummary={finalSummaryText}
          onRestart={restartJourney}
          onExport={exportSummary}
        />
      );
    }

    switch (appState) {
      case 'onboarding':
        return <Onboarding onComplete={handleOnboardingComplete} />;
      case 'scripting':
        if (userProfile) {
            return <IdealSelfScripting userProfile={userProfile} onComplete={handleScriptingComplete} />;
        }
        return null;
      case 'journal': {
        const { day } = userProfile ? getDayAndMonth(userProfile.startDate) : { day: 1 };
        const todaysEntry = journalEntries.find(entry => entry.day === day && !entry.prompt.includes("Reflection on Week"));

        return (
          <div className="flex flex-col min-h-screen text-[#344e41] font-sans">
            <Header />
            <JournalView 
              dailyPrompt={dailyPrompt?.text}
              todaysEntry={todaysEntry}
              allEntries={journalEntries}
              isLoading={isLoading}
              onSave={handleSaveEntry}
            />
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <>
      {crisisSeverity >= 2 && (
        <CrisisModal 
          severity={crisisSeverity} 
          onClose={() => setCrisisSeverity(0)} 
        />
      )}
      {renderContent()}
    </>
  );
};

export default App;