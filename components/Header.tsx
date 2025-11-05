import React from 'react';

interface HeaderProps {
  streak?: number;
  onOpenSettings: () => void;
}

const CogIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.438.995s.145.755.438.995l1.003.827c.48.398.668 1.03.26 1.431l-1.296 2.247a1.125 1.125 0 0 1-1.37.49l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 0 1-.22-.127c-.324-.196-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 0 1-1.37-.49l-1.296-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.437-.995s-.145-.755-.437-.995l-1.004-.827a1.125 1.125 0 0 1-.26-1.431l1.296-2.247a1.125 1.125 0 0 1 1.37-.49l1.217.456c.355.133.75.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
    </svg>
);

const Header: React.FC<HeaderProps> = ({ streak, onOpenSettings }) => {
  return (
    <header className="w-full flex items-center justify-between p-4 bg-[#fdfbf7]/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="w-12">
        <button onClick={onOpenSettings} className="text-gray-500 hover:text-[#3a5a40] dark:text-gray-400 dark:hover:text-emerald-300 transition-colors" aria-label="Open settings">
          <CogIcon className="w-6 h-6" />
        </button>
      </div>
      <h1 className="text-xl font-light text-[#3a5a40] dark:text-emerald-300 text-center">
        90-Day Identity Reset
      </h1>
      <div className="w-12 text-right">
        {streak && streak > 0 ? (
          <div className="flex items-center justify-end text-lg text-[#588157] dark:text-emerald-400" title={`${streak}-day streak`}>
            <span className="font-semibold">{streak}</span>
            <span role="img" aria-label="streak flame">🔥</span>
          </div>
        ) : <div className="w-6 h-6"></div>}
      </div>
    </header>
  );
};

export default Header;