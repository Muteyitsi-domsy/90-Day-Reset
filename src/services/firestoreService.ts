import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserProfile, Settings, JournalEntry, MoodJournalEntry, FlipJournalEntry } from '../types';
import { StorageService } from './storageService';

/**
 * Firestore implementation of StorageService
 * Handles data persistence using Firebase Firestore
 */
export class FirestoreService implements StorageService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // User Profile operations
  async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      const userDocRef = doc(db, 'users', this.userId);
      await setDoc(
        userDocRef,
        {
          profile,
          metadata: {
            lastSyncedAt: serverTimestamp(),
          },
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error saving user profile to Firestore:', error);
      throw new Error('Failed to save user profile to cloud');
    }
  }

  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const userDocRef = doc(db, 'users', this.userId);
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return data.profile || null;
    } catch (error) {
      console.error('Error loading user profile from Firestore:', error);
      throw new Error('Failed to load user profile from cloud');
    }
  }

  // Settings operations
  async saveSettings(settings: Settings): Promise<void> {
    try {
      const userDocRef = doc(db, 'users', this.userId);
      await setDoc(
        userDocRef,
        {
          settings,
          metadata: {
            lastSyncedAt: serverTimestamp(),
          },
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error saving settings to Firestore:', error);
      throw new Error('Failed to save settings to cloud');
    }
  }

  async getSettings(): Promise<Settings | null> {
    try {
      const userDocRef = doc(db, 'users', this.userId);
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return data.settings || null;
    } catch (error) {
      console.error('Error loading settings from Firestore:', error);
      throw new Error('Failed to load settings from cloud');
    }
  }

  // Journal Entry operations
  async saveJournalEntry(entry: JournalEntry): Promise<void> {
    try {
      const entryDocRef = doc(db, 'users', this.userId, 'journalEntries', entry.id);

      // Add timestamps for tracking
      const entryWithTimestamp = {
        ...entry,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(entryDocRef, entryWithTimestamp);
    } catch (error) {
      console.error('Error saving journal entry to Firestore:', error);
      throw new Error('Failed to save journal entry to cloud');
    }
  }

  async updateJournalEntry(entry: JournalEntry): Promise<void> {
    try {
      const entryDocRef = doc(db, 'users', this.userId, 'journalEntries', entry.id);

      // Update with new timestamp
      const entryWithTimestamp = {
        ...entry,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(entryDocRef, entryWithTimestamp as any);
    } catch (error) {
      console.error('Error updating journal entry in Firestore:', error);
      throw new Error('Failed to update journal entry in cloud');
    }
  }

  async deleteJournalEntry(entryId: string): Promise<void> {
    try {
      const entryDocRef = doc(db, 'users', this.userId, 'journalEntries', entryId);
      await deleteDoc(entryDocRef);
    } catch (error) {
      console.error('Error deleting journal entry from Firestore:', error);
      throw new Error('Failed to delete journal entry from cloud');
    }
  }

  async getJournalEntries(): Promise<JournalEntry[]> {
    try {
      const entriesCollectionRef = collection(db, 'users', this.userId, 'journalEntries');
      const querySnapshot = await getDocs(entriesCollectionRef);

      const entries: JournalEntry[] = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        // Remove Firestore-specific fields (createdAt, updatedAt)
        const { createdAt, updatedAt, ...entry } = data;
        entries.push(entry as JournalEntry);
      });

      // Sort by day number
      entries.sort((a, b) => a.day - b.day);

      return entries;
    } catch (error) {
      console.error('Error loading journal entries from Firestore:', error);
      throw new Error('Failed to load journal entries from cloud');
    }
  }

  // Mood Journal Entry operations
  async saveMoodEntry(entry: MoodJournalEntry): Promise<void> {
    try {
      const entryDocRef = doc(db, 'users', this.userId, 'moodEntries', entry.id);

      // Add timestamps for tracking
      const entryWithTimestamp = {
        ...entry,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(entryDocRef, entryWithTimestamp);
    } catch (error) {
      console.error('Error saving mood entry to Firestore:', error);
      throw new Error('Failed to save mood entry to cloud');
    }
  }

  async updateMoodEntry(entry: MoodJournalEntry): Promise<void> {
    try {
      const entryDocRef = doc(db, 'users', this.userId, 'moodEntries', entry.id);

      // Update with new timestamp
      const entryWithTimestamp = {
        ...entry,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(entryDocRef, entryWithTimestamp as any);
    } catch (error) {
      console.error('Error updating mood entry in Firestore:', error);
      throw new Error('Failed to update mood entry in cloud');
    }
  }

  async deleteMoodEntry(entryId: string): Promise<void> {
    try {
      const entryDocRef = doc(db, 'users', this.userId, 'moodEntries', entryId);
      await deleteDoc(entryDocRef);
    } catch (error) {
      console.error('Error deleting mood entry from Firestore:', error);
      throw new Error('Failed to delete mood entry from cloud');
    }
  }

  async getMoodEntries(): Promise<MoodJournalEntry[]> {
    try {
      const entriesCollectionRef = collection(db, 'users', this.userId, 'moodEntries');
      const querySnapshot = await getDocs(entriesCollectionRef);

      const entries: MoodJournalEntry[] = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        // Remove Firestore-specific fields (createdAt, updatedAt)
        const { createdAt, updatedAt, ...entry } = data;
        entries.push(entry as MoodJournalEntry);
      });

      // Sort by date (most recent first)
      entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return entries;
    } catch (error) {
      console.error('Error loading mood entries from Firestore:', error);
      throw new Error('Failed to load mood entries from cloud');
    }
  }

  // Flip Journal Entry operations
  async saveFlipEntry(entry: FlipJournalEntry): Promise<void> {
    try {
      const entryDocRef = doc(db, 'users', this.userId, 'flipJournalEntries', entry.id);

      // Add timestamps for tracking
      const entryWithTimestamp = {
        ...entry,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(entryDocRef, entryWithTimestamp);
    } catch (error) {
      console.error('Error saving flip entry to Firestore:', error);
      throw new Error('Failed to save flip entry to cloud');
    }
  }

  async updateFlipEntry(entry: FlipJournalEntry): Promise<void> {
    try {
      const entryDocRef = doc(db, 'users', this.userId, 'flipJournalEntries', entry.id);

      // Add updated timestamp
      const entryWithTimestamp = {
        ...entry,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(entryDocRef, entryWithTimestamp as any);
    } catch (error) {
      console.error('Error updating flip entry in Firestore:', error);
      throw new Error('Failed to update flip entry in cloud');
    }
  }

  async deleteFlipEntry(entryId: string): Promise<void> {
    try {
      const entryDocRef = doc(db, 'users', this.userId, 'flipJournalEntries', entryId);
      await deleteDoc(entryDocRef);
    } catch (error) {
      console.error('Error deleting flip entry from Firestore:', error);
      throw new Error('Failed to delete flip entry from cloud');
    }
  }

  async getFlipEntries(): Promise<FlipJournalEntry[]> {
    try {
      const entriesCollectionRef = collection(db, 'users', this.userId, 'flipJournalEntries');
      const querySnapshot = await getDocs(entriesCollectionRef);

      const entries: FlipJournalEntry[] = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        // Remove Firestore-specific fields (createdAt, updatedAt)
        const { createdAt, updatedAt, ...entry } = data;
        entries.push(entry as FlipJournalEntry);
      });

      // Sort by timestamp (most recent first)
      entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return entries;
    } catch (error: any) {
      // Handle permission errors gracefully - rules may not include this collection yet
      if (error?.code === 'permission-denied') {
        console.warn('Flip entries: Firestore rules need to be updated to include flipJournalEntries collection');
        return [];
      }
      console.error('Error loading flip entries from Firestore:', error);
      return []; // Return empty instead of throwing to not break app loading
    }
  }

  async getAllData(): Promise<{
    profile: UserProfile | null;
    settings: Settings | null;
    entries: JournalEntry[];
    moodEntries: MoodJournalEntry[];
    flipEntries: FlipJournalEntry[];
  }> {
    return {
      profile: await this.getUserProfile(),
      settings: await this.getSettings(),
      entries: await this.getJournalEntries(),
      moodEntries: await this.getMoodEntries(),
      flipEntries: await this.getFlipEntries(),
    };
  }

  async clearAll(): Promise<void> {
    try {
      const batch = writeBatch(db);

      // Delete user document
      const userDocRef = doc(db, 'users', this.userId);
      batch.delete(userDocRef);

      // Delete all journal entries
      const entriesCollectionRef = collection(db, 'users', this.userId, 'journalEntries');
      const entriesSnapshot = await getDocs(entriesCollectionRef);
      entriesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete all mood entries
      const moodEntriesCollectionRef = collection(db, 'users', this.userId, 'moodEntries');
      const moodEntriesSnapshot = await getDocs(moodEntriesCollectionRef);
      moodEntriesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete all flip journal entries
      const flipEntriesCollectionRef = collection(db, 'users', this.userId, 'flipJournalEntries');
      const flipEntriesSnapshot = await getDocs(flipEntriesCollectionRef);
      flipEntriesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error('Error clearing Firestore data:', error);
      throw new Error('Failed to clear cloud storage');
    }
  }

  /**
   * Clear only 90-day journey data (journal entries including reports)
   * Preserves: mood entries, flip entries, user profile, settings
   */
  async clearJourneyData(): Promise<void> {
    try {
      const batch = writeBatch(db);

      // Delete all journal entries (daily entries, weekly reports, monthly reports)
      const entriesCollectionRef = collection(db, 'users', this.userId, 'journalEntries');
      const entriesSnapshot = await getDocs(entriesCollectionRef);
      entriesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error('Error clearing journey data from Firestore:', error);
      throw new Error('Failed to clear journey data from cloud');
    }
  }

  /**
   * Batch upload multiple entries (useful for migration)
   */
  async batchSaveEntries(entries: JournalEntry[]): Promise<void> {
    try {
      // Firestore has a limit of 500 operations per batch
      const batchSize = 500;

      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = entries.slice(i, i + batchSize);

        chunk.forEach(entry => {
          const entryDocRef = doc(db, 'users', this.userId, 'journalEntries', entry.id);
          batch.set(entryDocRef, {
            ...entry,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        });

        await batch.commit();
      }
    } catch (error) {
      console.error('Error batch saving journal entries to Firestore:', error);
      throw new Error('Failed to batch save journal entries to cloud');
    }
  }
}
