// This file manages the logic for daily reminder notifications.

const REMINDER_TIME_HOUR = 9; // 9 AM
const NOTIFICATION_SCHEDULED_KEY = 'dailyNotificationScheduledTime';

const messages = [
  {
    title: "A New Day Awaits ☀️",
    body: "It's time to check in and move closer to the best version of yourself."
  },
  {
    title: "A Gift For Your Future Self 🌿",
    body: "Show up for yourself today. Your future self will thank you for it."
  },
  {
    title: "Your Journey Continues...",
    body: "A moment of reflection is a moment of growth. Let's begin."
  },
  {
    title: "Ready for a Reset?",
    body: "Your daily check-in is here. Let's reconnect with your ideal self."
  }
];

/**
 * Requests permission from the user to show notifications.
 * @returns {Promise<boolean>} A promise that resolves to true if permission is granted, false otherwise.
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log("This browser does not support desktop notifications.");
    return false;
  }

  // Use a try-catch block for robustness, as some browsers might have issues.
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
 * This function is safe to call on every app load. It uses localStorage
 * to ensure that a notification is scheduled only once per day.
 * Note: This relies on setTimeout and will only fire if the browser is running.
 * A more robust solution for a production app would involve a Service Worker.
 */
export const scheduleDailyReminder = () => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const lastScheduledTime = localStorage.getItem(NOTIFICATION_SCHEDULED_KEY);
  const now = new Date().getTime();

  // If there's a future notification already scheduled, don't schedule another.
  if (lastScheduledTime && parseInt(lastScheduledTime, 10) > now) {
    return;
  }

  // Calculate the next 9 AM
  const nextReminder = new Date();
  nextReminder.setHours(REMINDER_TIME_HOUR, 0, 0, 0);

  // If it's already past 9 AM today, schedule for 9 AM tomorrow.
  if (nextReminder.getTime() <= now) {
    nextReminder.setDate(nextReminder.getDate() + 1);
  }

  const timeUntilNextReminder = nextReminder.getTime() - now;

  setTimeout(() => {
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    try {
      new Notification(randomMessage.title, {
        body: randomMessage.body,
        icon: '/favicon.ico' // A default icon
      });
    } catch (error) {
        console.error("Error displaying notification:", error);
    }
    // Clear the old schedule time so a new one can be set next time the app opens.
    localStorage.removeItem(NOTIFICATION_SCHEDULED_KEY);
  }, timeUntilNextReminder);

  // Store the time of the scheduled notification to prevent rescheduling on subsequent app loads.
  localStorage.setItem(NOTIFICATION_SCHEDULED_KEY, nextReminder.getTime().toString());
};
