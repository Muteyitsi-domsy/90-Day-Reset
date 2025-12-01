
import React from 'react';
import DailyCompletionCircle from './DailyCompletionCircle';

interface HeaderProps {
  streak?: number;
  onOpenMenu: () => void;
  hasUnreadReports?: boolean;
  ritualCompleted?: boolean;
  morningEntryCompleted?: boolean;
  eveningCheckinCompleted?: boolean;
}

const MenuIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);

const Header: React.FC<HeaderProps> = ({
  streak,
  onOpenMenu,
  hasUnreadReports,
  ritualCompleted = false,
  morningEntryCompleted = false,
  eveningCheckinCompleted = false
}) => {
  return (
    <header className="w-full flex items-center justify-between p-4 bg-[var(--bg-from)]/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="w-12 relative">
        <button onClick={onOpenMenu} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1" aria-label="Open menu">
          <MenuIcon className="w-8 h-8" />
        </button>
        {hasUnreadReports && (
            <span className="absolute top-1 right-1 block h-3 w-3 rounded-full ring-2 ring-white bg-red-500"></span>
        )}
      </div>
      <h1 className="text-xl font-light text-[var(--text-secondary)] text-center">
        90-Day Identity Reset
      </h1>
      <div className="flex items-center justify-end gap-3">
        <DailyCompletionCircle
          ritualCompleted={ritualCompleted}
          morningEntryCompleted={morningEntryCompleted}
          eveningCheckinCompleted={eveningCheckinCompleted}
          size="small"
        />
        {streak && streak > 0 ? (
          <div className="flex items-center justify-end text-lg text-[var(--accent-primary)] dark:text-[var(--accent-secondary)]" title={`${streak}-day streak`}>
            <span className="font-semibold">{streak}</span>
            <span role="img" aria-label="streak flame">🔥</span>
          </div>
        ) : <div className="w-6 h-6"></div>}
      </div>
    </header>
  );
};

export default Header;
