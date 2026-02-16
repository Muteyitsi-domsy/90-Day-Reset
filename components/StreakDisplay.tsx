import React from 'react';

interface StreakDisplayProps {
  streak: number;
  label?: string;
  enabled?: boolean;
}

const StreakDisplay: React.FC<StreakDisplayProps> = ({ streak, label, enabled = true }) => {
  if (!enabled || streak <= 0) return null;

  return (
    <div className="flex items-center gap-1 text-lg text-[var(--accent-primary)] dark:text-[var(--accent-secondary)]">
      <span className="font-semibold">{streak}</span>
      <span role="img" aria-label="streak flame">🔥</span>
      {label && <span className="text-sm text-[var(--text-secondary)]">{label}</span>}
    </div>
  );
};

export default StreakDisplay;
