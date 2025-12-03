
import React, { useState, useEffect } from 'react';
import { getDayAndMonth, generateFinalSummary, analyzeJournalEntry, generateWeeklySummary, generateMonthlySummary } from './services/geminiService';
import { getDailyPrompt } from './services/promptGenerator';
import { JournalEntry, UserProfile, EntryAnalysis, Settings, EveningCheckin, SummaryData, HunchType } from './types';
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
import ReturnUserWelcomeScreen from './components/ReturnUserWelcomeScreen';
import OnboardingCompletion from './components/OnboardingCompletion';
import PausedScreen from './components/PausedScreen';
import NameCollection from './components/NameCollection';
import IntentionSetting from './components/IntentionSetting';
import Menu from './components/Menu';
import ReportViewer from './components/ReportViewer';
import CalendarView from './components/CalendarView';


type AppState = 'welcome' | 'name_collection' | 'returning_welcome' | 'onboarding' | 'intention_setting' | 'scripting' | 'onboarding_completion' | 'journal';

// Helper function to get local date string in YYYY-MM-DD format (not UTC)
const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const App: React.FC = () => {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [appState, setAppState] = useState<AppState>('welcome');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<Settings>({
      theme: 'default',
      themeMode: 'system',
      dailyAnalysis: true,
      weeklyReports: true,
      monthlyReports: true,
      includeHunchesInFinalSummary: false
  });
  const [isLocked, setIsLocked] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isJourneyOver, setIsJourneyOver] = useState(false);
  const [finalSummaryText, setFinalSummaryText] = useState('');
  const [dailyPrompt, setDailyPrompt] = useState<{ text: string, isMilestone: boolean } | null>(null);
  const [crisisSeverity, setCrisisSeverity] = useState<CrisisSeverity>(0);
  const [userName, setUserName] = useState('');
  const [viewedReport, setViewedReport] = useState<JournalEntry | null>(null);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);


  // On app load, schedule the next daily reminder if permission is granted.
  useEffect(() => {
    scheduleDailyReminder();
  }, []);

  // Load from local storage on mount
  useEffect(() => {
    try {
        const savedSettings = localStorage.getItem('settings');
        const defaultSettings: Settings = { 
            theme: 'default', 
            themeMode: 'system', 
            dailyAnalysis: true,
            weeklyReports: true,
            monthlyReports: true,
            includeHunchesInFinalSummary: false,
        };

        if (savedSettings) {
            let parsed = JSON.parse(savedSettings);
            // Migration for old theme setting structure
            if (parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system') {
                const oldTheme = parsed.theme;
                delete parsed.theme;
                parsed = { ...parsed, themeMode: oldTheme, theme: 'default' };
            }
            // Migration for old InsightFrequency
            if ('insightFrequency' in parsed) {
                const freq = parsed.insightFrequency;
                if (freq === 'daily') {
                    parsed.dailyAnalysis = true;
                    parsed.weeklyReports = true;
                    // keep monthly as is or default true if undefined
                } else if (freq === 'weekly') {
                    parsed.dailyAnalysis = false;
                    parsed.weeklyReports = true;
                } else if (freq === 'none') {
                    parsed.dailyAnalysis = false;
                    parsed.weeklyReports = false;
                    parsed.monthlyReports = false;
                }
                // If generateMonthlySummaries was present, map to monthlyReports
                if ('generateMonthlySummaries' in parsed) {
                    parsed.monthlyReports = parsed.generateMonthlySummaries;
                    delete parsed.generateMonthlySummaries;
                } else if (parsed.monthlyReports === undefined) {
                     parsed.monthlyReports = true;
                }
                delete parsed.insightFrequency;
            }
            
            setSettings({ ...defaultSettings, ...parsed });
            setHasLoadedSettings(true);

            if (parsed.pin) {
                setIsLocked(true);
            } else {
                setIsLocked(false);
            }
        } else {
            setSettings(defaultSettings);
            setHasLoadedSettings(true);
            setIsLocked(false);
        }

        const savedProfile = localStorage.getItem('userProfile');
        if (savedProfile) {
            const profile: UserProfile = JSON.parse(savedProfile);
             // Migration from 'stage' to 'arc'
            if ((profile as any).stage) {
                const oldStage = (profile as any).stage;
                if (oldStage === 'reconstruction') profile.arc = 'reaffirm';
                else if (oldStage === 'expansion') profile.arc = 'reignition';
                else profile.arc = 'release';
                delete (profile as any).stage;
            }
            // Initialize month_count if missing
            if (!profile.month_count) profile.month_count = 1;

            setUserProfile(profile);

            const savedEntries = localStorage.getItem('journalEntries');
            if (savedEntries) {
                const rawEntries: any[] = JSON.parse(savedEntries);
                // Migration: Add `type` to entries that don't have it and parse summaryData
                const typedEntries = rawEntries.map(e => ({
                    ...e,
                    type: e.type || (e.prompt.includes("Reflection on Week") ? 'weekly_summary' : 'daily'),
                    summaryData: (e.type === 'weekly_summary_report' || e.type === 'monthly_summary_report') && typeof e.rawText === 'string' ? JSON.parse(e.rawText) : undefined,
                }));
                setJournalEntries(typedEntries);
            }
            
            if (!profile.idealSelfManifesto) {
                setAppState('scripting');
            } else {
                 // Check if onboarding was completed by checking if any entry exists or just logic based on flow
                 // For simplicity, if we have settings saved we assume completed.
                 const settingsExist = !!savedSettings;
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
    // Don't save on initial render - wait until we've loaded from localStorage first
    if (!hasLoadedSettings) {
      console.log('⏭️ Skipping settings save - not loaded yet');
      return;
    }

    console.log('💾 Saving settings to localStorage:', settings);
    localStorage.setItem('settings', JSON.stringify(settings));
    console.log('✅ Settings saved. PIN in storage:', JSON.parse(localStorage.getItem('settings') || '{}').pin);

    // Apply theme
    document.documentElement.className = ''; // Clear all classes first
    document.documentElement.classList.add(`theme-${settings.theme}`);
    if (settings.themeMode === 'dark' || (settings.themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    }
  }, [settings, hasLoadedSettings]);

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
            // Don't save summaryData directly, it's derived from rawText on load to save space
            const { summaryData, ...rest } = entry;
            return rest;
        });
        localStorage.setItem('journalEntries', JSON.stringify(entriesToSave));
    }
  }, [journalEntries, isLoading]);

  // Helper function to get today's completion state
  const getTodayCompletion = () => {
    const today = getLocalDateString();
    const { day } = userProfile ? getDayAndMonth(userProfile.startDate) : { day: 0 };

    // Check if today's entry exists
    const todaysEntry = journalEntries.find(entry => entry.day === day && entry.type === 'daily');
    const morningEntryCompleted = !!todaysEntry;
    const eveningCheckinCompleted = !!todaysEntry?.eveningCheckin;

    // Check if today's ritual is complete
    const ritualCompleted = settings.lastRitualDate === today && settings.ritualCompletedToday === true;

    return { ritualCompleted, morningEntryCompleted, eveningCheckinCompleted };
  };

  // Helper function to update daily completion tracking
  const updateDailyCompletion = () => {
    const today = getLocalDateString();
    const completion = getTodayCompletion();

    // Update or create today's completion record
    const existingCompletions = settings.dailyCompletions || [];
    const todayCompletionIndex = existingCompletions.findIndex(c => c.date === today);

    const newCompletion = {
      date: today,
      ...completion
    };

    // Check if this completes the day (all three tasks done)
    const wasCompleted = todayCompletionIndex >= 0 ?
      existingCompletions[todayCompletionIndex].ritualCompleted &&
      existingCompletions[todayCompletionIndex].morningEntryCompleted &&
      existingCompletions[todayCompletionIndex].eveningCheckinCompleted : false;

    const isNowCompleted = completion.ritualCompleted &&
                          completion.morningEntryCompleted &&
                          completion.eveningCheckinCompleted;

    let updatedCompletions;
    if (todayCompletionIndex >= 0) {
      // Update existing completion
      updatedCompletions = [...existingCompletions];
      updatedCompletions[todayCompletionIndex] = newCompletion;
    } else {
      // Add new completion (keep last 90 days only)
      updatedCompletions = [...existingCompletions, newCompletion].slice(-90);
    }

    setSettings(prev => ({
      ...prev,
      dailyCompletions: updatedCompletions
    }));

    // Send notification if day just completed
    if (!wasCompleted && isNowCompleted) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Perfect Day Complete! 🎉', {
          body: 'You\'ve completed your daily ritual, morning entry, and evening check-in. Amazing consistency!',
          icon: '/favicon.ico',
          badge: '/favicon.ico'
        });
      }
    }
  };

  const handleSaveEntry = async (text: string) => {
    if (isLoading || !text.trim() || !userProfile || !dailyPrompt) return;

    setIsLoading(true);

    const severity = detectCrisis(text);

    const { day } = getDayAndMonth(userProfile.startDate);
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
    if (settings.dailyAnalysis) {
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
          // Update daily completion tracking after entry is saved
          setTimeout(() => updateDailyCompletion(), 100);
        }
    } else {
        // If not daily insights, just finalize the save.
        scheduleEveningReminder();
        if (dailyPrompt.isMilestone) {
          const milestoneDay = day - 1;
          setUserProfile(prev => ({ ...prev!, lastMilestoneDayCompleted: milestoneDay }));
        }
        setIsLoading(false);
        // Update daily completion tracking after entry is saved
        setTimeout(() => updateDailyCompletion(), 100);
    }
  };

  const handleSaveHunch = (text: string, hunchType: HunchType = 'hunch') => {
    if (!text.trim() || !userProfile) return;

    const { day } = getDayAndMonth(userProfile.startDate);
    const currentWeek = Math.floor((day - 1) / 7) + 1;
    const prompts = {
        hunch: 'Intuitive Hunch',
        dream: 'Dream Record',
        insight: 'Sudden Insight'
    };

    const newHunch: JournalEntry = {
        id: new Date().toISOString(),
        date: new Date().toISOString(),
        day: day,
        week: currentWeek,
        type: 'hunch',
        hunchType: hunchType,
        prompt: prompts[hunchType],
        rawText: text,
    };

    setJournalEntries(prev => [...prev, newHunch]);
  };

  const handleUpdateEntry = async (entryId: string, newText: string, reanalyze: boolean, hunchType?: HunchType) => {
    if (isLoading || !newText.trim()) return;
    
    const entryToUpdate = journalEntries.find(e => e.id === entryId);
    if (!entryToUpdate) return;
    
    // Ensure we only re-analyze daily entries.
    const shouldReanalyze = reanalyze && entryToUpdate.type === 'daily';

    setIsLoading(true);

    if (!shouldReanalyze) {
        setJournalEntries(prev => prev.map(entry =>
            entry.id === entryId 
            ? { ...entry, rawText: newText, date: new Date().toISOString(), hunchType: hunchType || entry.hunchType, prompt: hunchType ? (hunchType === 'dream' ? 'Dream Record' : hunchType === 'insight' ? 'Sudden Insight' : 'Intuitive Hunch') : entry.prompt } 
            : entry
        ));
        setIsLoading(false);
        return;
    }

    // --- Re-analysis logic ---
    const severity = detectCrisis(newText);
    if (severity >= 2) {
      setCrisisSeverity(severity);
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
    // Update daily completion tracking after evening check-in is saved
    setTimeout(() => updateDailyCompletion(), 100);
  };

  const handleGenerateWeeklySummary = async (weekToSummarize: number, newWeek: number, isRegeneration: boolean = false) => {
    if (!userProfile || !userProfile.idealSelfManifesto) return;

    if (!settings.weeklyReports) {
        setUserProfile(prev => ({ ...prev!, week_count: newWeek }));
        return;
    }

    setIsLoading(true);

    const summaryEntryId = new Date().toISOString();
    const { day } = getDayAndMonth(userProfile.startDate);

    // If regenerating, remove existing report for this week
    if (isRegeneration) {
        setJournalEntries(prev => prev.filter(entry => !(entry.week === weekToSummarize && entry.type === 'weekly_summary_report')));
    }

    // Add a placeholder
    const summaryPlaceholder: JournalEntry = {
        id: summaryEntryId,
        date: new Date().toISOString(),
        day: day,
        week: weekToSummarize,
        type: 'weekly_summary_report',
        prompt: `🌿 Reflection on Week ${weekToSummarize}`,
        rawText: '{"status": "loading"}',
        summaryData: { status: 'loading' } as any,
    };
    setJournalEntries(prev => [...prev, summaryPlaceholder]);

    try {
        const weekEntries = journalEntries.filter(entry => entry.week === weekToSummarize && (entry.type === 'daily' || entry.type === 'hunch'));

        const summaryData: SummaryData = await generateWeeklySummary(userProfile, weekToSummarize, weekEntries);

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
        alert(`✅ Week ${weekToSummarize} report generated! Check the Reports section.`);
        if (!isRegeneration) {
            setUserProfile(prev => ({ ...prev!, week_count: newWeek }));
        }

    } catch (error) {
        console.error("Error generating weekly summary:", error);
        alert(`❌ Error generating report: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Remove placeholder on error to allow retry next load or avoid corrupt state
         setJournalEntries(prev => prev.filter(entry => entry.id !== summaryEntryId));
        if (!isRegeneration) {
            setUserProfile(prev => ({ ...prev!, week_count: newWeek }));
        }
    } finally {
        setIsLoading(false);
    }
};

  const handleGenerateMonthlySummary = async (monthToSummarize: number, newMonth: number) => {
    if (!userProfile || !settings.monthlyReports) {
         if (userProfile) setUserProfile(prev => ({ ...prev!, month_count: newMonth }));
         return;
    }

    setIsLoading(true);
    const summaryEntryId = new Date().toISOString();
    const { day } = getDayAndMonth(userProfile.startDate);

    const summaryPlaceholder: JournalEntry = {
        id: summaryEntryId,
        date: new Date().toISOString(),
        day: day,
        week: userProfile.week_count,
        type: 'monthly_summary_report',
        prompt: `📅 Monthly Insight: Month ${monthToSummarize}`,
        rawText: '{"status": "loading"}',
        summaryData: { status: 'loading' } as any,
    };
    setJournalEntries(prev => [...prev, summaryPlaceholder]);

    try {
        // Get entries that roughly correspond to the month. Logic: entries with day within (month-1)*30 to month*30
        const startDay = (monthToSummarize - 1) * 30;
        const endDay = monthToSummarize * 30;
        const monthEntries = journalEntries.filter(entry => entry.day > startDay && entry.day <= endDay && (entry.type === 'daily' || entry.type === 'hunch'));

        const summaryData: SummaryData = await generateMonthlySummary(userProfile, monthToSummarize, monthEntries);

        const summaryEntry: JournalEntry = {
            id: summaryEntryId,
            date: new Date().toISOString(),
            day,
            week: userProfile.week_count,
            type: 'monthly_summary_report',
            prompt: `📅 Monthly Insight: Month ${monthToSummarize}`,
            rawText: JSON.stringify(summaryData),
            summaryData: summaryData,
        };

        setJournalEntries(prev => prev.map(entry => entry.id === summaryEntryId ? summaryEntry : entry));
        setUserProfile(prev => ({ ...prev!, month_count: newMonth }));

    } catch (error) {
        console.error("Error generating monthly summary:", error);
        setJournalEntries(prev => prev.filter(entry => entry.id !== summaryEntryId));
        setUserProfile(prev => ({ ...prev!, month_count: newMonth }));
    } finally {
        setIsLoading(false);
    }
  };

  const handleFinalSummary = async () => {
    if (!userProfile) return;

    setIsLoading(true);
    
    try {
        const dailyHistory = journalEntries.filter(e => e.type === 'daily');
        // Filter hunches based on settings
        const hunchHistory = settings.includeHunchesInFinalSummary
            ? journalEntries.filter(e => e.type === 'hunch' && (!settings.finalSummaryIncludedTypes || settings.finalSummaryIncludedTypes.includes(e.hunchType || 'hunch')))
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

            // Handle Weekly Summaries
            // Only generate reports for COMPLETE weeks (7 full days)
            const completedWeeks = Math.floor((day - 1) / 7);
            if (userProfile.week_count <= completedWeeks) {
                for (let week = userProfile.week_count; week <= completedWeeks; week++) {
                    await handleGenerateWeeklySummary(week, week + 1);
                }
            }

            // Handle Monthly Summaries
            // Generate on day 30, 60, 90 (when month completes)
            // Day 30: completedMonths = 1, Day 60: completedMonths = 2, Day 90: completedMonths = 3
            const completedMonths = Math.floor(day / 30);
            console.log('📅 Monthly Report Check:', {
                currentDay: day,
                completedMonths,
                userMonthCount: userProfile.month_count,
                shouldGenerate: userProfile.month_count <= completedMonths,
                monthlyReportsEnabled: settings.monthlyReports
            });
            if (userProfile.month_count <= completedMonths) {
                 for (let month = userProfile.month_count; month <= completedMonths; month++) {
                    console.log(`📅 Generating monthly report for Month ${month}`);
                    await handleGenerateMonthlySummary(month, month + 1);
                 }
            }
            
            const todayEntry = journalEntries.find(entry => entry.day === day && entry.type === 'daily');
            if (!todayEntry) {
                 const promptText = getDailyPrompt(userProfile, day, journalEntries);
                 setDailyPrompt({ text: promptText, isMilestone: false });
            }
            setIsLoading(false);
        }
    };

    if (appState === 'journal' && userProfile && !userProfile.isPaused) {
        setupJournal();
    }
  }, [appState, userProfile]);

  const handleOnboardingComplete = (profile: Omit<UserProfile, 'idealSelfManifesto' | 'name' | 'intentions'>) => {
    setUserProfile({ ...profile, name: userName, intentions: '', month_count: 1 });
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

  const handleOnboardingCompletion = async (newSettings: { dailyAnalysis: boolean; weeklyReports: boolean; monthlyReports: boolean }) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    setAppState('journal');
    const permissionGranted = await safeRequestNotificationPermission();
    if (permissionGranted) {
        scheduleDailyReminder();
    }
  };

  const restartJourney = () => {
    if (window.confirm("Are you sure you want to restart? All data will be cleared.")) {
        localStorage.removeItem('userProfile');
        localStorage.removeItem('journalEntries');
        localStorage.removeItem('settings');
        window.location.reload();
    }
  };

  const exportData = () => {
      const data = {
          userProfile,
          settings,
          journalEntries
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `identity-reset-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
  };

  const deleteData = () => {
      localStorage.clear();
      window.location.reload();
  };

  const handlePauseJourney = () => {
    if (userProfile && window.confirm("Pause your journey? Your progress and streak will be saved.")) {
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

  const handleViewReport = (report: JournalEntry) => {
      if (userProfile) {
          // Update last viewed report date
          const reportDate = new Date(report.date);
          const lastViewed = userProfile.lastViewedReportDate ? new Date(userProfile.lastViewedReportDate) : new Date(0);

          if (reportDate > lastViewed) {
              setUserProfile(prev => ({...prev!, lastViewedReportDate: report.date}));
          }
      }
      // Open the dedicated report viewer modal
      setViewedReport(report);
      setIsMenuOpen(false); // Close the menu
  };
  
  // Include all report type entries that have summaryData (including loading states for now)
  const reports = journalEntries.filter(e =>
    (e.type === 'weekly_summary_report' || e.type === 'monthly_summary_report') &&
    e.summaryData
  );
  const hasUnreadReports = userProfile?.lastViewedReportDate 
      ? reports.some(r => new Date(r.date) > new Date(userProfile.lastViewedReportDate!))
      : reports.length > 0;


  const renderContent = () => {
    if (isLoading && appState !== 'journal') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner />
            </div>
        );
    }
    
    if (isLocked && settings.pin) {
        return (
            <PinLockScreen
                correctPin={settings.pin!}
                userEmail={userProfile?.email}
                onUnlock={() => setIsLocked(false)}
                onPinReset={(newPin) => {
                    setSettings({ ...settings, pin: newPin });
                    setIsLocked(false);
                }}
            />
        );
    }

    if (isJourneyOver && finalSummaryText && userProfile) {
      return (
        <CelebrationScreen
          completionSummary={finalSummaryText}
          userProfile={userProfile}
          journalEntries={journalEntries}
          settings={settings}
          onRestart={restartJourney}
          onExport={exportData}
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
          const today = getLocalDateString();
          const ritualCompleted = settings.lastRitualDate === today && settings.ritualCompletedToday === true;
          return <ReturnUserWelcomeScreen userProfile={userProfile} todaysEntry={todaysEntry} onContinue={() => setAppState('journal')} ritualCompleted={ritualCompleted} />;
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
        const todayCompletion = getTodayCompletion();
        const todaysEntry = journalEntries.find(entry => entry.day === day && entry.type === 'daily');
        
        if (userProfile?.isPaused) {
            return (
                <div className="flex flex-col min-h-screen text-[var(--text-primary)] font-sans">
                    <Header
                        streak={userProfile?.streak}
                        onOpenMenu={() => setIsMenuOpen(true)}
                        ritualCompleted={todayCompletion.ritualCompleted}
                        morningEntryCompleted={todayCompletion.morningEntryCompleted}
                        eveningCheckinCompleted={todayCompletion.eveningCheckinCompleted}
                    />
                    <PausedScreen onResume={handleResumeJourney} />
                     <Menu
                        isOpen={isMenuOpen}
                        onClose={() => setIsMenuOpen(false)}
                        userProfile={userProfile}
                        settings={settings}
                        reports={reports}
                        onUpdateSettings={setSettings}
                        onUpdateProfile={setUserProfile}
                        onPauseJourney={handlePauseJourney}
                        onResumeJourney={handleResumeJourney}
                        onExportData={exportData}
                        onDeleteData={deleteData}
                        onViewReport={handleViewReport}
                        onLockApp={() => setIsLocked(true)}
                        onRitualComplete={updateDailyCompletion}
                        onOpenCalendar={() => setIsCalendarOpen(true)}
                    />
                </div>
            );
        }

        return (
          <div className="flex flex-col min-h-screen text-[var(--text-primary)] font-sans">
            <Header
                streak={userProfile?.streak}
                onOpenMenu={() => setIsMenuOpen(true)}
                hasUnreadReports={hasUnreadReports}
                ritualCompleted={todayCompletion.ritualCompleted}
                morningEntryCompleted={todayCompletion.morningEntryCompleted}
                eveningCheckinCompleted={todayCompletion.eveningCheckinCompleted}
            />
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
             <Menu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                userProfile={userProfile}
                settings={settings}
                reports={reports}
                onUpdateSettings={setSettings}
                onUpdateProfile={setUserProfile}
                onPauseJourney={handlePauseJourney}
                onResumeJourney={handleResumeJourney}
                onExportData={exportData}
                onDeleteData={deleteData}
                onViewReport={handleViewReport}
                onRegenerateReport={(weekOrMonth, type) => {
                    if (type === 'weekly') {
                        handleGenerateWeeklySummary(weekOrMonth, weekOrMonth, true);
                    }
                }}
                onLockApp={() => setIsLocked(true)}
                onRitualComplete={updateDailyCompletion}
                onOpenCalendar={() => setIsCalendarOpen(true)}
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
      <ReportViewer
        report={viewedReport}
        onClose={() => setViewedReport(null)}
      />
      <CalendarView
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        settings={settings}
        userProfile={userProfile}
      />
      {renderContent()}
    </>
  );
};

export default App;
