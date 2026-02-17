import React, { useEffect, useState } from 'react';
import Confetti from './Confetti';
import { getBadgeDisplayInfo } from '../services/milestoneService';
import type { EarnedBadge } from '../types';

interface MilestoneCelebrationProps {
  badge: EarnedBadge;
  onDismiss: () => void;
}

const MilestoneCelebration: React.FC<MilestoneCelebrationProps> = ({ badge, onDismiss }) => {
  const [visible, setVisible] = useState(true);
  const info = getBadgeDisplayInfo(badge);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300); // Allow fade-out before unmount
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleClick = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClick}
    >
      <div className="absolute inset-0 bg-black/50" />
      <Confetti numberOfPieces={80} recycle={false} />
      <div className={`relative z-10 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl max-w-sm mx-4 text-center shadow-2xl ${info.reflective ? 'p-10' : 'p-8'}`}>
        {info.reflective ? (
          <>
            <div className="text-4xl mb-6">{info.icon}</div>
            <h2 className="text-xl font-light text-[var(--text-primary)] mb-4 leading-relaxed">
              {info.title}
            </h2>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-8 text-sm">
              {info.description}
            </p>
            <button
              onClick={handleClick}
              className="px-6 py-2 rounded-lg border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm"
            >
              I see it
            </button>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">{info.icon}</div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
              {info.title}
            </h2>
            <p className="text-sm text-[var(--accent-primary)] font-medium mb-3">
              {info.typeLabel} &middot; {badge.threshold}-day streak
            </p>
            <p className="text-[var(--text-secondary)] mb-6">
              {info.description}
            </p>
            <button
              onClick={handleClick}
              className="px-6 py-2 rounded-lg bg-[var(--accent-primary)] text-white font-medium hover:bg-[var(--accent-primary-hover)] transition-colors"
            >
              Continue
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default MilestoneCelebration;
