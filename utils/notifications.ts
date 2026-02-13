// This file manages the logic for daily reminder notifications.
// Uses Capacitor Local Notifications on native Android, falls back to Web API for PWA.

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const REMINDER_TIME_HOUR = 9; // 9 AM
const NOTIFICATION_SCHEDULED_KEY = 'dailyNotificationScheduledTime';
const EVENING_REMINDER_KEY = 'eveningNotificationScheduledTime';

// Stable IDs for native notifications so we can cancel/reschedule
const DAILY_NOTIFICATION_ID = 1001;
const EVENING_NOTIFICATION_ID = 1002;

const messages = [
  {
    title: "A New Day Awaits",
    body: "It's time to check in and move closer to the best version of yourself."
  },
  {
    title: "A Gift For Your Future Self",
    body: "Show up for yourself today. Your future self will thank you for it."
  },
  {
    title: "Your Journey Continues",
    body: "A moment of reflection is a moment of growth. Let's begin."
  },
  {
    title: "Ready for a Reset?",
    body: "Your daily check-in is here. Let's reconnect with your ideal self."
  }
];

const isNative = () => Capacitor.isNativePlatform();

export function isMessagingSupported(): boolean {
  if (isNative()) return true;
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "Notification" in window &&
    "PushManager" in window
  );
}

/**
 * Requests permission to show notifications.
 * On native Android 13+, this triggers the system permission dialog.
 * On web, uses the Web Notification API.
 */
export const safeRequestNotificationPermission = async (): Promise<boolean> => {
  if (isNative()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') return true;

      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    } catch (error) {
      console.error('Error requesting native notification permission:', error);
      return false;
    }
  }

  // Web/PWA fallback
  if (!isMessagingSupported()) {
    console.info("Notifications not supported in this browser.");
    return false;
  }
  return requestNotificationPermission();
};

/**
 * Web-only permission request (kept for PWA compatibility).
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log("This browser does not support desktop notifications.");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
};

/**
 * Schedules a daily reminder notification for 9 AM.
 * On native: uses Capacitor Local Notifications with a repeating daily schedule.
 * On web: uses setTimeout (only fires if browser/PWA is running).
 */
export const scheduleDailyReminder = async () => {
  if (isNative()) {
    try {
      // Cancel any existing daily reminder to avoid duplicates
      await LocalNotifications.cancel({ notifications: [{ id: DAILY_NOTIFICATION_ID }] });

      const randomMessage = messages[Math.floor(Math.random() * messages.length)];

      await LocalNotifications.schedule({
        notifications: [
          {
            id: DAILY_NOTIFICATION_ID,
            title: randomMessage.title,
            body: randomMessage.body,
            schedule: {
              on: { hour: REMINDER_TIME_HOUR, minute: 0 },
              every: 'day',
              allowWhileIdle: true,
            },
            smallIcon: 'ic_launcher',
            largeIcon: 'ic_launcher',
          }
        ]
      });
      console.log('Native daily reminder scheduled for 9 AM');
    } catch (error) {
      console.error('Error scheduling native daily reminder:', error);
    }
    return;
  }

  // Web/PWA fallback
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const lastScheduledTime = localStorage.getItem(NOTIFICATION_SCHEDULED_KEY);
  const now = new Date().getTime();

  if (lastScheduledTime && parseInt(lastScheduledTime, 10) > now) {
    return;
  }

  const nextReminder = new Date();
  nextReminder.setHours(REMINDER_TIME_HOUR, 0, 0, 0);

  if (nextReminder.getTime() <= now) {
    nextReminder.setDate(nextReminder.getDate() + 1);
  }

  const timeUntilNextReminder = nextReminder.getTime() - now;

  setTimeout(() => {
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    try {
      new Notification(randomMessage.title, {
        body: randomMessage.body,
        icon: '/favicon.ico'
      });
    } catch (error) {
      console.error("Error displaying notification:", error);
    }
    localStorage.removeItem(NOTIFICATION_SCHEDULED_KEY);
  }, timeUntilNextReminder);

  localStorage.setItem(NOTIFICATION_SCHEDULED_KEY, nextReminder.getTime().toString());
};

/**
 * Schedules a one-off evening reminder 8 hours after a journal entry is saved.
 * On native: uses Capacitor Local Notifications with a specific time.
 * On web: uses setTimeout (only fires if browser/PWA is running).
 */
export const scheduleEveningReminder = async () => {
  const EIGHT_HOURS_IN_MS = 8 * 60 * 60 * 1000;

  if (isNative()) {
    try {
      // Cancel any existing evening reminder to avoid duplicates
      await LocalNotifications.cancel({ notifications: [{ id: EVENING_NOTIFICATION_ID }] });

      const reminderTime = new Date(Date.now() + EIGHT_HOURS_IN_MS);

      await LocalNotifications.schedule({
        notifications: [
          {
            id: EVENING_NOTIFICATION_ID,
            title: "Evening Check-in",
            body: "How did your day align with your journey? Take a moment to reflect.",
            schedule: {
              at: reminderTime,
              allowWhileIdle: true,
            },
            smallIcon: 'ic_launcher',
            largeIcon: 'ic_launcher',
          }
        ]
      });
      console.log('Native evening reminder scheduled for', reminderTime.toLocaleTimeString());
    } catch (error) {
      console.error('Error scheduling native evening reminder:', error);
    }
    return;
  }

  // Web/PWA fallback
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const lastScheduledTime = localStorage.getItem(EVENING_REMINDER_KEY);
  const now = new Date().getTime();

  if (lastScheduledTime && parseInt(lastScheduledTime, 10) > now) {
    return;
  }

  const reminderTime = new Date(now + EIGHT_HOURS_IN_MS);

  setTimeout(() => {
    try {
      new Notification("Evening Check-in", {
        body: "How did your day align with your journey? Take a moment to reflect.",
        icon: '/favicon.ico'
      });
    } catch (error) {
      console.error("Error displaying evening notification:", error);
    }
    localStorage.removeItem(EVENING_REMINDER_KEY);
  }, EIGHT_HOURS_IN_MS);

  localStorage.setItem(EVENING_REMINDER_KEY, reminderTime.getTime().toString());
};
