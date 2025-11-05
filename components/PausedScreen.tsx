import React from 'react';

interface PausedScreenProps {
  onResume: () => void;
}

const PausedScreen: React.FC<PausedScreenProps> = ({ onResume }) => {
  return (
    <div className="flex-1 flex items-center justify-center p-6 text-center animate-fade-in">
      <div className="max-w-md w-full">
        <h2 className="text-3xl font-light text-[#3a5a40] dark:text-emerald-300 mb-4">Your journey is paused.</h2>
        <p className="text-lg font-light text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
          Allow yourself rest, take a step back. You can continue anytime you decide, and we will be ready to have you when you are.
        </p>
        <button
          onClick={onResume}
          className="bg-[#588157] text-white px-8 py-3 rounded-lg text-lg font-medium shadow hover:bg-[#3a5a40] transition-colors duration-300 transform hover:scale-105"
        >
          Resume Journey
        </button>
      </div>
       <style>{`
        @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default PausedScreen;
