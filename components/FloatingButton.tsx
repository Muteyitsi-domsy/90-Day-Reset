import React from 'react';

interface FloatingButtonProps {
    onClick: () => void;
    icon: 'pen' | 'moon';
    positionClasses: string;
}

const PenIcon: React.FC<{className: string}> = ({className}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
);

const MoonIcon: React.FC<{className: string}> = ({className}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
);

const FloatingButton: React.FC<FloatingButtonProps> = ({ onClick, icon, positionClasses }) => {
    const isPen = icon === 'pen';
    const bgColor = isPen ? 'bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)]' : 'bg-indigo-500 hover:bg-indigo-600';
    const ringColor = isPen ? 'focus:ring-[var(--ring-color)]' : 'focus:ring-indigo-500';

    return (
        <button
            onClick={onClick}
            className={`fixed ${positionClasses} ${bgColor} text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 ${ringColor}`}
            aria-label={isPen ? "Today's Reflection" : "Record an Insight"}
        >
            {isPen ? <PenIcon className="w-8 h-8"/> : <MoonIcon className="w-8 h-8"/>}
        </button>
    );
};

export default FloatingButton;