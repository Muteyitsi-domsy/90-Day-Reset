// In-app update checker for Android
// Prompts users to update when a new version is available on the Play Store

import { Capacitor } from '@capacitor/core';
import { AppUpdate, AppUpdateAvailability, FlexibleUpdateInstallStatus } from '@capawesome/capacitor-app-update';

/**
 * Checks if an app update is available and prompts the user.
 * Only runs on native Android — silently skips on web/PWA.
 */
export async function checkForAppUpdate(): Promise<void> {
  // Only check on native Android
  if (Capacitor.getPlatform() !== 'android') {
    return;
  }

  try {
    const result = await AppUpdate.getAppUpdateInfo();

    if (result.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE) {
      // Try flexible update first (downloads in background, user can keep using app)
      try {
        await AppUpdate.startFlexibleUpdate();

        // Listen for download completion
        await AppUpdate.addListener('onFlexibleUpdateStateChange', (state) => {
          if (state.installStatus === FlexibleUpdateInstallStatus.DOWNLOADED) {
            // Update downloaded — prompt user to restart
            if (confirm('Update downloaded! Restart now to apply the latest improvements?')) {
              AppUpdate.completeFlexibleUpdate();
            }
          }
        });
      } catch {
        // Flexible update not available, try immediate update
        try {
          await AppUpdate.performImmediateUpdate();
        } catch {
          // Immediate update also not available — fail silently
        }
      }
    }
  } catch (error) {
    // Don't block app usage if update check fails
    console.log('App update check skipped:', error);
  }
}
