
export type Arc = 'release' | 'reaffirm' | 'reignition';

export type HunchType = 'insight' | 'dream' | 'hunch';

// Mood Journaling Types
export type MoodIntensity = 'low' | 'medium' | 'high';

export type MoodContext =
  | 'career'
  | 'family'
  | 'romantic'
  | 'friendships'
  | 'physical_health'
  | 'mental_health'
  | 'spirituality';

export type DefaultEmotion =
  | 'joyful'
  | 'calm'
  | 'energized'
  | 'anxious'
  | 'sad'
  | 'angry'
  | 'overwhelmed'
  | 'grateful';

export interface CustomEmotion {
  id: string; // Unique identifier
  name: string; // e.g., "Nostalgic"
  emoji: string; // e.g., "🥺"
}

export interface MoodJournalEntry {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  timestamp: string; // Full ISO timestamp for precise ordering

  // Mood data
  emotion: DefaultEmotion | string; // Can be default or custom emotion name
  intensity: MoodIntensity;
  context: MoodContext;

  // Journal content
  prompt: string;
  journalText: string;

  // Metadata
  isCustomEmotion: boolean; // True if using custom emotion
  customEmotionEmoji?: string; // Emoji if custom emotion
}

export interface UserProfile {
  name: string;
  email?: string; // Added for PIN recovery simulation
  arc: Arc;
  startDate: string;
  intentions?: string;
  idealSelfManifesto?: string;
  week_count: number;
  month_count: number; // Added for monthly summary tracking
  lastMilestoneDayCompleted: number;
  journeyCompleted?: boolean;
  streak: number;
  lastEntryDate: string;
  isPaused?: boolean;
  pausedDate?: string;
  lastViewedReportDate?: string; // To track the "red dot" notification

  // Mood journaling tracking
  moodStreak?: number; // Separate streak for mood journaling
  lastMoodEntryDate?: string; // Last date user made a mood journal entry

  // Multi-Factor Authentication (MFA)
  mfaEnabled?: boolean; // Whether MFA is enabled for this user
  mfaSecret?: string; // Base32 encoded TOTP secret (encrypted in storage)
  mfaBackupCodes?: string[]; // Hashed backup recovery codes
  mfaSetupDate?: string; // ISO date when MFA was enabled
}

export interface DailyCompletion {
  date: string; // ISO date string (YYYY-MM-DD)
  ritualCompleted: boolean;
  morningEntryCompleted: boolean;
  eveningCheckinCompleted: boolean;
}

export interface Settings {
  theme: 'default' | 'ocean' | 'sunset' | 'forest';
  themeMode: 'light' | 'dark' | 'system';
  pin?: string;

  // Granular report settings
  dailyAnalysis: boolean;
  weeklyReports: boolean;
  monthlyReports: boolean;

  includeHunchesInFinalSummary: boolean;
  finalSummaryIncludedTypes?: HunchType[]; // Specific types to include

  // Daily ritual settings
  ritualName?: string;
  ritualDuration?: number; // in minutes
  ritualCompletedToday?: boolean;
  lastRitualDate?: string; // ISO date to reset completion daily

  // Daily completion tracking (for completion circle feature)
  dailyCompletions?: DailyCompletion[];

  // Share feature (disabled until launch)
  shareEnabled?: boolean; // Default: false

  // Mood journaling settings
  moodStreakEnabled?: boolean; // Default: true - toggle for mood journal streak tracking
  customEmotions?: CustomEmotion[]; // User's custom emotions
}

export interface OnboardingAnalysis {
    phase: Arc;
    summary: string;
    encouragement: string;
}

export interface EntryAnalysis {
  summary: string;
  insights: string[];
  tags: string[];
  microAction: string;
}

export interface EveningCheckin {
  completedMicroAction: 'yes' | 'no' | 'partially';
  alignmentReflection: string;
  improvementReflection: string;
}

export interface SummaryData {
    title: string;
    period: number; // Week number or Month number
    dateRange: string;

    // THE LANDSCAPE - What appeared
    dominantThemes: string[];
    emotionalTerrain: string;

    // THE PATTERNS - What repeated or shifted
    recurringThreads: string[];
    shifts: string[];

    // THE EVIDENCE - User's own words
    mirrors: {
        pattern: string;
        excerpt: string;
        day: number;
    }[];

    // THE TENSIONS - Neutral observation of friction
    tensions: string[];

    // THE CLOSING - Poetic reflection
    synthesis: string;

    // METADATA
    metrics: {
        entries: number;
        streak: number;
        completionRate: string;
    };

    crisisDetected?: boolean;
}

export interface JournalEntry {
  id: string;
  date: string;
  day: number;
  week: number;
  type: 'daily' | 'weekly_summary_report' | 'monthly_summary_report' | 'hunch';
  hunchType?: HunchType; // Added to distinguish types
  prompt: string;
  rawText: string; 
  analysis?: EntryAnalysis;
  eveningCheckin?: EveningCheckin;
  summaryData?: SummaryData;
}
