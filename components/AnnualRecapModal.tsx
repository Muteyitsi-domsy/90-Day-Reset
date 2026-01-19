import React, { useState } from 'react';
import type { AnnualRecapData } from '../types';
import { generateAnnualRecapImage, downloadImage, getAnnualRecapFilename } from '../services/moodSummaryImageService';
import { getDaysRemainingInWindow } from '../utils/moodSummaryCalculations';
import { ANNUAL_MESSAGE } from '../utils/moodSummaryMessages';

interface AnnualRecapModalProps {
  data: AnnualRecapData;
  onClose: (downloaded: boolean) => void;
  canRedownload: boolean; // True if user already downloaded but is within window
}

const AnnualRecapModal: React.FC<AnnualRecapModalProps> = ({ data, onClose, canRedownload }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const daysRemaining = getDaysRemainingInWindow();

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await generateAnnualRecapImage(data);
      downloadImage(blob, getAnnualRecapFilename(data.year));
      onClose(true);
    } catch (error) {
      console.error('Failed to generate image:', error);
      setIsDownloading(false);
    }
  };

  const handleClose = () => {
    onClose(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in-fast overflow-y-auto"
      aria-modal="true"
      role="dialog"
      aria-labelledby="recap-title"
    >
      <div className="bg-gradient-to-b from-[#fdfbf7] to-[#e8f5e9] rounded-2xl shadow-lg max-w-md w-full p-6 text-center my-4">
        {/* Celebration Header */}
        <div className="text-4xl mb-2">
          <span role="img" aria-label="celebration">&#127881;</span>
        </div>
        <p className="text-sm text-[#5a6c5a] mb-1">Year in Review</p>
        <h2 id="recap-title" className="text-3xl font-bold text-[#344e41] mb-4">
          {data.year}
        </h2>

        {/* Stats Card */}
        <div className="bg-white rounded-xl border border-[#d4e4d4] px-4 py-4 mb-5 shadow-sm">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-bold text-[#588157]">{data.totalEntries}</p>
              <p className="text-xs text-[#5a6c5a]">Entries</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#588157]">{data.longestStreak}</p>
              <p className="text-xs text-[#5a6c5a]">Day Streak</p>
            </div>
            <div>
              <p className="text-lg font-bold text-[#588157]">{data.mostActiveMonth.slice(0, 3)}</p>
              <p className="text-xs text-[#5a6c5a]">Most Active</p>
            </div>
          </div>
        </div>

        {/* Top Moods Section */}
        <div className="text-left mb-5">
          <h3 className="text-lg font-semibold text-[#344e41] mb-3">Your Top Moods</h3>
          <div className="space-y-3">
            {data.topMoods.map((mood, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-2xl w-8">{mood.emoji}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-[#344e41]">{mood.emotion}</span>
                    <span className="text-xs text-[#5a6c5a]">{mood.count} entries</span>
                  </div>
                  <div className="h-3 bg-[#e8f0e8] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#7cb37c] rounded-full transition-all duration-500"
                      style={{ width: `${mood.percentage}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-bold text-[#344e41] w-10 text-right">{mood.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Congratulatory Message */}
        <p className="text-[#344e41] italic font-serif text-lg leading-relaxed mb-4 px-2">
          "{ANNUAL_MESSAGE}"
        </p>

        {/* Days Remaining Indicator */}
        {daysRemaining > 0 && (
          <p className="text-sm text-[#5a6c5a] mb-4">
            {canRedownload ? 'Download available for ' : 'Image available for '}
            <strong>{daysRemaining}</strong> more day{daysRemaining !== 1 ? 's' : ''}
          </p>
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
                {canRedownload ? 'Download Again' : 'Download Recap'}
              </>
            )}
          </button>

          <button
            onClick={handleClose}
            className="w-full py-2 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
          >
            Close
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

export default AnnualRecapModal;
