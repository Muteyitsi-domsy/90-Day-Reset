import { StorageService } from './storageService';

interface ExportEnvelope {
  version: 1;
  exportDate: string;
  data: {
    profile: any;
    settings: any;
    entries: any[];
    moodEntries: any[];
    flipEntries: any[];
  };
}

/**
 * Exports all user data from the given storage service as a JSON string.
 */
export async function exportAllData(storageService: StorageService): Promise<string> {
  const allData = await storageService.getAllData();
  const envelope: ExportEnvelope = {
    version: 1,
    exportDate: new Date().toISOString(),
    data: {
      profile: allData.profile,
      settings: allData.settings,
      entries: allData.entries,
      moodEntries: allData.moodEntries,
      flipEntries: allData.flipEntries,
    },
  };
  return JSON.stringify(envelope, null, 2);
}

/**
 * Imports data from a JSON string into the given storage service.
 * Validates the structure before importing.
 */
export async function importAllData(
  jsonString: string,
  storageService: StorageService
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  let envelope: ExportEnvelope;
  try {
    envelope = JSON.parse(jsonString);
  } catch {
    return { success: false, errors: ['Invalid JSON file'] };
  }

  if (!envelope || typeof envelope !== 'object') {
    return { success: false, errors: ['Invalid export format'] };
  }

  if (envelope.version !== 1) {
    return { success: false, errors: [`Unsupported export version: ${envelope.version}`] };
  }

  if (!envelope.data || typeof envelope.data !== 'object') {
    return { success: false, errors: ['Missing data in export file'] };
  }

  const { data } = envelope;

  if (data.profile) {
    try {
      await storageService.saveUserProfile(data.profile);
    } catch (e) {
      errors.push(`Failed to import profile: ${e}`);
    }
  }

  if (data.settings) {
    try {
      await storageService.saveSettings(data.settings);
    } catch (e) {
      errors.push(`Failed to import settings: ${e}`);
    }
  }

  if (Array.isArray(data.entries)) {
    for (const entry of data.entries) {
      try {
        await storageService.saveJournalEntry(entry);
      } catch (e) {
        errors.push(`Failed to import journal entry ${entry.id}: ${e}`);
      }
    }
  }

  if (Array.isArray(data.moodEntries)) {
    for (const entry of data.moodEntries) {
      try {
        await storageService.saveMoodEntry(entry);
      } catch (e) {
        errors.push(`Failed to import mood entry ${entry.id}: ${e}`);
      }
    }
  }

  if (Array.isArray(data.flipEntries)) {
    for (const entry of data.flipEntries) {
      try {
        await storageService.saveFlipEntry(entry);
      } catch (e) {
        errors.push(`Failed to import flip entry ${entry.id}: ${e}`);
      }
    }
  }

  return { success: errors.length === 0, errors };
}

/**
 * Triggers a file download of the given JSON string.
 */
export function downloadJSON(jsonString: string, filename?: string): void {
  const fname = filename || `renew90-backup-${new Date().toISOString().split('T')[0]}.json`;
  const blob = new Blob([jsonString], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fname;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Opens a file picker and reads the selected JSON file.
 * Returns the file content as a string.
 */
export function handleFileImport(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    };

    input.click();
  });
}
