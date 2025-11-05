import React, { useState, useEffect } from 'react';
import { getDayAndMonth, generateWeeklySummary, generateFinalSummary, getDailyPrompt, analyzeJournalEntry } from './services/geminiService';
import { JournalEntry, UserProfile, EntryAnalysis, Settings, EveningCheckin, InsightFrequency } from './types';
import Header from './components/Header';
import Onboarding from './components/Onboarding';
import IdealSelfScripting from './components/IdealSelfScripting';
import { safeRequestNotificationPermission, scheduleDailyReminder, scheduleEveningReminder } from './utils/notifications';
import CelebrationScreen from './components/CelebrationScreen';
import JournalView from './components/JournalView';
import { detectCrisis, CrisisSeverity } from './utils/crisisDetector';
import CrisisModal from './components/CrisisModal';
import WelcomeScreen from './components/WelcomeScreen';
import LoadingSpinner from './components/LoadingSpinner';
import PinLockScreen from './components/PinLockScreen';
import SettingsModal from './components/SettingsModal';
import ReturnUserWelcomeScreen from './components/ReturnUserWelcomeScreen';
import OnboardingCompletion from './components/OnboardingCompletion';
import PausedScreen from './components/PausedScreen';


type AppState = 'welcome' | 'returning_welcome' | 'onboarding' | 'scripting' | 'onboarding_completion' | 'journal';

