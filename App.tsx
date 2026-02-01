
import React, { useState, useEffect, useMemo } from 'react';
import { getDayAndMonth, generateFinalSummary, analyzeJournalEntry, generateWeeklySummary, generateMonthlySummary } from './services/geminiService';
import { getDailyPrompt } from './services/promptGenerator';
import { JournalEntry, UserProfile, EntryAnalysis, Settings, EveningCheckin, SummaryData, HunchType, MoodJournalEntry, CustomEmotion, FlipJournalEntry } from './types';
import Header from './components/Header';
import Onboarding from './components/Onboarding';
import IdealSelfScripting from './components/IdealSelfScripting';
import { safeRequestNotificationPermission, scheduleDailyReminder, scheduleEveningReminder } from './utils/notifications';
import CelebrationScreen from './components/CelebrationScreen';
import KeepsakeWindow from './components/KeepsakeWindow';
import NewJourneyChoiceModal from './components/NewJourneyChoiceModal';
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
import FlipInputModal from './components/FlipInputModal';
import FlipJournalView from './components/FlipJournalView';
import FlipPromptModal from './components/FlipPromptModal';
import SuspendedAccountScreen from './components/SuspendedAccountScreen';
import MonthlySummaryModal from './components/MonthlySummaryModal';
import AnnualRecapModal from './components/AnnualRecapModal';
import { getLocalDateString as getFlipLocalDateString } from './utils/flipPrompts';
import { shouldShowMonthlySummary, shouldShowAnnualRecap, calculateMonthlySummary, calculateAnnualRecap } from './utils/moodSummaryCalculations';
import type { MoodSummaryState, MonthlySummaryData, AnnualRecapData } from './types';


type AppState = 'welcome' | 'name_collection' | 'returning_welcome' | 'onboarding' | 'intention_setting' | 'scripting' | 'onboarding_completion' | 'journal';

