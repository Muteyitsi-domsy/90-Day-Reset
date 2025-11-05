export type Stage = 'healing' | 'reconstruction' | 'expansion';

export type InsightFrequency = 'daily' | 'weekly' | 'none';

export interface UserProfile {
  stage: Stage;
  startDate: string;
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
  theme: 'light' | 'dark' | 'system';
  pin?: string;
  insightFrequency: InsightFrequency;
  includeHunchesInFinalSummary: boolean;
}

export interface OnboardingAnalysis {
    phase: Stage;
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

export interface JournalEntry {
  id: string;
  date: string;
  day: number;
  week: number;
  type: 'daily' | 'weekly_summary' | 'hunch';
  prompt: string;
  rawText: string;
  analysis?: EntryAnalysis;
  eveningCheckin?: EveningCheckin;
}