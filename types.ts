
export type Arc = 'healing' | 'unstuck' | 'healed';

export type HunchType = 'insight' | 'dream' | 'hunch';

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
