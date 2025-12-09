/**
 * SharePrompt Component
 *
 * Achievement-based share prompt that appears after milestones
 * Shows a celebratory modal inviting users to share their progress
 * Only appears when settings.shareEnabled = true
 */

import { useState } from 'react';
import { UserProfile } from '../types';

interface SharePromptProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  milestone: 'day7' | 'day30' | 'day60' | 'day90' | 'streak7' | 'streak30';
}

export function SharePrompt({ isOpen, onClose, userProfile, milestone }: SharePromptProps) {
  const [shareSuccess, setShareSuccess] = useState(false);

  if (!isOpen) return null;

  // Milestone-specific content
  const getMilestoneContent = () => {
    switch (milestone) {
      case 'day7':
        return {
          title: '7 Days Complete! 🌱',
          message: 'You've shown up for yourself every day this week. That's powerful.',
          shareText: '7 days into my 90-Day Identity Reset! 🌱\n\nTaking time each day to reflect and reconnect with myself. The consistency is already making a difference.\n\nIf you've been thinking about doing deeper work, this is your sign. ✨',
          emoji: '🌱'
        };
      case 'day30':
        return {
          title: '30 Days Complete! ✨',
          message: 'One month of daily reflection. You're building something real here.',
          shareText: '30 days of self-reflection complete! ✨\n\nA whole month of showing up for myself through the 90-Day Identity Reset. The shifts are real.\n\nIf you're looking to reconnect with yourself, highly recommend this journey. 💫',
          emoji: '✨'
        };
      case 'day60':
        return {
          title: '60 Days Complete! 🌟',
          message: 'Two months of showing up. You're in the final stretch.',
          shareText: '60 days into my 90-Day Identity Reset! 🌟\n\n2 months of daily reflection and I can feel the transformation happening. The final 30 days are going to be powerful.\n\nThis journey is no joke. If you're ready to do the work, check it out. 🦋',
          emoji: '🌟'
        };
      case 'day90':
        return {
          title: '90 Days Complete! 🦋',
          message: 'You did it. 90 days of showing up for yourself. You've transformed.',
          shareText: '90 days. Complete. 🦋\n\nI just finished my 90-Day Identity Reset journey and I'm genuinely not the same person I was when I started.\n\nIf you've been thinking about doing deeper inner work, this is your sign. The transformation is real. ✨',
          emoji: '🦋'
        };
      case 'streak7':
        return {
          title: '7-Day Streak! 🔥',
          message: 'Seven days in a row. Consistency is transformation.',
          shareText: '7 days in a row of showing up for myself 🔥\n\nUsing the 90-Day Identity Reset for daily reflection and the consistency is everything. Small daily steps, real growth.\n\nIf you're looking for a structured way to reconnect with yourself, this is it. 🌱',
          emoji: '🔥'
        };
      case 'streak30':
        return {
          title: '30-Day Streak! 🔥',
          message: 'Thirty consecutive days. You're unstoppable.',
          shareText: '30 days in a row 🔥\n\nShowing up for myself every single day through the 90-Day Identity Reset. The discipline is becoming second nature.\n\nConsistency > intensity. This journey proves it. 💪',
          emoji: '🔥'
        };
      default:
        return {
          title: 'Milestone Reached! 🎉',
          message: 'You're making progress on your journey.',
          shareText: 'Making progress on my 90-Day Identity Reset journey! 💫',
          emoji: '🎉'
        };
    }
  };

  const content = getMilestoneContent();

  const handleShare = async () => {
    const appUrl = window.location.origin;
    const fullMessage = `${content.shareText}\n\n${appUrl}`;

    // Try native share API first
    if (navigator.share) {
      try {
        await navigator.share({
          title: '90-Day Identity Reset',
          text: fullMessage,
        });
        setShareSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1500);
      } catch (error) {
        console.log('Share cancelled or failed:', error);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(fullMessage);
        setShareSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
        alert(`Copy this message to share:\n\n${fullMessage}`);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-slideUp">
        {/* Celebration Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-8 text-center">
          <div className="text-6xl mb-4 animate-bounce">{content.emoji}</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {content.title}
          </h2>
          <p className="text-blue-100">
            {content.message}
          </p>
        </div>

        {/* Share Invitation */}
        <div className="p-6">
          {!shareSuccess ? (
            <>
              <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                Want to inspire others? Share your progress and help someone else start their journey.
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleShare}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share Your Progress
                </button>

                <button
                  onClick={onClose}
                  className="w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                >
                  Maybe Later
                </button>
              </div>

              <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
                You can always share from the menu later
              </p>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="inline-block p-4 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-medium text-[var(--text-primary)] mb-2">
                {navigator.share ? 'Shared!' : 'Copied to clipboard!'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {navigator.share ? 'Thanks for sharing your journey ✨' : 'Paste anywhere to share your progress ✨'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Add these to your CSS for animations
const styles = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.2s ease-out;
}

.animate-slideUp {
  animation: slideUp 0.3s ease-out;
}
`;
