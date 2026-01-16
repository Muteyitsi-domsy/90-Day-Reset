import { UserProfile, Settings, JournalEntry, MoodJournalEntry } from '../types';
import { LocalStorageService } from './localStorageService';
import { FirestoreService } from './firestoreService';

/**
 * Storage service interface that abstracts data persistence
 * Implementations can use localStorage, Firestore, or other storage mechanisms
 */
export interface StorageService {
  // User Profile operations
  saveUserProfile(profile: UserProfile): Promise<void>;
  getUserProfile(): Promise<UserProfile | null>;

  // Settings operations
  saveSettings(settings: Settings): Promise<void>;
  getSettings(): Promise<Settings | null>;

  // Journal Entry operations
  saveJournalEntry(entry: JournalEntry): Promise<void>;
  updateJournalEntry(entry: JournalEntry): Promise<void>;
  deleteJournalEntry(entryId: string): Promise<void>;
  getJournalEntries(): Promise<JournalEntry[]>;

  // Mood Journal Entry operations
  saveMoodEntry(entry: MoodJournalEntry): Promise<void>;
  updateMoodEntry(entry: MoodJournalEntry): Promise<void>;
  deleteMoodEntry(entryId: string): Promise<void>;
  getMoodEntries(): Promise<MoodJournalEntry[]>;

  // Bulk operations
  getAllData(): Promise<{
    profile: UserProfile | null;
    settings: Settings | null;
    entries: JournalEntry[];
    moodEntries: MoodJournalEntry[];
  }>;

  // Utility
  clearAll(): Promise<void>;

  // Optional: Set user ID for encryption (only applicable to LocalStorageService)
  setUserId?(userId: string | undefined): void;
}

/**
 * Factory function that returns the appropriate storage service
 * based on user authentication status
 *
 * @param userId - Firebase user ID (if authenticated)
 * @returns LocalStorageService if no userId, otherwise FirestoreService
 */
export function getStorageService(userId?: string): StorageService {
  if (userId) {
    return new FirestoreService(userId);
  }

  // Create localStorage service and set user ID for encryption
  const localService = new LocalStorageService();
  localService.setUserId(userId);
  return localService;
}