const App: React.FC = () => {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [appState, setAppState] = useState<AppState>('welcome');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<Settings>({ theme: 'system', insightFrequency: 'daily', includeHunchesInFinalSummary: false });
  const [isLocked, setIsLocked] = useState(true);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isJourneyOver, setIsJourneyOver] = useState(false);
  const [finalSummaryText, setFinalSummaryText] = useState('');
  const [dailyPrompt, setDailyPrompt] = useState<{ text: string, isMilestone: boolean } | null>(null);
  const [crisisSeverity, setCrisisSeverity] = useState<CrisisSeverity>(0);


  // On app load, schedule the next daily reminder if permission is granted.
  useEffect(() => {
    scheduleDailyReminder();
  }, []);

  // Load from local storage on mount
  useEffect(() => {
    try {
        const savedSettings = localStorage.getItem('settings');
        const defaultSettings = { theme: 'system', insightFrequency: 'daily', includeHunchesInFinalSummary: false };
        const parsedSettings = savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings;
        setSettings(parsedSettings);

        if (parsedSettings.pin) {
            setIsLocked(true);
        } else {
            setIsLocked(false);
        }

        const savedProfile = localStorage.getItem('userProfile');
        if (savedProfile) {
            const profile: UserProfile = JSON.parse(savedProfile);
            setUserProfile(profile);

            const savedEntries = localStorage.getItem('journalEntries');
            if (savedEntries) {
                const rawEntries: any[] = JSON.parse(savedEntries);
                // Migration: Add `type` to entries that don't have it for backwards compatibility
                const typedEntries = rawEntries.map(e => ({
                    ...e,
                    type: e.type || (e.prompt.includes("Reflection on Week") ? 'weekly_summary' : 'daily')
                }));
                setJournalEntries(typedEntries);
            }
            
            if (!profile.idealSelfManifesto) {
                setAppState('scripting');
            } else {
                 // Check if onboarding was completed but settings were not
                const settingsExist = savedSettings ? JSON.parse(savedSettings).insightFrequency : false;
                if (!settingsExist) {
                    setAppState('onboarding_completion');
                } else {
                    setAppState('returning_welcome');
                }
            }
        }
    } catch (e) {
        console.error("Error loading from localStorage", e);
        localStorage.clear(); // Clear corrupted data
        setIsLocked(false); // Ensure app is not locked if storage is corrupt
    } finally {
        setIsLoading(false);
    }
  }, []);

  // Save/apply settings on change
  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings));

    // Apply theme
    document.documentElement.classList.remove('dark', 'light');
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (settings.theme === 'light') {
       // No class needed for light
    } else { // System
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark');
        }
    }
  }, [settings]);

  // Save user profile to local storage on change
  useEffect(() => {
    if (userProfile) {
        localStorage.setItem('userProfile', JSON.stringify(userProfile));
    }
  }, [userProfile]);

  // Save journal entries to local storage on change
  useEffect(() => {
    // Avoid saving the empty initial array before we've loaded from storage
    if (!isLoading) {
        localStorage.setItem('journalEntries', JSON.stringify(journalEntries));
    }
  }, [journalEntries, isLoading]);


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
      type: 'daily',
    };

    // Save the raw entry immediately, regardless of crisis level
    const updatedEntries = [...journalEntries, newEntry];
    setJournalEntries(updatedEntries);

    // --- Streak Logic ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let newStreak = userProfile.streak || 0;
    let lastEntryDate = userProfile.lastEntryDate ? new Date(userProfile.lastEntryDate) : null;
    if(lastEntryDate) {
      lastEntryDate.setHours(0, 0, 0, 0);
    }

    if (lastEntryDate) {
      const diffTime = today.getTime() - lastEntryDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) { // Consecutive day
        newStreak++;
      } else if (diffDays > 1) { // Streak broken
        newStreak = 1;
      }
      // if diffDays is 0, same day, streak doesn't change
    } else { // First entry ever
      newStreak = 1;
    }

    setUserProfile(prev => ({
      ...prev!,
      streak: newStreak,
      lastEntryDate: today.toISOString()
    }));
    // --- End of Streak Logic ---

    if (severity >= 2) {
      setCrisisSeverity(severity);
      setIsLoading(false);
      return; // Stop here, do not call AI analysis
    }
    
    // Proceed with AI analysis only if crisis level is low and settings allow
    if (settings.insightFrequency === 'daily') {
        try {
          const analysis: EntryAnalysis = await analyzeJournalEntry(text);
          const completeEntry: JournalEntry = { ...newEntry, analysis };
          
          setJournalEntries(prev => prev.map(entry => entry.id === completeEntry.id ? completeEntry : entry));
          scheduleEveningReminder();

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
    } else {
        // If not daily insights, just finalize the save.
        scheduleEveningReminder();
        if (dailyPrompt.isMilestone) {
          const milestoneDay = day - 1;
          setUserProfile(prev => ({ ...prev!, lastMilestoneDayCompleted: milestoneDay }));
        }
        setIsLoading(false);
    }
  };

  const handleSaveHunch = (text: string) => {
    if (!text.trim() || !userProfile) return;

    const { day } = getDayAndMonth(userProfile.startDate);
    const currentWeek = Math.floor((day - 1) / 7) + 1;

    const newHunch: JournalEntry = {
        id: new Date().toISOString(),
        date: new Date().toISOString(),
        day: day,
        week: currentWeek,
        type: 'hunch',
        prompt: 'Intuitive Insight',
        rawText: text,
    };

    setJournalEntries(prev => [...prev, newHunch]);
  };

  const handleUpdateEntry = async (entryId: string, newText: string, reanalyze: boolean) => {
    if (isLoading || !newText.trim()) return;
    
    const entryToUpdate = journalEntries.find(e => e.id === entryId);
    if (!entryToUpdate) return;
    
    // Ensure we only re-analyze daily entries.
    const shouldReanalyze = reanalyze && entryToUpdate.type === 'daily';

    setIsLoading(true);

    if (!shouldReanalyze) {
        setJournalEntries(prev => prev.map(entry =>
            entry.id === entryId 
            ? { ...entry, rawText: newText, date: new Date().toISOString() } 
            : entry
        ));
        setIsLoading(false);
        return;
    }

    // --- Start of re-analysis logic ---
    const severity = detectCrisis(newText);
    if (severity >= 2) {
      setCrisisSeverity(severity);
      // Save the user's updated text but remove analysis.
      setJournalEntries(prev => prev.map(entry =>
        entry.id === entryId ? { ...entry, rawText: newText, analysis: undefined } : entry
      ));
      setIsLoading(false);
      return;
    }

    try {
      const newAnalysis = await analyzeJournalEntry(newText);
      setJournalEntries(prev => prev.map(entry =>
        entry.id === entryId
          ? { ...entry, rawText: newText, analysis: newAnalysis, date: new Date().toISOString() }
          : entry
      ));
    } catch (error) {
      console.error("Error re-analyzing entry:", error);
      setJournalEntries(prev => prev.map(entry =>
        entry.id === entryId
          ? {
              ...entry,
              rawText: newText,
              analysis: {
                summary: "Could not re-analyze this entry. Your edits are saved.",
                insights: [],
                tags: ["Error"],
                microAction: "Take a deep breath."
              }
            }
          : entry
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEntry = (entryId: string) => {
    setJournalEntries(prev => prev.filter(entry => entry.id !== entryId));
  };

  const handleSaveEveningCheckin = (entryId: string, checkinData: EveningCheckin) => {
    setJournalEntries(prev =>
      prev.map(entry =>
        entry.id === entryId
          ? { ...entry, eveningCheckin: checkinData }
          : entry
      )
    );
  };

  const handleGenerateWeeklySummary = async (weekToSummarize: number, newWeek: number) => {
    if (!userProfile || !userProfile.idealSelfManifesto) return;

    if (settings.insightFrequency === 'none') {
        setUserProfile(prev => ({ ...prev!, week_count: newWeek }));
        return; // Skip summary generation if insights are off
    }

    setIsLoading(true);
    
    const summaryEntryId = new Date().toISOString();
    const { day } = getDayAndMonth(userProfile.startDate);

    const summaryPlaceholder: JournalEntry = {
        id: summaryEntryId,
        date: new Date().toISOString(),
        day: day,
        week: weekToSummarize,
        type: 'weekly_summary',
        prompt: `🌿 A Reflection on Week ${weekToSummarize}`,
        rawText: '...',
    }
    setJournalEntries(prev => [...prev, summaryPlaceholder]);

    try {
        const weekHistory = journalEntries.filter(entry => entry.week === weekToSummarize && entry.type === 'daily');
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
        const dailyHistory = journalEntries.filter(e => e.type === 'daily');
        const hunchHistory = settings.includeHunchesInFinalSummary
            ? journalEntries.filter(e => e.type === 'hunch')
            : [];

        const summaryText = await generateFinalSummary(userProfile, dailyHistory, hunchHistory);
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
            
            const todayEntry = journalEntries.find(entry => entry.day === day && entry.type === 'daily');
            if (!todayEntry) {
                 const { prompt, isMilestone } = await getDailyPrompt(userProfile);
                 setDailyPrompt({ text: prompt, isMilestone });
            }
            setIsLoading(false);
        }
    };

    if (appState === 'journal' && userProfile && !userProfile.isPaused) {
        setupJournal();
    }
  }, [appState, userProfile]);

  const handleOnboardingComplete = (profile: Omit<UserProfile, 'idealSelfManifesto'>) => {
    setUserProfile(profile);
    setAppState('scripting');
  }
  
  const handleScriptingComplete = async (manifesto: string) => {
    if (userProfile) {
        setUserProfile(prev => ({...prev!, idealSelfManifesto: manifesto}));
        setAppState('onboarding_completion');
    }
  }

  const handleOnboardingCompletion = async (insightFrequency: InsightFrequency) => {
    setSettings(prev => ({ ...prev, insightFrequency }));
    setAppState('journal');
    const permissionGranted = await safeRequestNotificationPermission();
    if (permissionGranted) {
        scheduleDailyReminder();
    }
  };

  const restartJourney = () => {
    localStorage.removeItem('userProfile');
    localStorage.removeItem('journalEntries');
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

  const handlePauseJourney = () => {
    if (userProfile && window.confirm("Pause your journey? Your progress and streak will be saved. You can resume anytime.")) {
      setUserProfile(prev => ({
        ...prev!,
        isPaused: true,
        pausedDate: new Date().toISOString(),
      }));
    }
  };

  const handleResumeJourney = () => {
    if (userProfile && userProfile.isPaused && userProfile.pausedDate) {
      const pausedAt = new Date(userProfile.pausedDate);
      const resumedAt = new Date();
      const pausedDuration = resumedAt.getTime() - pausedAt.getTime();

      const oldStartDate = new Date(userProfile.startDate);
      const newStartDate = new Date(oldStartDate.getTime() + pausedDuration);

      const oldLastEntryDate = userProfile.lastEntryDate ? new Date(userProfile.lastEntryDate) : null;
      let newLastEntryDateISO = userProfile.lastEntryDate;

      if(oldLastEntryDate) {
          const updatedLastEntry = new Date(oldLastEntryDate.getTime() + pausedDuration);
          newLastEntryDateISO = updatedLastEntry.toISOString();
      }

      setUserProfile(prev => ({
        ...prev!,
        isPaused: false,
        pausedDate: undefined,
        startDate: newStartDate.toISOString(),
        lastEntryDate: newLastEntryDateISO,
      }));
    }
  };

  const renderContent = () => {
    if (isLoading && appState !== 'journal') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner />
            </div>
        );
    }
    
    if (isLocked && settings.pin) {
        return <PinLockScreen correctPin={settings.pin!} onUnlock={() => setIsLocked(false)} />;
    }

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
      case 'welcome':
        return <WelcomeScreen onStart={() => setAppState('onboarding')} />;
      case 'returning_welcome':
        return <ReturnUserWelcomeScreen onContinue={() => setAppState('journal')} />;
      case 'onboarding':
        return <Onboarding onComplete={handleOnboardingComplete} />;
      case 'scripting':
        if (userProfile) {
            return <IdealSelfScripting userProfile={userProfile} onComplete={handleScriptingComplete} />;
        }
        return null;
      case 'onboarding_completion':
        return <OnboardingCompletion onComplete={handleOnboardingCompletion} />;
      case 'journal': {
        const { day } = userProfile ? getDayAndMonth(userProfile.startDate) : { day: 1 };
        const todaysEntry = journalEntries.find(entry => entry.day === day && entry.type === 'daily');
        
        if (userProfile?.isPaused) {
            return (
                <div className="flex flex-col min-h-screen text-[#344e41] dark:text-gray-200 font-sans">
                    <Header streak={userProfile?.streak} onOpenSettings={() => setIsSettingsModalOpen(true)} />
                    <PausedScreen onResume={handleResumeJourney} />
                </div>
            );
        }

        return (
          <div className="flex flex-col min-h-screen text-[#344e41] dark:text-gray-200 font-sans">
            <Header streak={userProfile?.streak} onOpenSettings={() => setIsSettingsModalOpen(true)} />
            <JournalView 
              currentDay={day}
              dailyPrompt={dailyPrompt?.text}
              todaysEntry={todaysEntry}
              allEntries={journalEntries}
              isLoading={isLoading}
              onSaveDaily={handleSaveEntry}
              onSaveHunch={handleSaveHunch}
              onUpdate={handleUpdateEntry}
              onDelete={handleDeleteEntry}
              onSaveEveningCheckin={handleSaveEveningCheckin}
              settings={settings}
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
      {isSettingsModalOpen && (
        <SettingsModal 
          settings={settings}
          userProfile={userProfile}
          onClose={() => setIsSettingsModalOpen(false)}
          onSave={setSettings}
          onPauseJourney={handlePauseJourney}
          onResumeJourney={handleResumeJourney}
        />
      )}
      {renderContent()}
    </>
  );
};

export default App;