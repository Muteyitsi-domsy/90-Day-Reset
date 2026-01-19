import React, { useState } from 'react';
import type { MonthlySummaryData } from '../types';
import { generateMonthlySummaryImage, downloadImage, getMonthlySummaryFilename } from '../services/moodSummaryImageService';

// Month names for display
const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface MonthlySummaryModalProps {
  data: MonthlySummaryData;
  onClose: (downloaded: boolean) => void;
}

const MonthlySummaryModal: React.FC<MonthlySummaryModalProps> = ({ data, onClose }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await generateMonthlySummaryImage(data);
      downloadImage(blob, getMonthlySummaryFilename(data.month, data.year));
      onClose(true);
    } catch (error) {
      console.error('Failed to generate image:', error);
      setIsDownloading(false);
    }
  };

  const handleCloseAttempt = () => {
    if (!showWarning) {
      setShowWarning(true);
    } else {
      onClose(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in-fast"
      aria-modal="true"
      role="dialog"
      aria-labelledby="summary-title"
    >
      <div className="bg-gradient-to-b from-[#fdfbf7] to-[#e8f5e9] rounded-2xl shadow-lg max-w-md w-full p-6 text-center">
        {/* Header */}
        <p className="text-sm text-[#5a6c5a] mb-1">Monthly Mood Summary</p>
        <h2 id="summary-title" className="text-2xl font-semibold text-[#344e41] mb-6">
          {MONTH_NAMES[data.month]} {data.year}
        </h2>

        {/* Large Emoji */}
        <div className="text-8xl mb-4">
          {data.moodEmoji}
        </div>

        {/* Predominant Mood */}
        <h3 className="text-2xl font-semibold text-[#344e41] mb-4">
          Mostly {data.predominantMood}
        </h3>

        {/* Count Card */}
        <div className="bg-white rounded-xl border border-[#d4e4d4] px-4 py-3 mb-6 shadow-sm">
          <p className="text-[#5a6c5a]">
            Logged <strong className="text-[#344e41]">{data.moodCount}</strong> times out of <strong className="text-[#344e41]">{data.totalEntries}</strong> entries
          </p>
        </div>

        {/* Encouraging Message */}
        <p className="text-[#344e41] italic font-serif text-lg leading-relaxed mb-6 px-2">
          "{data.encouragingMessage}"
        </p>

        {/* Warning Message */}
        {showWarning && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-amber-800">
              <strong>One-time opportunity:</strong> If you close without downloading, you won't be able to get this summary image again.
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full py-3 rounded-xl bg-[#588157] text-white font-medium hover:bg-[#4a6d4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isDownloading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Summary
              </>
            )}
          </button>

          <button
            onClick={handleCloseAttempt}
            className="w-full py-2 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
          >
            {showWarning ? 'Close Anyway' : 'Close'}
          </button>
        </div>
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

export default MonthlySummaryModal;
