
import React, { useState, useEffect, useMemo } from 'react';
import { getDayAndMonth, generateFinalSummary, analyzeJournalEntry, generateWeeklySummary, generateMonthlySummary } from './services/geminiService';
import { getDailyPrompt } from './services/promptGenerator';
import { JournalEntry, UserProfile, EntryAnalysis, Settings, EveningCheckin, SummaryData, HunchType, MoodJournalEntry, CustomEmotion } from './types';
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
import { AdminDashboard } from './components/AdminDashboard';
import { useAuth } from './src/hooks/useAuth';
import { getStorageService } from './src/services/storageService';
import { AuthModal } from './components/AuthModal';
import { CloudSyncBanner } from './components/CloudSyncBanner';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { TermsOfService } from './components/TermsOfService';
import { ContactUs } from './components/ContactUs';
import MoodInputModal from './components/MoodInputModal';
import MoodJournalView from './components/MoodJournalView';
import MoodCalendarView from './components/MoodCalendarView';


type AppState = 'welcome' | 'name_collection' | 'returning_welcome' | 'onboarding' | 'intention_setting' | 'scripting' | 'onboarding_completion' | 'journal';

// Helper function to get local date string in YYYY-MM-DD format (not UTC)
const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to remove duplicate weekly/monthly reports
// Keeps only the most recent report for each week/month
const removeDuplicateReports = (entries: JournalEntry[]): JournalEntry[] => {
  const reportsByKey = new Map<string, JournalEntry[]>();
  const nonReports: JournalEntry[] = [];

  // Separate reports from other entries
  for (const entry of entries) {
    if (entry.type === 'weekly_summary_report' || entry.type === 'monthly_summary_report') {
      const key = `${entry.type}-${entry.week || 0}`;
      if (!reportsByKey.has(key)) {
        reportsByKey.set(key, []);
      }
      reportsByKey.get(key)!.push(entry);
    } else {
      nonReports.push(entry);
    }
  }

  // For each group of duplicate reports, keep only the most recent one
  const uniqueReports: JournalEntry[] = [];
  for (const [key, reports] of reportsByKey) {
    // Sort by date (most recent first) and keep the first one
    const sorted = reports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    // Keep the most recent report that's not a loading placeholder
    const validReport = sorted.find(r => r.rawText !== '{"status": "loading"}');
    if (validReport) {
      uniqueReports.push(validReport);
    } else if (sorted.length > 0) {
      // If all are loading placeholders, keep the most recent one
      uniqueReports.push(sorted[0]);
    }
  }

  // Combine non-reports with unique reports
  return [...nonReports, ...uniqueReports];
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
      includeHunchesInFinalSummary: false,
      moodStreakEnabled: true,
      customEmotions: []
  });
  const [isLocked, setIsLocked] = useState(true);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [adminKeyPresses, setAdminKeyPresses] = useState<string[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isJourneyOver, setIsJourneyOver] = useState(false);
  const [finalSummaryText, setFinalSummaryText] = useState('');
  const [dailyPrompt, setDailyPrompt] = useState<{ text: string, isMilestone: boolean } | null>(null);
  const [crisisSeverity, setCrisisSeverity] = useState<CrisisSeverity>(0);
  const [userName, setUserName] = useState('');
  const [viewedReport, setViewedReport] = useState<JournalEntry | null>(null);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [hasMigrated, setHasMigrated] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showContact, setShowContact] = useState(false);

  // Mood journaling state
  const [moodEntries, setMoodEntries] = useState<MoodJournalEntry[]>([]);
  const [showMoodInputModal, setShowMoodInputModal] = useState(false);
  const [editingMoodEntry, setEditingMoodEntry] = useState<MoodJournalEntry | null>(null);
  const [isSavingMoodEntry, setIsSavingMoodEntry] = useState(false);
  const [activeView, setActiveView] = useState<'journey' | 'mood'>('journey'); // Toggle between 90-day journey and mood journal
  const [calendarView, setCalendarView] = useState<'journey' | 'mood'>('journey'); // Calendar toggle

  // Firebase auth state and storage service
  const { user, loading: authLoading } = useAuth();
  const storageService = useMemo(() => getStorageService(user?.uid), [user?.uid]);

  // Ref to track latest journalEntries for completion tracking
  const journalEntriesRef = React.useRef(journalEntries);
  const userProfileRef = React.useRef(userProfile);

  // Update refs when state changes
  useEffect(() => {
    journalEntriesRef.current = journalEntries;
  }, [journalEntries]);

  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);

  // On app load, schedule the next daily reminder if permission is granted.
  useEffect(() => {
    scheduleDailyReminder();
  }, []);

  // Load from storage on mount (localStorage or Firestore based on auth)
  useEffect(() => {
    const loadData = async () => {
      try {
        // Wait for auth to load
        if (authLoading) return;

        const defaultSettings: Settings = {
          theme: 'default',
          themeMode: 'system',
          dailyAnalysis: true,
          weeklyReports: true,
          monthlyReports: true,
          includeHunchesInFinalSummary: false,
        };

        // Load settings
        const savedSettings = await storageService.getSettings();
        if (savedSettings) {
          setSettings({ ...defaultSettings, ...savedSettings });
          setHasLoadedSettings(true);

          if (savedSettings.pin) {
            setIsLocked(true);
          } else {
            setIsLocked(false);
          }
        } else {
          setSettings(defaultSettings);
          setHasLoadedSettings(true);
          setIsLocked(false);
        }

        // Load user profile
        const savedProfile = await storageService.getUserProfile();
        if (savedProfile) {
          console.log('📦 Loaded user profile from storage:', user ? 'Firestore' : 'localStorage');
          setUserProfile(savedProfile);

          // Load journal entries
          const savedEntries = await storageService.getJournalEntries();

          // 🧹 CLEANUP: Remove duplicate weekly/monthly reports (bug fix for infinite loop issue)
          const cleanedEntries = removeDuplicateReports(savedEntries);
          if (cleanedEntries.length < savedEntries.length) {
            console.log(`🧹 Cleaned up ${savedEntries.length - cleanedEntries.length} duplicate reports`);
            // Save cleaned entries back to storage
            for (const entry of cleanedEntries) {
              await storageService.saveJournalEntry(entry);
            }
            // Remove duplicates from storage
            for (const entry of savedEntries) {
              if (!cleanedEntries.find(e => e.id === entry.id)) {
                await storageService.deleteJournalEntry(entry.id);
              }
            }
          }

          setJournalEntries(cleanedEntries);

          // Load mood entries
          const savedMoodEntries = await storageService.getMoodEntries();
          setMoodEntries(savedMoodEntries);

          // Set active view based on journey completion
          if (savedProfile.journeyCompleted) {
            setActiveView('mood'); // After journey completion, default to mood journal
          }

          if (!savedProfile.idealSelfManifesto) {
            setAppState('scripting');
          } else {
            const settingsExist = !!savedSettings;
            if (!settingsExist) {
              setAppState('onboarding_completion');
            } else {
              // User has complete profile - restore their session
              // If they were in the middle of onboarding, interrupt it and go to returning_welcome
              if (appState === 'welcome' || appState === 'name_collection' || appState === 'onboarding') {
                console.log('🔄 Existing user data found - skipping onboarding');
              }
              setAppState('returning_welcome');
            }
          }
        } else {
          console.log('📭 No user profile found in storage');
        }
      } catch (e) {
        console.error('Error loading from storage:', e);
        // On error, fall back to localStorage
        try {
          localStorage.clear();
        } catch {}
        setIsLocked(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [storageService, authLoading]);

  // Backfill completion data after journal entries are loaded
  useEffect(() => {
    // Only run after data is loaded and we have both journal entries and a user profile
    if (journalEntries.length > 0 && userProfile && hasLoadedSettings) {
      console.log('🔄 Backfilling historical completion data...');
      backfillCompletions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journalEntries, userProfile, hasLoadedSettings]);

  // Save/apply settings on change
  useEffect(() => {
    // Don't save on initial render - wait until we've loaded from storage first
    if (!hasLoadedSettings) {
      console.log('⏭️ Skipping settings save - not loaded yet');
      return;
    }

    const saveSettings = async () => {
      try {
        console.log('💾 Saving settings to storage:', settings);
        await storageService.saveSettings(settings);
        console.log('✅ Settings saved');
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
    };

    saveSettings();

    // Apply theme - remove only theme-related classes, not all classes
    const themeClasses = ['theme-default', 'theme-ocean', 'theme-sunset', 'theme-forest', 'dark'];
    themeClasses.forEach(cls => document.documentElement.classList.remove(cls));

    document.documentElement.classList.add(`theme-${settings.theme}`);
    if (
      settings.themeMode === 'dark' ||
      (settings.themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
      document.documentElement.classList.add('dark');
    }
  }, [settings, hasLoadedSettings, storageService]);

  // Admin mode keyboard shortcut: Press Ctrl+Shift+A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setShowAdminDashboard(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check for admin mode in URL (e.g., ?admin=true)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true') {
      setShowAdminDashboard(true);
    }
  }, []);

  // Save user profile to storage on change
  useEffect(() => {
    if (userProfile) {
      const saveProfile = async () => {
        try {
          await storageService.saveUserProfile(userProfile);
        } catch (error) {
          console.error('Failed to save user profile:', error);
        }
      };
      saveProfile();
    }
  }, [userProfile, storageService]);

  // Save journal entries to storage on change
  useEffect(() => {
    // Avoid saving the empty initial array before we've loaded from storage
    if (!isLoading && journalEntries.length > 0) {
      const saveEntries = async () => {
        try {
          // Note: This saves all entries. For optimization, we could track which entries changed
          // For now, FirestoreService.batchSaveEntries handles bulk operations efficiently
          for (const entry of journalEntries) {
            await storageService.saveJournalEntry(entry);
          }
        } catch (error) {
          console.error('Failed to save journal entries:', error);
        }
      };
      saveEntries();
    }
  }, [journalEntries, isLoading, storageService]);

  // Migrate localStorage data to Firestore when user signs up
  useEffect(() => {
    const migrateData = async () => {
      if (!user || hasMigrated || authLoading) return;

      // Check if migration was already completed
      const migrationCompleted = localStorage.getItem('migrationCompleted');
      if (migrationCompleted) {
        setHasMigrated(true);
        return;
      }

      // Check if there's localStorage data to migrate
      const localProfile = localStorage.getItem('userProfile');
      const localSettings = localStorage.getItem('settings');
      const localEntries = localStorage.getItem('journalEntries');
      const localMoodEntries = localStorage.getItem('moodJournalEntries');

      if (!localProfile && !localSettings && !localEntries && !localMoodEntries) {
        // No data to migrate
        setHasMigrated(true);
        return;
      }

      try {
        console.log('🔄 Migrating localStorage data to Firestore...');
        console.log('  - Profile:', !!localProfile);
        console.log('  - Settings:', !!localSettings);
        console.log('  - Journal Entries:', !!localEntries);
        console.log('  - Mood Entries:', !!localMoodEntries);

        // Import FirestoreService directly for batch operations
        const { FirestoreService } = await import('./src/services/firestoreService');
        const firestoreService = new FirestoreService(user.uid);

        if (localProfile) {
          const profile = JSON.parse(localProfile);
          console.log('  ✓ Migrating profile...');
          await firestoreService.saveUserProfile(profile);
        }

        if (localSettings) {
          const settings = JSON.parse(localSettings);
          console.log('  ✓ Migrating settings...');
          await firestoreService.saveSettings(settings);
        }

        if (localEntries) {
          const entries = JSON.parse(localEntries);
          console.log(`  ✓ Migrating ${entries.length} journal entries...`);
          // Use batch save for efficiency
          await firestoreService.batchSaveEntries(entries);
        }

        if (localMoodEntries) {
          const moodEntries = JSON.parse(localMoodEntries);
          console.log(`  ✓ Migrating ${moodEntries.length} mood entries...`);
          for (const entry of moodEntries) {
            await firestoreService.saveMoodEntry(entry);
          }
        }

        localStorage.setItem('migrationCompleted', 'true');
        localStorage.setItem('migrationDate', new Date().toISOString());

        // Clear localStorage data after successful migration to avoid confusion
        // Keep only migration flags for reference
        console.log('🧹 Clearing localStorage data after successful migration...');
        localStorage.removeItem('userProfile');
        localStorage.removeItem('journalEntries');
        localStorage.removeItem('settings');
        localStorage.removeItem('moodJournalEntries');

        setHasMigrated(true);

        console.log('✅ Migration completed successfully - reloading to fetch from cloud...');

        // Now reload to fetch data from Firestore
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        console.error('❌ Failed to migrate data:', error);
        alert('Failed to migrate your data to cloud. Please try again or contact support. Your local data is still safe.');
        // Don't set hasMigrated to true so it will retry next time
      }
    };

    migrateData();
  }, [user, hasMigrated, authLoading]);

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
  // Fixed: Use callback form and refs to access latest state and avoid stale closures
  const updateDailyCompletion = () => {
    try {
      const today = getLocalDateString();

      setSettings(prev => {
        try {
          // Recalculate completion status with fresh state using refs
          const { day } = userProfileRef.current ? getDayAndMonth(userProfileRef.current.startDate) : { day: 0 };
          const todaysEntry = journalEntriesRef.current.find(entry => entry.day === day && entry.type === 'daily');

          const completion = {
            ritualCompleted: prev.lastRitualDate === today && prev.ritualCompletedToday === true,
            morningEntryCompleted: !!todaysEntry,
            eveningCheckinCompleted: !!todaysEntry?.eveningCheckin
          };

          // Update or create today's completion record
          const existingCompletions = prev.dailyCompletions || [];
          const todayCompletionIndex = existingCompletions.findIndex(c => c?.date === today);

          const newCompletion = {
            date: today,
            ...completion
          };

          // Check if this completes the day (all three tasks done)
          const wasCompleted = todayCompletionIndex >= 0 ?
            existingCompletions[todayCompletionIndex]?.ritualCompleted &&
            existingCompletions[todayCompletionIndex]?.morningEntryCompleted &&
            existingCompletions[todayCompletionIndex]?.eveningCheckinCompleted : false;

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

          // Send notification if day just completed
          if (!wasCompleted && isNowCompleted) {
            try {
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Perfect Day Complete! 🎉', {
                  body: 'You\'ve completed your daily ritual, morning entry, and evening check-in. Amazing consistency!',
                  icon: '/favicon.ico',
                  badge: '/favicon.ico'
                });
              }
            } catch (notifError) {
              console.error('Error sending notification:', notifError);
              // Don't fail the whole update if notification fails
            }
          }

          return {
            ...prev,
            dailyCompletions: updatedCompletions
          };
        } catch (innerError) {
          console.error('Error in updateDailyCompletion setSettings callback:', innerError);
          // Return previous state if there's an error
          return prev;
        }
      });
    } catch (error) {
      console.error('Error in updateDailyCompletion:', error);
      // Don't throw - just log and continue
    }
  };

  // Backfill historical completion data from journal entries
  // This fixes the calendar to show all past completions, not just today's
  const backfillCompletions = () => {
    try {
      if (!userProfileRef.current) return;

      const startDate = new Date(userProfileRef.current.startDate);
      const entries = journalEntriesRef.current;
      const today = getLocalDateString();

      setSettings(prev => {
        try {
          const existingCompletions = prev.dailyCompletions || [];
          const completionsMap = new Map(existingCompletions.map(c => [c?.date, c]).filter(([date]) => date));

          // Build completion records for each day from journal entries
          for (let journeyDay = 1; journeyDay <= 90; journeyDay++) {
            const dayDate = new Date(startDate);
            dayDate.setDate(dayDate.getDate() + journeyDay - 1);
            const dateStr = getLocalDateString(dayDate);

            // Find the daily entry for this journey day
            const dayEntry = entries.find(entry => entry.day === journeyDay && entry.type === 'daily');

            if (dayEntry) {
              // For today, use the current ritual status
              // For past days, assume ritual was completed if entry exists (we can't know for sure)
              const isToday = dateStr === today;
              const ritualCompleted = isToday
                ? (prev.lastRitualDate === dateStr && prev.ritualCompletedToday === true)
                : true; // Assume completed for past days with entries

              const completion = {
                date: dateStr,
                ritualCompleted,
                morningEntryCompleted: true, // Entry exists
                eveningCheckinCompleted: !!dayEntry.eveningCheckin
              };

              completionsMap.set(dateStr, completion);
            }
          }

          // Convert map back to array and keep only last 90 days
          const updatedCompletions = Array.from(completionsMap.values())
            .filter(c => c && c.date) // Filter out any invalid entries
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-90);

          return {
            ...prev,
            dailyCompletions: updatedCompletions
          };
        } catch (innerError) {
          console.error('Error in backfillCompletions setSettings callback:', innerError);
          return prev;
        }
      });
    } catch (error) {
      console.error('Error in backfillCompletions:', error);
      // Don't throw - just log and continue
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

          // Check if it's a quota error
          const errorMessage = error instanceof Error ? error.message : String(error);
          const isQuotaError = errorMessage.toLowerCase().includes('quota') ||
                               errorMessage.toLowerCase().includes('429');

          const entryWithError: JournalEntry = {
              ...newEntry,
              analysis: {
                  summary: isQuotaError
                    ? "Daily analysis quota reached. Your entry is safely saved. You can disable auto-analysis in settings or try again later."
                    : "Could not analyze this entry. Your thoughts are saved, and you can reflect on them yourself.",
                  insights: isQuotaError
                    ? ["Analysis will resume when quota resets", "Your journal entries are always saved regardless of analysis"]
                    : [],
                  tags: isQuotaError ? ["Quota Limit"] : ["Error"],
                  microAction: isQuotaError
                    ? "Consider turning off automatic analysis in settings to save quota for summaries."
                    : "Take a deep breath. Technology has its moments."
              }
          }
          setJournalEntries(prev => prev.map(entry => entry.id === entryWithError.id ? entryWithError : entry));
        } finally {
          setIsLoading(false);
          // Update daily completion tracking after entry is saved
          updateDailyCompletion();
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
        updateDailyCompletion();
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
      const newAnalysis = await analyzeJournalEntry(newText, true); // Force refresh for re-analysis
      setJournalEntries(prev => prev.map(entry =>
        entry.id === entryId
          ? { ...entry, rawText: newText, analysis: newAnalysis, date: new Date().toISOString() }
          : entry
      ));
    } catch (error) {
      console.error("Error re-analyzing entry:", error);

      // Check if it's a quota error and provide helpful feedback
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isQuotaError = errorMessage.toLowerCase().includes('quota') ||
                           errorMessage.toLowerCase().includes('429');

      // Update entry with error information
      setJournalEntries(prev => prev.map(entry =>
        entry.id === entryId
          ? {
              ...entry,
              rawText: newText,
              analysis: {
                summary: isQuotaError
                  ? "Re-analysis quota reached. Your updated entry is saved. Try again later or disable auto-analysis in settings."
                  : "Could not re-analyze this entry. Your updated text is saved.",
                insights: isQuotaError
                  ? ["Analysis will resume when quota resets"]
                  : [],
                tags: isQuotaError ? ["Quota Limit"] : ["Error"],
                microAction: isQuotaError
                  ? "Consider turning off automatic analysis in settings."
                  : "Your thoughts are preserved."
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
    // Update daily completion tracking after evening check-in is saved
    updateDailyCompletion();
  };

  // Mood journal handlers
  const handleSaveMoodEntry = async (entryData: {
    emotion: string;
    intensity: 'low' | 'medium' | 'high';
    context: string;
    prompt: string;
    journalText: string;
    isCustomEmotion: boolean;
    customEmotionEmoji?: string;
  }) => {
    try {
      setIsSavingMoodEntry(true);

      const newEntry: MoodJournalEntry = {
        id: `mood-${Date.now()}`,
        date: getLocalDateString(),
        timestamp: new Date().toISOString(),
        emotion: entryData.emotion,
        intensity: entryData.intensity,
        context: entryData.context as any,
        prompt: entryData.prompt,
        journalText: entryData.journalText,
        isCustomEmotion: entryData.isCustomEmotion,
        customEmotionEmoji: entryData.customEmotionEmoji,
      };

      // Save to storage
      await storageService.saveMoodEntry(newEntry);

      // Update state
      setMoodEntries(prev => [newEntry, ...prev]);

      // Update streak
      updateMoodStreak(newEntry.date);

      // Close modal
      setShowMoodInputModal(false);
    } catch (error) {
      console.error('Error saving mood entry:', error);
      alert('Failed to save mood entry. Please try again.');
    } finally {
      setIsSavingMoodEntry(false);
    }
  };

  const handleDeleteMoodEntry = async (entryId: string) => {
    try {
      await storageService.deleteMoodEntry(entryId);
      setMoodEntries(prev => prev.filter(entry => entry.id !== entryId));

      // Recalculate streak after deletion
      const updatedEntries = moodEntries.filter(entry => entry.id !== entryId);
      if (updatedEntries.length > 0) {
        const mostRecentDate = updatedEntries[0].date;
        updateMoodStreak(mostRecentDate);
      } else {
        // No entries left, reset streak
        setUserProfile(prev => prev ? { ...prev, moodStreak: 0, lastMoodEntryDate: '' } : null);
      }
    } catch (error) {
      console.error('Error deleting mood entry:', error);
      alert('Failed to delete mood entry. Please try again.');
    }
  };

  const handleEditMoodEntry = (entry: MoodJournalEntry) => {
    setEditingMoodEntry(entry);
    setShowMoodInputModal(true);
  };

  const handleUpdateMoodEntry = async (entryData: {
    emotion: string;
    intensity: 'low' | 'medium' | 'high';
    context: string;
    prompt: string;
    journalText: string;
    isCustomEmotion: boolean;
    customEmotionEmoji?: string;
  }) => {
    if (!editingMoodEntry) return;

    try {
      setIsSavingMoodEntry(true);

      const updatedEntry: MoodJournalEntry = {
        ...editingMoodEntry,
        emotion: entryData.emotion,
        intensity: entryData.intensity,
        context: entryData.context as any,
        prompt: entryData.prompt,
        journalText: entryData.journalText,
        isCustomEmotion: entryData.isCustomEmotion,
        customEmotionEmoji: entryData.customEmotionEmoji,
        timestamp: new Date().toISOString(), // Update timestamp
      };

      // Update in storage
      await storageService.saveMoodEntry(updatedEntry);

      // Update state
      setMoodEntries(prev => prev.map(entry =>
        entry.id === editingMoodEntry.id ? updatedEntry : entry
      ));

      // Close modal and reset editing state
      setShowMoodInputModal(false);
      setEditingMoodEntry(null);
    } catch (error) {
      console.error('Error updating mood entry:', error);
      alert('Failed to update mood entry. Please try again.');
    } finally {
      setIsSavingMoodEntry(false);
    }
  };

  const handleAddCustomEmotion = (name: string, emoji: string) => {
    const newEmotion: CustomEmotion = {
      id: `custom-${Date.now()}`,
      name,
      emoji,
    };
    setSettings(prev => ({
      ...prev,
      customEmotions: [...(prev.customEmotions || []), newEmotion],
    }));
  };

  const updateMoodStreak = (entryDate: string) => {
    if (!userProfile) return;

    const today = getLocalDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    // Sort entries by date (most recent first)
    const sortedEntries = [...moodEntries].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Calculate streak
    let streak = 0;
    let checkDate = new Date();

    // Include the new entry in the calculation
    const allDates = [entryDate, ...sortedEntries.map(e => e.date)];
    const uniqueDates = [...new Set(allDates)].sort((a, b) =>
      new Date(b).getTime() - new Date(a).getTime()
    );

    for (const date of uniqueDates) {
      const checkDateStr = getLocalDateString(checkDate);
      if (date === checkDateStr) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    setUserProfile(prev => prev ? {
      ...prev,
      moodStreak: streak,
      lastMoodEntryDate: entryDate,
    } : null);
  };

  const handleGenerateWeeklySummary = async (weekToSummarize: number, newWeek: number, isRegeneration: boolean = false) => {
    if (!userProfile || !userProfile.idealSelfManifesto) return;

    if (!settings.weeklyReports) {
        setUserProfile(prev => ({ ...prev!, week_count: newWeek }));
        return;
    }

    // Check if report already exists (prevent duplicates)
    const existingReport = journalEntries.find(entry => entry.week === weekToSummarize && entry.type === 'weekly_summary_report');
    if (existingReport && !isRegeneration) {
        console.log(`✓ Weekly report for Week ${weekToSummarize} already exists, skipping generation`);
        setUserProfile(prev => ({ ...prev!, week_count: newWeek }));
        return;
    }

    // Check if there's data for this week
    const weekEntries = journalEntries.filter(entry => entry.week === weekToSummarize && (entry.type === 'daily' || entry.type === 'hunch'));
    if (weekEntries.length === 0) {
        console.log(`ℹ️ No entries found for Week ${weekToSummarize}, skipping report generation`);
        // Mark week as processed but don't generate empty report
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

        if (!isRegeneration) {
            // Only send one notification for auto-generated reports
            if ('Notification' in window && Notification.permission === 'granted') {
                try {
                    new Notification(`Week ${weekToSummarize} Report Ready`, {
                        body: 'Your weekly reflection is now available.',
                        icon: '/favicon.ico',
                        tag: `week-${weekToSummarize}` // Prevents duplicate notifications
                    });
                } catch (e) {
                    console.log('Could not send notification');
                }
            }
            setUserProfile(prev => ({ ...prev!, week_count: newWeek }));
        } else {
            alert(`✅ Week ${weekToSummarize} report regenerated! Check the Reports section.`);
        }

    } catch (error) {
        console.error("Error generating weekly summary:", error);
        if (isRegeneration) {
            alert(`❌ Error generating report: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        // Remove placeholder on error to allow retry next load or avoid corrupt state
         setJournalEntries(prev => prev.filter(entry => entry.id !== summaryEntryId));
        if (!isRegeneration) {
            setUserProfile(prev => ({ ...prev!, week_count: newWeek }));
        }
    } finally {
        setIsLoading(false);
    }
};

  const handleGenerateMonthlySummary = async (monthToSummarize: number, newMonth: number, isRegeneration: boolean = false) => {
    if (!userProfile || !settings.monthlyReports) {
         if (userProfile) setUserProfile(prev => ({ ...prev!, month_count: newMonth }));
         return;
    }

    // Check if report already exists (prevent duplicates)
    const startDay = (monthToSummarize - 1) * 30;
    const endDay = monthToSummarize * 30;
    const existingReport = journalEntries.find(entry =>
        entry.type === 'monthly_summary_report' &&
        entry.day > startDay && entry.day <= endDay
    );
    if (existingReport && !isRegeneration) {
        console.log(`✓ Monthly report for Month ${monthToSummarize} already exists, skipping generation`);
        setUserProfile(prev => ({ ...prev!, month_count: newMonth }));
        return;
    }

    // Check if there's data for this month
    const monthEntries = journalEntries.filter(entry => entry.day > startDay && entry.day <= endDay && (entry.type === 'daily' || entry.type === 'hunch'));
    if (monthEntries.length === 0) {
        console.log(`ℹ️ No entries found for Month ${monthToSummarize}, skipping report generation`);
        // Mark month as processed but don't generate empty report
        setUserProfile(prev => ({ ...prev!, month_count: newMonth }));
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

        // Only send one notification for auto-generated reports
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification(`Month ${monthToSummarize} Report Ready`, {
                    body: 'Your monthly insight is now available.',
                    icon: '/favicon.ico',
                    tag: `month-${monthToSummarize}` // Prevents duplicate notifications
                });
            } catch (e) {
                console.log('Could not send notification');
            }
        }

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
            } else {
                 // Clear dailyPrompt when entry exists for today
                 setDailyPrompt(null);
            }
            setIsLoading(false);
        }
    };

    if (appState === 'journal' && userProfile && !userProfile.isPaused) {
        setupJournal();
    }
  }, [appState, userProfile?.startDate, userProfile?.week_count, userProfile?.month_count, userProfile?.isPaused, userProfile?.journeyCompleted]);

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
    // Show loading spinner only if we have no user profile data yet (initial load)
    // If we have a profile, show the welcome screen immediately even while loading other data
    if (isLoading && !userProfile) {
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
        return <WelcomeScreen
          onStart={() => setAppState('name_collection')}
          onSignIn={() => setShowAuthModal(true)}
        />;
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
          return <ReturnUserWelcomeScreen
            userProfile={userProfile}
            todaysEntry={todaysEntry}
            onContinue={() => setAppState('journal')}
            ritualCompleted={ritualCompleted}
            onSignIn={() => setShowAuthModal(true)}
            userEmail={user?.email}
          />;
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
                    <PausedScreen onResume={handleResumeJourney} onOpenMoodJournal={() => {
                      setActiveView('mood');
                    }} />
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
                        onSetupCloudBackup={() => setShowAuthModal(true)}
                        activeView={activeView}
                        onToggleView={(view) => {
                          setActiveView(view);
                          setIsMenuOpen(false);
                        }}
                        calendarView={calendarView}
                        onToggleCalendarView={setCalendarView}
                        onOpenMoodJournal={() => {
                          setActiveView('mood');
                          setIsMenuOpen(false);
                        }}
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
            <div style={{ padding: '0 1rem' }}>
              {!user && userProfile && (
                <CloudSyncBanner onSetup={() => setShowAuthModal(true)} />
              )}
            </div>
            {activeView === 'journey' ? (
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
            ) : (
              <MoodJournalView
                moodEntries={moodEntries}
                customEmotions={settings.customEmotions || []}
                settings={settings}
                onNewEntry={() => setShowMoodInputModal(true)}
                onDeleteEntry={handleDeleteMoodEntry}
                onEditEntry={handleEditMoodEntry}
                currentStreak={userProfile.moodStreak || 0}
              />
            )}
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
                onSetupCloudBackup={() => setShowAuthModal(true)}
                userEmail={user?.email}
                onSignOut={async () => {
                  const { signOut } = await import('./src/hooks/useAuth');
                  // Get auth instance
                  const { auth } = await import('./src/config/firebase');
                  const { signOut: firebaseSignOut } = await import('firebase/auth');
                  await firebaseSignOut(auth);
                  window.location.reload();
                }}
                onOpenPrivacyPolicy={() => setShowPrivacyPolicy(true)}
                onOpenTerms={() => setShowTerms(true)}
                onOpenContact={() => setShowContact(true)}
                activeView={activeView}
                onToggleView={(view) => {
                  setActiveView(view);
                  setIsMenuOpen(false);
                }}
                calendarView={calendarView}
                onToggleCalendarView={setCalendarView}
                onOpenMoodJournal={() => {
                  setActiveView('mood');
                  setIsMenuOpen(false);
                }}
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
      {isCalendarOpen && calendarView === 'journey' && (
        <CalendarView
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          settings={settings}
          userProfile={userProfile}
        />
      )}
      {isCalendarOpen && calendarView === 'mood' && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsCalendarOpen(false)}
        >
          <div
            className="bg-gradient-to-br from-[var(--bg-from)] to-[var(--bg-to)] rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-[var(--card-border)]">
              <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Mood Calendar</h2>
              <button
                onClick={() => setIsCalendarOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close calendar"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <MoodCalendarView
                moodEntries={moodEntries}
                customEmotions={settings.customEmotions || []}
                currentStreak={userProfile?.moodStreak || 0}
                streakEnabled={settings.moodStreakEnabled !== false}
              />
            </div>
          </div>
        </div>
      )}
      <AdminDashboard
        isOpen={showAdminDashboard}
        onClose={() => setShowAdminDashboard(false)}
        settings={settings}
      />
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={async () => {
          setShowAuthModal(false);
          // Don't reload immediately - let migration happen first
          // The migration useEffect will run automatically when user state changes
          // After migration completes, data will load from Firestore
          console.log('✅ Authentication successful - migration will run automatically');
        }}
      />
      {showMoodInputModal && (
        <MoodInputModal
          onSave={editingMoodEntry ? handleUpdateMoodEntry : handleSaveMoodEntry}
          onClose={() => {
            setShowMoodInputModal(false);
            setEditingMoodEntry(null);
          }}
          isSaving={isSavingMoodEntry}
          customEmotions={settings.customEmotions || []}
          onAddCustomEmotion={handleAddCustomEmotion}
          previousPrompts={moodEntries.slice(0, 10).map(e => e.prompt)}
          editEntry={editingMoodEntry ? {
            emotion: editingMoodEntry.emotion,
            intensity: editingMoodEntry.intensity,
            context: editingMoodEntry.context,
            prompt: editingMoodEntry.prompt,
            journalText: editingMoodEntry.journalText,
            isCustomEmotion: editingMoodEntry.isCustomEmotion,
            customEmotionEmoji: editingMoodEntry.customEmotionEmoji,
          } : undefined}
        />
      )}
      <PrivacyPolicy
        isOpen={showPrivacyPolicy}
        onClose={() => setShowPrivacyPolicy(false)}
      />
      <TermsOfService
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
      />
      <ContactUs
        isOpen={showContact}
        onClose={() => setShowContact(false)}
      />
      {renderContent()}
    </>
  );
};

export default App;
