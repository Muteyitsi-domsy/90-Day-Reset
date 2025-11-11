
export type Arc = 'healing' | 'unstuck' | 'healed';

export type InsightFrequency = 'daily' | 'weekly' | 'none';

export interface UserProfile {
  name: string;
  arc: Arc;
  startDate: string;
  intentions?: string;
  idealSelfManifesto?: string;
  week_count: number;
  lastMilestoneDayCompleted: number;
  journeyCompleted?: boolean;
  streak: number;
  lastEntryDate: string;
  isPaused?: boolean;
  pausedDate?: string;
}

export interface Settings {
  theme: 'default' | 'ocean' | 'sunset' | 'forest';
  themeMode: 'light' | 'dark' | 'system';
  pin?: string;
  insightFrequency: InsightFrequency;
  includeHunchesInFinalSummary: boolean;
}

export interface OnboardingAnalysis {
    phase: Arc; // Changed from Stage to Arc
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

export interface WeeklySummaryData {
    weekNumber: number;
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
  type: 'daily' | 'weekly_summary' | 'hunch' | 'weekly_summary_report';
  prompt: string;
  rawText: string; // For daily/hunch/legacy summary: the text. For weekly_summary_report: a JSON string of WeeklySummaryData.
  analysis?: EntryAnalysis;
  eveningCheckin?: EveningCheckin;
  summaryData?: WeeklySummaryData;
}