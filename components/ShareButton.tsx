/**
 * ShareButton Component
 *
 * Social proof sharing feature that lets users share achievements
 * Disabled by default - enable with settings.shareEnabled = true
 */

import { useState } from 'react';
import { UserProfile } from '../types';

interface ShareButtonProps {
  userProfile: UserProfile;
  onClose?: () => void;
}

type ShareType = 'milestone' | 'streak' | 'completed' | 'generic';

export function ShareButton({ userProfile, onClose }: ShareButtonProps) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const { day, streak } = userProfile;

  // Determine available share types based on progress
  const shareOptions: { type: ShareType; label: string; emoji: string }[] = [];

  // Milestone shares
  if (day >= 7) shareOptions.push({ type: 'milestone', label: `${day} days completed`, emoji: '🌱' });

  // Streak shares (if streak >= 7)
  if (streak >= 7) shareOptions.push({ type: 'streak', label: `${streak}-day streak`, emoji: '🔥' });

  // Journey completion
  if (day >= 90) shareOptions.push({ type: 'completed', label: '90-Day Journey Complete', emoji: '✨' });

  // Always available
  shareOptions.push({ type: 'generic', label: 'Share this app', emoji: '💫' });

  // Generate share message based on type
  const getShareMessage = (type: ShareType): string => {
    const appUrl = window.location.origin; // You'll replace this with your actual app URL
    const appName = "90-Day Identity Reset"; // Your app name

    switch (type) {
      case 'milestone':
        if (day >= 90) {
          return `I just completed my 90-Day Identity Reset journey! ✨\n\nSpent 90 days reconnecting with myself through daily reflection. Feeling transformed. 🦋\n\n${appUrl}`;
        } else if (day >= 60) {
          return `60 days into my 90-Day Identity Reset! 🌟\n\n2 months of daily self-reflection and I'm seeing real shifts. This journey is powerful.\n\n${appUrl}`;
        } else if (day >= 30) {
          return `30 days of self-reflection complete! 🌱\n\nHalfway through my 90-Day Identity Reset and already noticing changes. If you're looking to reconnect with yourself, this is it.\n\n${appUrl}`;
        } else if (day >= 14) {
          return `2 weeks into my 90-Day Identity Reset! 💫\n\nDaily journaling + guided reflection = actual growth. Loving this process.\n\n${appUrl}`;
        } else {
          return `${day} days into my 90-Day Identity Reset! 🌱\n\nTaking time each day to reflect and reconnect with myself. It's making a difference.\n\n${appUrl}`;
        }

      case 'streak':
        return `${streak} days in a row of showing up for myself 🔥\n\nUsing ${appName} for daily reflection and the consistency is changing me. Small daily steps, real transformation.\n\n${appUrl}`;

      case 'completed':
        return `90 days. Complete. ✨\n\nI just finished my 90-Day Identity Reset journey and I'm not the same person I was when I started.\n\nIf you've been thinking about doing deeper work on yourself, this is your sign. 🦋\n\n${appUrl}`;

      case 'generic':
      default:
        return `I'm using ${appName} to reconnect with myself 💫\n\nDaily reflection + AI-guided insights over 90 days. It's like therapy meets journaling.\n\nIf you're ready to do the work, check it out:\n${appUrl}`;
    }
  };

  const handleShare = async (type: ShareType) => {
    const message = getShareMessage(type);

    // Try native share API first (works on mobile + modern browsers)
    if (navigator.share) {
      try {
        await navigator.share({
          title: '90-Day Identity Reset',
          text: message,
        });

        if (onClose) onClose();
      } catch (error) {
        // User cancelled or error occurred
        console.log('Share cancelled or failed:', error);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(message);
        setCopySuccess(true);

        setTimeout(() => {
          setCopySuccess(false);
          if (onClose) onClose();
        }, 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
        // Final fallback: show message to copy manually
        alert(`Copy this message to share:\n\n${message}`);
      }
    }
  };

  return (
    <div>
      <button
        onClick={() => setShowShareMenu(!showShareMenu)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-lg"
      >
        <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        <span className="text-[var(--text-primary)] font-medium">Share Your Journey</span>
      </button>

      {showShareMenu && (
        <div className="mt-2 ml-12 space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Share your progress and inspire others
          </p>

          {shareOptions.map(option => (
            <button
              key={option.type}
              onClick={() => handleShare(option.type)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <span className="text-xl">{option.emoji}</span>
              <span className="text-[var(--text-primary)]">{option.label}</span>
            </button>
          ))}

          {copySuccess && (
            <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
              <p className="text-xs text-green-600 dark:text-green-400 text-center">
                ✓ Copied to clipboard! Paste anywhere to share.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
