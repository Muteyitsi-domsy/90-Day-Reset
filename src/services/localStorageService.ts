import { UserProfile, Settings, JournalEntry, MoodJournalEntry } from '../types';
import { StorageService } from './storageService';
import {
  encryptJSON,
  decryptJSON,
  safeRead,
  isEncrypted,
  migrateToEncrypted,
  clearEncryptionKeys,
} from '../utils/encryption';

/**
 * LocalStorage implementation of StorageService
 * Handles data persistence using browser's localStorage API
 *
 * SECURITY: Sensitive data (journal entries, user profile, mood entries) is encrypted
 * using AES-256 encryption. Settings are stored unencrypted as they're not sensitive.
 */
export class LocalStorageService implements StorageService {
  private readonly KEYS = {
    USER_PROFILE: 'userProfile',
    SETTINGS: 'settings',
    JOURNAL_ENTRIES: 'journalEntries',
    MOOD_ENTRIES: 'moodEntries',
  };

  // Current user ID for encryption key derivation
  private userId?: string;

  /**
   * Sets the current user ID for encryption
   * Should be called after authentication
   */
  setUserId(userId: string | undefined): void {
    this.userId = userId;
  }

  // User Profile operations
  async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      // Encrypt profile data before saving
      const encrypted = encryptJSON(profile, this.userId);
      localStorage.setItem(this.KEYS.USER_PROFILE, encrypted);
    } catch (error) {
      console.error('Error saving user profile to localStorage:', error);
      throw new Error('Failed to save user profile');
    }
  }

  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const savedProfile = localStorage.getItem(this.KEYS.USER_PROFILE);
      if (!savedProfile) return null;

      // Try to read data (handles both encrypted and unencrypted for migration)
      const decryptedData = safeRead(savedProfile, this.userId);
      if (!decryptedData) return null;

      const profile: UserProfile = JSON.parse(decryptedData);

      // If data wasn't encrypted, encrypt it now (migration)
      if (!isEncrypted(savedProfile)) {
        await this.saveUserProfile(profile);
      }

      // Migration from 'stage' to 'arc'
      if ((profile as any).stage) {
        const oldStage = (profile as any).stage;
        if (oldStage === 'reconstruction') profile.arc = 'reaffirm';
        else if (oldStage === 'expansion') profile.arc = 'reignition';
        else profile.arc = 'release';
        delete (profile as any).stage;
      }

      // Migration from old arc names to new ones
      if ((profile as any).arc === 'healing') profile.arc = 'release';
      if ((profile as any).arc === 'unstuck') profile.arc = 'reaffirm';
      if ((profile as any).arc === 'healed') profile.arc = 'reignition';

      // Initialize month_count if missing
      if (!profile.month_count) profile.month_count = 1;

      return profile;
    } catch (error) {
      console.error('Error loading user profile from localStorage:', error);
      return null;
    }
  }

  // Settings operations
  async saveSettings(settings: Settings): Promise<void> {
    try {
      localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
      throw new Error('Failed to save settings');
    }
  }

  async getSettings(): Promise<Settings | null> {
    try {
      const savedSettings = localStorage.getItem(this.KEYS.SETTINGS);
      if (!savedSettings) return null;

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

      return parsed;
    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
      return null;
    }
  }

  // Journal Entry operations
  async saveJournalEntry(entry: JournalEntry): Promise<void> {
    try {
      const entries = await this.getJournalEntries();
      const existingIndex = entries.findIndex(e => e.id === entry.id);

      if (existingIndex >= 0) {
        entries[existingIndex] = entry;
      } else {
        entries.push(entry);
      }

      await this._saveAllEntries(entries);
    } catch (error) {
      console.error('Error saving journal entry to localStorage:', error);
      throw new Error('Failed to save journal entry');
    }
  }

  async updateJournalEntry(entry: JournalEntry): Promise<void> {
    // Same as saveJournalEntry for localStorage
    await this.saveJournalEntry(entry);
  }

  async deleteJournalEntry(entryId: string): Promise<void> {
    try {
      const entries = await this.getJournalEntries();
      const filteredEntries = entries.filter(e => e.id !== entryId);
      await this._saveAllEntries(filteredEntries);
    } catch (error) {
      console.error('Error deleting journal entry from localStorage:', error);
      throw new Error('Failed to delete journal entry');
    }
  }

  async getJournalEntries(): Promise<JournalEntry[]> {
    try {
      const savedEntries = localStorage.getItem(this.KEYS.JOURNAL_ENTRIES);
      if (!savedEntries) return [];

      // Decrypt entries (handles migration from unencrypted)
      const decryptedData = safeRead(savedEntries, this.userId);
      if (!decryptedData) return [];

      const rawEntries: any[] = JSON.parse(decryptedData);

      // If data wasn't encrypted, encrypt it now (migration)
      if (!isEncrypted(savedEntries)) {
        // Re-save with encryption
        await this._saveAllEntries(rawEntries);
      }

      // Migration: Add `type` to entries that don't have it and parse summaryData
      const typedEntries = rawEntries.map(e => ({
        ...e,
        type: e.type || (e.prompt.includes('Reflection on Week') ? 'weekly_summary' : 'daily'),
        summaryData:
          (e.type === 'weekly_summary_report' || e.type === 'monthly_summary_report') &&
          typeof e.rawText === 'string'
            ? JSON.parse(e.rawText)
            : undefined,
      }));

      return typedEntries;
    } catch (error) {
      console.error('Error loading journal entries from localStorage:', error);
      return [];
    }
  }

  // Mood Journal Entry operations
  async saveMoodEntry(entry: MoodJournalEntry): Promise<void> {
    try {
      const entries = await this.getMoodEntries();
      const existingIndex = entries.findIndex(e => e.id === entry.id);

      if (existingIndex >= 0) {
        entries[existingIndex] = entry;
      } else {
        entries.push(entry);
      }

      await this._saveAllMoodEntries(entries);
    } catch (error) {
      console.error('Error saving mood entry to localStorage:', error);
      throw new Error('Failed to save mood entry');
    }
  }

  async updateMoodEntry(entry: MoodJournalEntry): Promise<void> {
    // Same as saveMoodEntry for localStorage
    await this.saveMoodEntry(entry);
  }

  async deleteMoodEntry(entryId: string): Promise<void> {
    try {
      const entries = await this.getMoodEntries();
      const filteredEntries = entries.filter(e => e.id !== entryId);
      await this._saveAllMoodEntries(filteredEntries);
    } catch (error) {
      console.error('Error deleting mood entry from localStorage:', error);
      throw new Error('Failed to delete mood entry');
    }
  }

  async getMoodEntries(): Promise<MoodJournalEntry[]> {
    try {
      const savedEntries = localStorage.getItem(this.KEYS.MOOD_ENTRIES);
      if (!savedEntries) return [];

      // Decrypt entries (handles migration from unencrypted)
      const decryptedData = safeRead(savedEntries, this.userId);
      if (!decryptedData) return [];

      const entries: MoodJournalEntry[] = JSON.parse(decryptedData);

      // If data wasn't encrypted, encrypt it now (migration)
      if (!isEncrypted(savedEntries)) {
        await this._saveAllMoodEntries(entries);
      }

      return entries;
    } catch (error) {
      console.error('Error loading mood entries from localStorage:', error);
      return [];
    }
  }

  async getAllData(): Promise<{
    profile: UserProfile | null;
    settings: Settings | null;
    entries: JournalEntry[];
    moodEntries: MoodJournalEntry[];
  }> {
    return {
      profile: await this.getUserProfile(),
      settings: await this.getSettings(),
      entries: await this.getJournalEntries(),
      moodEntries: await this.getMoodEntries(),
    };
  }

  async clearAll(): Promise<void> {
    try {
      localStorage.removeItem(this.KEYS.USER_PROFILE);
      localStorage.removeItem(this.KEYS.SETTINGS);
      localStorage.removeItem(this.KEYS.JOURNAL_ENTRIES);
      localStorage.removeItem(this.KEYS.MOOD_ENTRIES);

      // Clear encryption keys
      clearEncryptionKeys();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      throw new Error('Failed to clear storage');
    }
  }

  // Private helper to save all entries
  private async _saveAllEntries(entries: JournalEntry[]): Promise<void> {
    try {
      // Don't save summaryData directly, it's derived from rawText on load to save space
      const entriesToSave = entries.map(entry => {
        const { summaryData, ...rest } = entry;
        return rest;
      });

      // Encrypt before saving
      const encrypted = encryptJSON(entriesToSave, this.userId);
      localStorage.setItem(this.KEYS.JOURNAL_ENTRIES, encrypted);
    } catch (error) {
      console.error('Error saving journal entries to localStorage:', error);
      throw new Error('Failed to save journal entries');
    }
  }

  // Private helper to save all mood entries
  private async _saveAllMoodEntries(entries: MoodJournalEntry[]): Promise<void> {
    try {
      // Encrypt before saving
      const encrypted = encryptJSON(entries, this.userId);
      localStorage.setItem(this.KEYS.MOOD_ENTRIES, encrypted);
    } catch (error) {
      console.error('Error saving mood entries to localStorage:', error);
      throw new Error('Failed to save mood entries');
    }
  }
}
