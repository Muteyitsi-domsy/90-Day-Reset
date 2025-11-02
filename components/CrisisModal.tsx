import React from 'react';
import { CrisisSeverity } from '../utils/crisisDetector';

interface CrisisModalProps {
  severity: CrisisSeverity;
  onClose: () => void;
}

const CrisisModal: React.FC<CrisisModalProps> = ({ severity, onClose }) => {
  const messages = {
    2: {
      title: "A Gentle Pause",
      intro: "It sounds like you might be in significant distress right now. Your well-being is the most important thing."
    },
    3: {
      title: "Immediate Support Is Available",
      intro: "It sounds like you are in crisis and may need immediate support. Please know you are not alone and help is available."
    }
  };

  const content = messages[severity as 2 | 3] || messages[2];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in-fast" aria-modal="true" role="alertdialog">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6 text-center border-2 border-red-500">
        <h2 className="text-2xl font-light text-red-800 mb-4">{content.title}</h2>
        <p className="text-md text-gray-700 leading-relaxed mb-4">{content.intro}</p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-amber-800 font-medium">
            <strong>Important:</strong> This is a journaling tool, not a substitute for professional help. The AI analysis for this entry has been paused.
          </p>
        </div>
        
        <div className="space-y-4 text-left">
            <p className="font-semibold text-gray-800">Please reach out for support:</p>
            <a 
                href="tel:988" 
                className="block w-full text-center bg-red-600 text-white px-4 py-3 rounded-lg font-bold text-lg hover:bg-red-700 transition-colors"
            >
                Call or Text 988 (USA)
            </a>
            <a 
                href="https://findahelpline.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-full text-center border border-gray-400 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
                Find a Helpline in Your Country
            </a>
            <p className="text-sm text-gray-600 text-center pt-2">
                You can also contact a therapist, a trusted friend, or a family member.
            </p>
        </div>

        <button 
          onClick={onClose} 
          className="w-full mt-6 py-2 rounded-lg bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 transition-colors"
          aria-label="Close this message and return to the journal"
        >
          I Understand
        </button>
      </div>
      <style>{`
        @keyframes fade-in-fast {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .animate-fade-in-fast {
            animation: fade-in-fast 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CrisisModal;
