import React, { useState, useEffect } from 'react';
import { getDayAndMonth, generateWeeklySummary, generateFinalSummary, getDailyPrompt, analyzeJournalEntry } from './services/geminiService';
import { JournalEntry, UserProfile, EntryAnalysis, Settings } from './types';
import Header from './components/Header';
import Onboarding from './components/Onboarding';
import IdealSelfScripting from './components/IdealSelfScripting';
import { safeRequestNotificationPermission, scheduleDailyReminder } from './utils/notifications';
import CelebrationScreen from './components/CelebrationScreen';
import JournalView from './components/JournalView';
import { detectCrisis, CrisisSeverity } from './utils/crisisDetector';
import CrisisModal from './components/CrisisModal';
import WelcomeScreen from './components/WelcomeScreen';
import LoadingSpinner from './components/LoadingSpinner';
import PinLockScreen from './components/PinLockScreen';
import SettingsModal from './components/SettingsModal';


type AppState = 'welcome' | 'onboarding' | 'scripting' | 'journal';

const App: React.FC = () => {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [appState, setAppState] = useState<AppState>('welcome');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<Settings>({ theme: 'system' });
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
        const parsedSettings = savedSettings ? JSON.parse(savedSettings) : { theme: 'system' };
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
                setJournalEntries(JSON.parse(savedEntries));
            }

            if (!profile.idealSelfManifesto) {
                setAppState('scripting');
            } else {
                setAppState('journal');
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

  const handleUpdateEntry = async (entryId: string, newText: string) => {
    if (isLoading || !newText.trim()) return;

    setIsLoading(true);

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
      // Re-analyze the updated text
      const newAnalysis = await analyzeJournalEntry(newText);
      
      // Update the specific entry in the state
      setJournalEntries(prev => prev.map(entry =>
        entry.id === entryId
          ? { ...entry, rawText: newText, analysis: newAnalysis, date: new Date().toISOString() } // also update date to show it was edited now
          : entry
      ));
    } catch (error) {
      console.error("Error re-analyzing entry:", error);
      // Update with an error message in the analysis
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

  const handleOnboardingComplete = (profile: Omit<UserProfile, 'idealSelfManifesto'>) => {
    setUserProfile(profile);
    setAppState('scripting');
  }
  
  const handleScriptingComplete = async (manifesto: string) => {
    if (userProfile) {
        setUserProfile(prev => ({...prev!, idealSelfManifesto: manifesto}));
        setAppState('journal');
        const permissionGranted = await safeRequestNotificationPermission();
        if (permissionGranted) {
          scheduleDailyReminder();
        }
    }
  }

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

  const renderContent = () => {
    if (isLoading && !userProfile) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner />
            </div>
        );
    }
    
    if (isLocked) {
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
          <div className="flex flex-col min-h-screen text-[#344e41] dark:text-gray-200 font-sans">
            <Header streak={userProfile?.streak} onOpenSettings={() => setIsSettingsModalOpen(true)} />
            <JournalView 
              dailyPrompt={dailyPrompt?.text}
              todaysEntry={todaysEntry}
              allEntries={journalEntries}
              isLoading={isLoading}
              onSave={handleSaveEntry}
              onUpdate={handleUpdateEntry}
              onDelete={handleDeleteEntry}
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
          onClose={() => setIsSettingsModalOpen(false)}
          onSave={setSettings}
        />
      )}
      {renderContent()}
    </>
  );
};

export default App;