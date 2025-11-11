
import React, { useState, useEffect } from 'react';
import { getDayAndMonth, generateFinalSummary, analyzeJournalEntry } from './services/geminiService';
import { getDailyPrompt } from './services/promptGenerator';
import { generateWeeklySummary as fetchWeeklySummary } from './services/geminiProxyClient';
import { JournalEntry, UserProfile, EntryAnalysis, Settings, EveningCheckin, InsightFrequency, WeeklySummaryData } from './types';
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
import NameCollection from './components/NameCollection';
import IntentionSetting from './components/IntentionSetting';


type AppState = 'welcome' | 'name_collection' | 'returning_welcome' | 'onboarding' | 'intention_setting' | 'scripting' | 'onboarding_completion' | 'journal';

const App: React.FC = () => {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [appState, setAppState] = useState<AppState>('welcome');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<Settings>({ theme: 'default', themeMode: 'system', insightFrequency: 'daily', includeHunchesInFinalSummary: false });
  const [isLocked, setIsLocked] = useState(true);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isJourneyOver, setIsJourneyOver] = useState(false);
  const [finalSummaryText, setFinalSummaryText] = useState('');
  const [dailyPrompt, setDailyPrompt] = useState<{ text: string, isMilestone: boolean } | null>(null);
  const [crisisSeverity, setCrisisSeverity] = useState<CrisisSeverity>(0);
  const [userName, setUserName] = useState('');


  // On app load, schedule the next daily reminder if permission is granted.
  useEffect(() => {
    scheduleDailyReminder();
  }, []);

  // Load from local storage on mount
  useEffect(() => {
    try {
        const savedSettings = localStorage.getItem('settings');
        const defaultSettings: Settings = { theme: 'default', themeMode: 'system', insightFrequency: 'daily', includeHunchesInFinalSummary: false };

        if (savedSettings) {
            let parsed = JSON.parse(savedSettings);
            // Migration for old theme setting structure
            if (parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system') {
                const oldTheme = parsed.theme;
                delete parsed.theme;
                parsed = { ...parsed, themeMode: oldTheme, theme: 'default' };
            }
            setSettings({ ...defaultSettings, ...parsed });

            if (parsed.pin) {
                setIsLocked(true);
            } else {
                setIsLocked(false);
            }
        } else {
            setSettings(defaultSettings);
            setIsLocked(false);
        }

        const savedProfile = localStorage.getItem('userProfile');
        if (savedProfile) {
            const profile: UserProfile = JSON.parse(savedProfile);
             // Migration from 'stage' to 'arc'
            if ((profile as any).stage) {
                const oldStage = (profile as any).stage;
                if (oldStage === 'reconstruction') profile.arc = 'unstuck';
                else if (oldStage === 'expansion') profile.arc = 'healed';
                else profile.arc = 'healing';
                delete (profile as any).stage;
            }
            setUserProfile(profile);

            const savedEntries = localStorage.getItem('journalEntries');
            if (savedEntries) {
                const rawEntries: any[] = JSON.parse(savedEntries);
                // Migration: Add `type` to entries that don't have it and parse summaryData
                const typedEntries = rawEntries.map(e => ({
                    ...e,
                    type: e.type || (e.prompt.includes("Reflection on Week") ? 'weekly_summary' : 'daily'),
                    summaryData: e.type === 'weekly_summary_report' && typeof e.rawText === 'string' ? JSON.parse(e.rawText) : undefined,
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
    document.documentElement.className = ''; // Clear all classes first
    document.documentElement.classList.add(`theme-${settings.theme}`);
    if (settings.themeMode === 'dark' || (settings.themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
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
        const entriesToSave = journalEntries.map(entry => {
            // Don't save summaryData directly, it's derived from rawText on load
            const { summaryData, ...rest } = entry;
            return rest;
        });
        localStorage.setItem('journalEntries', JSON.stringify(entriesToSave));
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

    // Add a placeholder while the summary is generating
    const summaryPlaceholder: JournalEntry = {
        id: summaryEntryId,
        date: new Date().toISOString(),
        day: day,
        week: weekToSummarize,
        type: 'weekly_summary_report',
        prompt: `🌿 Reflection on Week ${weekToSummarize}`,
        rawText: '{"status": "loading"}', // Use JSON to indicate loading state
    };
    setJournalEntries(prev => [...prev, summaryPlaceholder]);

    try {
        const weekEntries = journalEntries.filter(entry => entry.week === weekToSummarize && (entry.type === 'daily' || entry.type === 'hunch'));
        
        const summaryData: WeeklySummaryData = await fetchWeeklySummary({
            userProfile,
            week: weekToSummarize,
            entries: weekEntries,
        });

        if (summaryData.crisisDetected) {
            setCrisisSeverity(3);
            // Remove placeholder and don't save summary
            setJournalEntries(prev => prev.filter(entry => entry.id !== summaryEntryId));
            setUserProfile(prev => ({ ...prev!, week_count: newWeek })); // Still advance week
            return;
        }
        
        const summaryEntry: JournalEntry = {
            id: summaryEntryId,
            date: new Date().toISOString(),
            day,
            week: weekToSummarize,
            type: 'weekly_summary_report',
            prompt: `🌿 Reflection on Week ${weekToSummarize}`,
            rawText: JSON.stringify(summaryData),
            summaryData: summaryData,
        };

        setJournalEntries(prev => prev.map(entry => entry.id === summaryEntryId ? summaryEntry : entry));
        setUserProfile(prev => ({ ...prev!, week_count: newWeek }));

    } catch (error) {
        console.error("Error generating weekly summary:", error);
        const errorSummary = {
            weekNumber: weekToSummarize,
            dateRange: "N/A",
            stage: "Error",
            themes: ["Connection Error"],
            challenges: ["Could not generate summary."],
            growth: [],
            metrics: { entries: 0, streak: 0, completionRate: '0%' },
            notableExcerpts: [],
            actionPlan: ["Try again later."],
            encouragement: "There was a technical issue preparing your summary. Your journal entries are safe. Please try again later."
        };
        const errorEntry: JournalEntry = {
             id: summaryEntryId,
            date: new Date().toISOString(),
            day,
            week: weekToSummarize,
            type: 'weekly_summary_report',
            prompt: `🌿 Reflection on Week ${weekToSummarize}`,
            rawText: JSON.stringify(errorSummary),
            summaryData: errorSummary,
        }
        setJournalEntries(prev => prev.map(entry => entry.id === summaryEntryId ? errorEntry : entry));
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
                 const promptText = getDailyPrompt(userProfile, day, journalEntries.length);
                 setDailyPrompt({ text: promptText, isMilestone: false }); // Note: Milestone logic would need to be added to promptGenerator
            }
            setIsLoading(false);
        }
    };

    if (appState === 'journal' && userProfile && !userProfile.isPaused) {
        setupJournal();
    }
  }, [appState, userProfile]);

  const handleOnboardingComplete = (profile: Omit<UserProfile, 'idealSelfManifesto' | 'name' | 'intentions'>) => {
    setUserProfile({ ...profile, name: userName, intentions: '' });
    setAppState('intention_setting');
  }
  
  const handleIntentionSettingComplete = (intentions: string) => {
    if (userProfile) {
        setUserProfile(prev => ({...prev!, intentions}));
        setAppState('scripting');
    }
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
        return <WelcomeScreen onStart={() => setAppState('name_collection')} />;
      case 'name_collection':
          return <NameCollection onComplete={(name) => {
              setUserName(name);
              setAppState('onboarding');
          }} />;
      case 'returning_welcome':
        if (userProfile) {
          const { day } = getDayAndMonth(userProfile.startDate);
          const todaysEntry = journalEntries.find(entry => entry.day === day && entry.type === 'daily');
          return <ReturnUserWelcomeScreen userProfile={userProfile} todaysEntry={todaysEntry} onContinue={() => setAppState('journal')} />;
        }
        return null;
      case 'onboarding':
        return <Onboarding onComplete={handleOnboardingComplete} />;
      case 'intention_setting':
        return <IntentionSetting onComplete={handleIntentionSettingComplete} />;
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
                <div className="flex flex-col min-h-screen text-[var(--text-primary)] font-sans">
                    <Header streak={userProfile?.streak} onOpenSettings={() => setIsSettingsModalOpen(true)} />
                    <PausedScreen onResume={handleResumeJourney} />
                </div>
            );
        }

        return (
          <div className="flex flex-col min-h-screen text-[var(--text-primary)] font-sans">
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