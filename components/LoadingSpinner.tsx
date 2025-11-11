
import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center space-x-2 py-2 px-1">
      <div className="w-2 h-2 rounded-full bg-[var(--accent-secondary)] animate-pulse"></div>
      <div className="w-2 h-2 rounded-full bg-[var(--accent-secondary)] animate-pulse" style={{ animationDelay: '0.2s' }}></div>
      <div className="w-2 h-2 rounded-full bg-[var(--accent-secondary)] animate-pulse" style={{ animationDelay: '0.4s' }}></div>
    </div>
  );
};

export default LoadingSpinner;