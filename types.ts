export type Stage = 'healing' | 'reconstruction' | 'expansion';

export interface UserProfile {
  stage: Stage;
  startDate: string;
  idealSelfManifesto?: string;
  week_count: number;
  lastMilestoneDayCompleted: number;
  journeyCompleted?: boolean;
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

export interface JournalEntry {
  id: string;
  date: string;
  day: number;
  week: number;
  prompt: string;
  rawText: string;
  analysis?: EntryAnalysis;
}
