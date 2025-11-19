
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
    stage: string;
    themes: string[];
    challenges: string[];
    growth: { observation: string; evidence: string }[];
    metrics: {
        entries: number;
        streak: number;
        completionRate: string;
    };
    notableExcerpts: string[];
    actionPlan: string[];
    encouragement: string;
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
