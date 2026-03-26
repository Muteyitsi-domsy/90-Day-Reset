import { useState } from 'react';
import { UserProfile } from '../types';

interface ShareButtonProps {
  userProfile: UserProfile;
  onClose?: () => void;
}

function computeCurrentDay(startDate: string): number {
  const start = new Date(startDate);
  const today = new Date();
  const diffMs = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.min(90, Math.max(1, diffDays));
}

export function ShareButton({ userProfile, onClose }: ShareButtonProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const appUrl = window.location.origin;
  const day = userProfile.startDate ? computeCurrentDay(userProfile.startDate) : 0;

  const message = day && day > 0
    ? `Day ${day} of 90 — quietly showing up for myself. Daily reflection, honest check-ins. Something is shifting.\n\nIf you've been thinking about doing the inner work, Renew90 is worth trying.\n\n${appUrl}`
    : `I've been using Renew90 for daily reflection and mood journaling. A small practice that's making a real difference.\n\nWorth trying.\n\n${appUrl}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Renew90', text: message });
        if (onClose) onClose();
      } catch {
        // user cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(message);
        setCopySuccess(true);
        setTimeout(() => {
          setCopySuccess(false);
          if (onClose) onClose();
        }, 2000);
      } catch {
        alert(`Copy this to share:\n\n${message}`);
      }
    }
  };

  if (copySuccess) {
    return (
      <p className="text-xs text-center text-green-600 dark:text-green-400 py-2">
        ✓ Copied — paste anywhere to share
      </p>
    );
  }

  return (
    <button
      onClick={handleShare}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-lg"
    >
      <svg className="w-5 h-5 text-[var(--accent-primary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
      <span className="text-[var(--text-primary)] font-medium">Share</span>
    </button>
  );
}
