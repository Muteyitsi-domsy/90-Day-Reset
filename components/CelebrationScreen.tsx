import React from 'react';
import Confetti from './Confetti';

interface CelebrationScreenProps {
  completionSummary: string;
  onRestart: () => void;
  onExport: () => void;
}

const CelebrationScreen: React.FC<CelebrationScreenProps> = ({ completionSummary, onRestart, onExport }) => {
  // The title is part of the layout, so we remove it from the summary text.
  const summaryContent = completionSummary.replace(/\*\*Your 90-Day Evolution\*\*/gi, '').trim();

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#fdfbf7] to-emerald-50 p-6 text-center overflow-hidden">
      <Confetti numberOfPieces={300} recycle={false} />
      <div className="animate-fade-in" style={{ animationFillMode: 'forwards', animationDelay: '0.3s', opacity: 0 }}>
        <h1 className="text-4xl font-bold text-emerald-700 mb-4">🎉 Congratulations!</h1>
        <p className="text-gray-600 mb-6">You’ve completed your 90-Day Identity Reset Journey</p>

        <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl p-6 max-w-2xl text-left space-y-4 overflow-y-auto max-h-[60vh] border border-white">
          <h2 className="text-2xl font-light text-emerald-800">Your 90-Day Evolution</h2>
          <p className="text-gray-700 whitespace-pre-line font-light leading-relaxed">{summaryContent}</p>
        </div>

        <div className="mt-8 flex gap-4 justify-center">
          <button onClick={onRestart} className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors duration-300">
            🌱 Start a New Cycle
          </button>
          <button onClick={onExport} className="border border-emerald-600 text-emerald-600 px-6 py-3 rounded-lg hover:bg-emerald-50 transition-colors duration-300">
            📄 Download Summary
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fade-in {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fade-in 1s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CelebrationScreen;