// Helper function to get local date string in YYYY-MM-DD format (not UTC)
const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to calculate days remaining in keepsake window (5 days)
const KEEPSAKE_WINDOW_DAYS = 5;
const getKeepsakeWindowDaysRemaining = (journeyCompletedDate: string | undefined): number => {
  if (!journeyCompletedDate) return KEEPSAKE_WINDOW_DAYS;

  const completedDate = new Date(journeyCompletedDate);
  const today = new Date();

  // Reset times to compare just dates
  completedDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const daysSinceCompletion = Math.floor((today.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = KEEPSAKE_WINDOW_DAYS - daysSinceCompletion;

  return Math.max(0, daysRemaining);
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
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [hasMigrated, setHasMigrated] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showContact, setShowContact] = useState(false);

  // Mood journaling state
  const [moodEntries, setMoodEntries] = useState<MoodJournalEntry[]>([]);
  const [showMoodInputModal, setShowMoodInputModal] = useState(false);
  const [editingMoodEntry, setEditingMoodEntry] = useState<MoodJournalEntry | null>(null);
  const [isSavingMoodEntry, setIsSavingMoodEntry] = useState(false);
  const [activeView, setActiveView] = useState<'journey' | 'mood' | 'flip'>('journey'); // Toggle between 90-day journey, mood journal, and flip journal
  const [calendarView, setCalendarView] = useState<'journey' | 'mood'>('journey'); // Calendar toggle

  // Flip journaling state
  const [flipEntries, setFlipEntries] = useState<FlipJournalEntry[]>([]);
  const [showFlipInputModal, setShowFlipInputModal] = useState(false);
  const [isSavingFlipEntry, setIsSavingFlipEntry] = useState(false);
  const [pendingFlipMoodEntry, setPendingFlipMoodEntry] = useState<MoodJournalEntry | null>(null);
  const [showFlipPrompt, setShowFlipPrompt] = useState(false);
  const [flipsExhausted, setFlipsExhausted] = useState(false);

  // Mood summary state
  const [showMonthlySummaryModal, setShowMonthlySummaryModal] = useState(false);
  const [showAnnualRecapModal, setShowAnnualRecapModal] = useState(false);
  const [monthlySummaryData, setMonthlySummaryData] = useState<MonthlySummaryData | null>(null);
  const [annualRecapData, setAnnualRecapData] = useState<AnnualRecapData | null>(null);

  // New journey state (for post-completion flow)
  const [showNewJourneyModal, setShowNewJourneyModal] = useState(false);
  const [newJourneyOptions, setNewJourneyOptions] = useState<{ keepManifesto: boolean; keepIntentions: boolean } | null>(null);

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

          // Load flip entries (gracefully handle if collection doesn't exist yet)
          try {
            const savedFlipEntries = await storageService.getFlipEntries();
            setFlipEntries(savedFlipEntries);
          } catch (flipError) {
            console.warn('Could not load flip entries (may need Firestore rules update):', flipError);
            setFlipEntries([]);
          }

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
      // Mark entry as crisis-flagged so UI can handle it appropriately
      const crisisEntry: JournalEntry = { ...newEntry, crisisFlagged: true };
      setJournalEntries(prev => prev.map(entry => entry.id === crisisEntry.id ? crisisEntry : entry));
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
        entry.id === entryId ? { ...entry, rawText: newText, analysis: undefined, crisisFlagged: true } : entry
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

      // Check if user can flip this entry (daily limit is 3)
      const today = getFlipLocalDateString();
      const todayFlipCount = flipEntries.filter(e => e.date === today).length;

      // Always show prompt after mood entry - either to flip or to inform about exhausted flips
      setPendingFlipMoodEntry(newEntry);
      setShowFlipPrompt(true);
      setFlipsExhausted(todayFlipCount >= 3);
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

  // Crisis detection handler with high severity tracking
  const handleCrisisDetected = (severity: CrisisSeverity, source: 'mood' | 'flip' | 'daily' = 'daily') => {
    setCrisisSeverity(severity);

    // Track high severity (3) occurrences for potential account suspension
    if (severity === 3 && userProfile) {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get existing occurrences and filter to last 7 days
      const existingOccurrences = userProfile.crisisOccurrences || [];
      const recentOccurrences = existingOccurrences.filter(
        (o) => new Date(o.date) >= oneWeekAgo
      );

      // Add new occurrence
      const newOccurrence = { date: now.toISOString(), severity };
      const updatedOccurrences = [...recentOccurrences, newOccurrence];

      // Count high severity (3) in the last week
      const highSeverityCount = updatedOccurrences.filter((o) => o.severity === 3).length;

      // If more than 3 high severity in a week, suspend account
      if (highSeverityCount > 3) {
        setUserProfile((prev) =>
          prev
            ? {
                ...prev,
                crisisOccurrences: updatedOccurrences,
                accountSuspended: true,
                suspendedDate: now.toISOString(),
              }
            : null
        );
      } else {
        // Just update occurrences
        setUserProfile((prev) =>
          prev
            ? {
                ...prev,
                crisisOccurrences: updatedOccurrences,
              }
            : null
        );
      }
    }
  };

  // Helper to get today's flip count
  const getTodayFlipCount = (): number => {
    const today = getFlipLocalDateString();
    return flipEntries.filter(entry => entry.date === today).length;
  };

  // Flip journal handlers
  const handleSaveFlipEntry = async (entryData: {
    challenge: string;
    reframingQuestion: string;
    reframedPerspective: string;
    linkedMoodEntryId?: string;
  }) => {
    try {
      setIsSavingFlipEntry(true);

      const newEntry: FlipJournalEntry = {
        id: `flip-${Date.now()}`,
        date: getFlipLocalDateString(),
        timestamp: new Date().toISOString(),
        challenge: entryData.challenge,
        reframingQuestion: entryData.reframingQuestion,
        reframedPerspective: entryData.reframedPerspective,
        ...(entryData.linkedMoodEntryId && { linkedMoodEntryId: entryData.linkedMoodEntryId }),
      };

      // Save to storage
      await storageService.saveFlipEntry(newEntry);

      // Update state (add to beginning for newest-first)
      setFlipEntries(prev => [newEntry, ...prev]);

      // Close modal and clear pending flip mood entry
      setShowFlipInputModal(false);
      setPendingFlipMoodEntry(null);
    } catch (error) {
      console.error('Error saving flip entry:', error);
      alert('Failed to save flip entry. Please try again.');
    } finally {
      setIsSavingFlipEntry(false);
    }
  };

  const handleDeleteFlipEntry = async (entryId: string) => {
    try {
      await storageService.deleteFlipEntry(entryId);
      setFlipEntries(prev => prev.filter(entry => entry.id !== entryId));
    } catch (error) {
      console.error('Error deleting flip entry:', error);
      alert('Failed to delete flip entry. Please try again.');
    }
  };

  // Flip prompt handlers (after mood entry save)
  const handleAcceptFlipPrompt = () => {
    setShowFlipPrompt(false);
    setFlipsExhausted(false);
    // Open flip modal with the mood entry's journal text as initial challenge
    setShowFlipInputModal(true);
  };

  const handleDeclineFlipPrompt = () => {
    setShowFlipPrompt(false);
    setFlipsExhausted(false);
    // Keep pendingFlipMoodEntry so user can flip later from MoodJournalView
    // It will be cleared when a flip is actually saved or when a new mood entry is created
  };

  // Handler to flip today's mood entry from MoodJournalView
  const handleFlipTodaysMoodEntry = (moodEntry: MoodJournalEntry) => {
    // Check daily flip limit
    const today = getFlipLocalDateString();
    const todayFlipCount = flipEntries.filter(e => e.date === today).length;
    if (todayFlipCount >= 3) {
      alert('You have reached your daily flip limit (3). Try again tomorrow!');
      return;
    }
    setPendingFlipMoodEntry(moodEntry);
    setShowFlipInputModal(true);
  };

  // Check for mood summaries after mood entries are loaded
  useEffect(() => {
    if (!userProfile || moodEntries.length === 0 || isLoading) return;

    const customEmotions = settings.customEmotions || [];

    // Check monthly summary
    const monthlyCheck = shouldShowMonthlySummary(userProfile.moodSummaryState, moodEntries);
    if (monthlyCheck.shouldShow) {
      const summaryData = calculateMonthlySummary(moodEntries, monthlyCheck.month, monthlyCheck.year, customEmotions);
      if (summaryData) {
        setMonthlySummaryData(summaryData);
        setShowMonthlySummaryModal(true);
        return; // Show monthly first, then annual on next check
      }
    }

    // Check annual recap
    // Check annual recap (only auto-show if not previously shown)
    const annualCheck = shouldShowAnnualRecap(userProfile.moodSummaryState, moodEntries);
    if (annualCheck.shouldShow) {
      const recapData = calculateAnnualRecap(moodEntries, annualCheck.year, customEmotions);
      if (recapData) {
        setAnnualRecapData(recapData);
        setShowAnnualRecapModal(true);
      }
    }
  }, [moodEntries, userProfile?.moodSummaryState, isLoading, settings.customEmotions]);

  // Handle monthly summary modal close
  const handleMonthlySummaryClose = (downloaded: boolean) => {
    setShowMonthlySummaryModal(false);

    if (!userProfile || !monthlySummaryData) return;

    const monthKey = `${monthlySummaryData.year}-${String(monthlySummaryData.month).padStart(2, '0')}`;
    const updatedSummaryState: MoodSummaryState = {
      ...userProfile.moodSummaryState,
      lastMonthlySummaryShown: monthKey,
      monthlySummaryDownloaded: downloaded,
      lastAnnualSummaryShown: userProfile.moodSummaryState?.lastAnnualSummaryShown || null,
      annualSummaryDownloaded: userProfile.moodSummaryState?.annualSummaryDownloaded || false,
    };

    setUserProfile(prev => prev ? { ...prev, moodSummaryState: updatedSummaryState } : null);
    setMonthlySummaryData(null);
  };

  // Handle annual recap modal close
  const handleAnnualRecapClose = (downloaded: boolean) => {
    setShowAnnualRecapModal(false);

    if (!userProfile || !annualRecapData) return;

    const updatedSummaryState: MoodSummaryState = {
      ...userProfile.moodSummaryState,
      lastMonthlySummaryShown: userProfile.moodSummaryState?.lastMonthlySummaryShown || null,
      monthlySummaryDownloaded: userProfile.moodSummaryState?.monthlySummaryDownloaded || false,
      lastAnnualSummaryShown: annualRecapData.year,
      annualSummaryDownloaded: downloaded || userProfile.moodSummaryState?.annualSummaryDownloaded || false,
    };

    setUserProfile(prev => prev ? { ...prev, moodSummaryState: updatedSummaryState } : null);
    setAnnualRecapData(null);
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
        // Set both journeyCompleted and journeyCompletedDate (only if not already set)
        const completedDate = userProfile.journeyCompletedDate || new Date().toISOString();
        setUserProfile(prev => ({ ...prev!, journeyCompleted: true, journeyCompletedDate: completedDate }));
        setIsJourneyOver(true);
    } catch (error) {
        console.error("Error generating final summary:", error);
        const fallbackSummary = "**Your 90-Day Evolution**\n\nThe journey may be over, but the growth continues. Thank you for showing up for yourself.";
        setFinalSummaryText(fallbackSummary);
        // Set both journeyCompleted and journeyCompletedDate (only if not already set)
        const completedDate = userProfile.journeyCompletedDate || new Date().toISOString();
        setUserProfile(prev => ({ ...prev!, journeyCompleted: true, journeyCompletedDate: completedDate }));
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
    // Check if this is a new journey with preserved data
    if (newJourneyOptions && userProfile) {
      // Update arc from onboarding, preserve other data as configured
      const updatedProfile = {
        ...userProfile,
        arc: profile.arc,
        startDate: new Date().toISOString(),
        week_count: 1,
        month_count: 1,
        lastMilestoneDayCompleted: 0,
        journeyCompleted: false,
        journeyCompletedDate: undefined,
        streak: 0,
        lastEntryDate: '',
      };
      setUserProfile(updatedProfile);

      // Determine next step based on what's being kept
      if (newJourneyOptions.keepIntentions && newJourneyOptions.keepManifesto) {
        // Both kept - skip to completion
        setAppState('onboarding_completion');
      } else if (newJourneyOptions.keepIntentions) {
        // Only intentions kept - need new manifesto
        setAppState('scripting');
      } else if (newJourneyOptions.keepManifesto) {
        // Only manifesto kept - need new intentions
        setAppState('intention_setting');
      } else {
        // Neither kept - full flow
        setAppState('intention_setting');
      }
    } else {
      // First-time user flow
      setUserProfile({ ...profile, name: userName, intentions: '', month_count: 1 });
      setAppState('intention_setting');
    }
  }

  const handleIntentionSettingComplete = (intentions: string) => {
    if (userProfile) {
      setUserProfile(prev => ({...prev!, intentions}));
      // Check if we should skip scripting (manifesto already exists)
      if (newJourneyOptions?.keepManifesto && userProfile.idealSelfManifesto) {
        setAppState('onboarding_completion');
      } else {
        setAppState('scripting');
      }
    }
  }

  const handleScriptingComplete = async (manifesto: string) => {
    if (userProfile) {
        setUserProfile(prev => ({...prev!, idealSelfManifesto: manifesto}));
        setAppState('onboarding_completion');
        // Clear new journey options after completing the flow
        setNewJourneyOptions(null);
    }
  }

  const handleOnboardingCompletion = async (newSettings: { dailyAnalysis: boolean; weeklyReports: boolean; monthlyReports: boolean }) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    setAppState('journal');
    // Clear new journey options after completing the flow
    setNewJourneyOptions(null);
    const permissionGranted = await safeRequestNotificationPermission();
    if (permissionGranted) {
        scheduleDailyReminder();
    }
  };

  // Opens the new journey choice modal
  const handleStartNewJourney = () => {
    setShowNewJourneyModal(true);
  };

  // Handles the user's choice from the new journey modal
  const handleNewJourneyConfirm = async (keepManifesto: boolean, keepIntentions: boolean) => {
    setShowNewJourneyModal(false);
    setIsLoading(true);

    try {
      // Clear only journey data (preserves mood and flip journals)
      await storageService.clearJourneyData();

      // Store the options for the onboarding flow
      setNewJourneyOptions({ keepManifesto, keepIntentions });

      // Reset journey-related state
      setJournalEntries([]);
      setIsJourneyOver(false);
      setFinalSummaryText('');
      setDailyPrompt(null);

      // Prepare the new profile
      if (userProfile) {
        const newProfile: UserProfile = {
          name: userProfile.name,
          arc: userProfile.arc, // Will be updated during onboarding
          startDate: new Date().toISOString(),
          intentions: keepIntentions ? userProfile.intentions : '',
          idealSelfManifesto: keepManifesto ? userProfile.idealSelfManifesto : '',
          week_count: 1,
          month_count: 1,
          lastMilestoneDayCompleted: 0,
          journeyCompleted: false,
          journeyCompletedDate: undefined,
          streak: 0,
          lastEntryDate: '',
          moodStreak: userProfile.moodStreak, // Preserve mood streak
          lastMoodEntryDate: userProfile.lastMoodEntryDate, // Preserve mood data
          moodSummaryState: userProfile.moodSummaryState, // Preserve mood summary state
        };

        // Save the new profile
        await storageService.saveUserProfile(newProfile);
        setUserProfile(newProfile);

        // Reset daily completions in settings
        const updatedSettings = {
          ...settings,
          dailyCompletions: [],
          ritualCompletedToday: false,
          lastRitualDate: undefined,
        };
        await storageService.saveSettings(updatedSettings);
        setSettings(updatedSettings);

        // Determine next step based on what user is keeping
        if (keepManifesto && keepIntentions) {
          // Skip to onboarding (arc selection only), then completion
          setAppState('onboarding');
        } else if (keepManifesto) {
          // Need new intentions, skip to intention setting
          setAppState('onboarding');
        } else if (keepIntentions) {
          // Need new manifesto, go through arc selection and scripting
          setAppState('onboarding');
        } else {
          // Full onboarding
          setAppState('onboarding');
        }
      }
    } catch (error) {
      console.error('Error starting new journey:', error);
      alert('There was an error starting your new journey. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Legacy restart (for backward compatibility, now uses new flow)
  const restartJourney = () => {
    handleStartNewJourney();
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
    // Show loading spinner while auth is initializing or data is loading
    // This prevents flashing the welcome screen before auth state is known
    if (authLoading || (isLoading && !userProfile)) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner />
            </div>
        );
    }

    // Check for suspended account due to repeated high severity crisis detections
    if (userProfile?.accountSuspended) {
        return (
            <SuspendedAccountScreen
                suspendedDate={userProfile.suspendedDate}
                userEmail={userProfile.email}
            />
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
      const daysRemaining = getKeepsakeWindowDaysRemaining(userProfile.journeyCompletedDate);

      return (
        <>
          <KeepsakeWindow
            completionSummary={finalSummaryText}
            userProfile={userProfile}
            journalEntries={journalEntries}
            settings={settings}
            daysRemaining={daysRemaining}
            onStartNewJourney={handleStartNewJourney}
            onExport={exportData}
          />
          <NewJourneyChoiceModal
            isOpen={showNewJourneyModal}
            onClose={() => setShowNewJourneyModal(false)}
            onConfirm={handleNewJourneyConfirm}
            hasManifesto={!!userProfile.idealSelfManifesto}
            hasIntentions={!!userProfile.intentions}
          />
        </>
      );
    }

    switch (appState) {
      case 'welcome':
        return <WelcomeScreen
          onStart={() => setAppState('name_collection')}
          onSignIn={() => { setAuthModalMode('signin'); setShowAuthModal(true); }}
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
          // Find today's mood entry for paused/no journey state
          const todaysMoodEntry = moodEntries.find(entry => entry.date === today) || null;
          return <ReturnUserWelcomeScreen
            userProfile={userProfile}
            todaysEntry={todaysEntry}
            onContinue={() => {
              // If paused, go to mood journal view; otherwise normal journal
              if (userProfile.isPaused) {
                setActiveView('mood');
              }
              setAppState('journal');
            }}
            ritualCompleted={ritualCompleted}
            onSignIn={() => { setAuthModalMode('signin'); setShowAuthModal(true); }}
            userEmail={user?.email}
            isJourneyPaused={userProfile.isPaused}
            todaysMoodEntry={todaysMoodEntry}
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
            ) : activeView === 'mood' ? (
              <MoodJournalView
                moodEntries={moodEntries}
                customEmotions={settings.customEmotions || []}
                settings={settings}
                onNewEntry={() => setShowMoodInputModal(true)}
                onDeleteEntry={handleDeleteMoodEntry}
                onEditEntry={handleEditMoodEntry}
                currentStreak={userProfile.moodStreak || 0}
                onFlipEntry={handleFlipTodaysMoodEntry}
                flipEntries={flipEntries}
                onViewMonthlySummary={(month, year) => {
                  const customEmotions = settings.customEmotions || [];
                  const summaryData = calculateMonthlySummary(moodEntries, month - 1, year, customEmotions);
                  if (summaryData) {
                    setMonthlySummaryData(summaryData);
                    setShowMonthlySummaryModal(true);
                  }
                }}
                onViewAnnualRecap={(year) => {
                  const customEmotions = settings.customEmotions || [];
                  const recapData = calculateAnnualRecap(moodEntries, year, customEmotions);
                  if (recapData) {
                    setAnnualRecapData(recapData);
                    setShowAnnualRecapModal(true);
                  }
                }}
              />
            ) : (
              <FlipJournalView
                flipEntries={flipEntries}
                onNewEntry={() => setShowFlipInputModal(true)}
                onDeleteEntry={handleDeleteFlipEntry}
                moodEntries={moodEntries}
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
        moodEntries={moodEntries}
        onTestMonthlySummary={(data) => {
          setMonthlySummaryData(data);
          setShowMonthlySummaryModal(true);
        }}
        onTestAnnualRecap={(data) => {
          setAnnualRecapData(data);
          setShowAnnualRecapModal(true);
        }}
      />
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authModalMode}
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
          onCrisisDetected={(severity) => handleCrisisDetected(severity, 'mood')}
        />
      )}
      {showFlipInputModal && (
        <FlipInputModal
          onSave={handleSaveFlipEntry}
          onClose={() => {
            setShowFlipInputModal(false);
            setPendingFlipMoodEntry(null);
          }}
          isSaving={isSavingFlipEntry}
          onCrisisDetected={(severity) => handleCrisisDetected(severity, 'flip')}
          initialChallenge={pendingFlipMoodEntry?.journalText}
          linkedMoodEntryId={pendingFlipMoodEntry?.id}
        />
      )}
      {showFlipPrompt && pendingFlipMoodEntry && (
        <FlipPromptModal
          onAccept={handleAcceptFlipPrompt}
          onDecline={handleDeclineFlipPrompt}
          remainingFlips={3 - flipEntries.filter(e => e.date === getFlipLocalDateString()).length}
          isExhausted={flipsExhausted}
        />
      )}
      {showMonthlySummaryModal && monthlySummaryData && (
        <MonthlySummaryModal
          data={monthlySummaryData}
          onClose={handleMonthlySummaryClose}
        />
      )}
      {showAnnualRecapModal && annualRecapData && (
        <AnnualRecapModal
          data={annualRecapData}
          onClose={handleAnnualRecapClose}
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
