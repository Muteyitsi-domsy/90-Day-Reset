import React, { useState } from 'react';
import type { AnnualRecapData, MoodContext } from '../types';
import { generateAnnualRecapImage, generateCategoryRecapImage, downloadImage, getAnnualRecapFilename, getCategoryRecapFilename } from '../services/moodSummaryImageService';
import { getDaysRemainingInWindow } from '../utils/moodSummaryCalculations';
import { ANNUAL_MESSAGE } from '../utils/moodSummaryMessages';

// Category labels for display
const CATEGORY_LABELS: Record<MoodContext, string> = {
  career: 'Career',
  family: 'Family',
  romantic: 'Romance',
  friendships: 'Friendships',
  physical_health: 'Physical Health',
  mental_health: 'Mental Health',
  spirituality: 'Spirituality',
};

// Category icons/emojis
const CATEGORY_ICONS: Record<MoodContext, string> = {
  career: '💼',
  family: '👨‍👩‍👧‍👦',
  romantic: '❤️',
  friendships: '👥',
  physical_health: '🏃',
  mental_health: '🧠',
  spirituality: '🙏',
};

type ViewMode = 'overview' | MoodContext;

interface AnnualRecapModalProps {
  data: AnnualRecapData;
  onClose: (downloaded: boolean) => void;
  canRedownload: boolean;
}

const AnnualRecapModal: React.FC<AnnualRecapModalProps> = ({ data, onClose, canRedownload }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const daysRemaining = getDaysRemainingInWindow();

  // Get categories that have entries
  const categoriesWithEntries = (Object.keys(data.moodsByCategory) as MoodContext[])
    .filter(cat => data.moodsByCategory[cat].totalEntries > 0);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      let blob: Blob;
      let filename: string;

      if (viewMode === 'overview') {
        blob = await generateAnnualRecapImage(data);
        filename = getAnnualRecapFilename(data.year);
      } else {
        const categoryData = data.moodsByCategory[viewMode];
        blob = await generateCategoryRecapImage(data.year, viewMode, categoryData, data.totalEntries);
        filename = getCategoryRecapFilename(data.year, viewMode);
      }

      downloadImage(blob, filename);
      // Don't close on category downloads - user might want to download more
      if (viewMode === 'overview') {
        onClose(true);
      } else {
        setIsDownloading(false);
      }
    } catch (error) {
      console.error('Failed to generate image:', error);
      setIsDownloading(false);
    }
  };

  const handleClose = () => {
    onClose(false);
  };

  const currentMoods = viewMode === 'overview'
    ? data.topMoods
    : data.moodsByCategory[viewMode]?.topMoods || [];

  const currentEntries = viewMode === 'overview'
    ? data.totalEntries
    : data.moodsByCategory[viewMode]?.totalEntries || 0;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in-fast overflow-y-auto"
      aria-modal="true"
      role="dialog"
      aria-labelledby="recap-title"
    >
      <div className="bg-gradient-to-b from-[#fdfbf7] to-[#e8f5e9] rounded-2xl shadow-lg max-w-md w-full p-6 text-center my-4 max-h-[90vh] overflow-y-auto">
        {/* Celebration Header */}
        <div className="text-4xl mb-2">
          {viewMode === 'overview' ? (
            <span role="img" aria-label="celebration">🎉</span>
          ) : (
            <span role="img" aria-label={CATEGORY_LABELS[viewMode]}>{CATEGORY_ICONS[viewMode]}</span>
          )}
        </div>
        <p className="text-sm text-[#5a6c5a] mb-1">
          {viewMode === 'overview' ? 'Year in Review' : `${CATEGORY_LABELS[viewMode]} - Year in Review`}
        </p>
        <h2 id="recap-title" className="text-3xl font-bold text-[#344e41] mb-4">
          {data.year}
        </h2>

        {/* Stats Card - Only show on overview */}
        {viewMode === 'overview' && (
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
        )}

        {/* Category entry count for category views */}
        {viewMode !== 'overview' && (
          <div className="bg-white rounded-xl border border-[#d4e4d4] px-4 py-3 mb-5 shadow-sm">
            <p className="text-[#5a6c5a]">
              <strong className="text-[#344e41]">{currentEntries}</strong> entries in {CATEGORY_LABELS[viewMode]}
            </p>
          </div>
        )}

        {/* View Toggle Tabs */}
        <div className="mb-5">
          <div className="flex flex-wrap gap-2 justify-center">
            {/* Overview Tab */}
            <button
              onClick={() => setViewMode('overview')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                viewMode === 'overview'
                  ? 'bg-[#588157] text-white'
                  : 'bg-white border border-[#d4e4d4] text-[#5a6c5a] hover:bg-[#e8f5e9]'
              }`}
            >
              All Categories
            </button>

            {/* Category Tabs */}
            {categoriesWithEntries.map((category) => (
              <button
                key={category}
                onClick={() => setViewMode(category)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  viewMode === category
                    ? 'bg-[#588157] text-white'
                    : 'bg-white border border-[#d4e4d4] text-[#5a6c5a] hover:bg-[#e8f5e9]'
                }`}
              >
                {CATEGORY_ICONS[category]} {CATEGORY_LABELS[category].split(' ')[0]}
              </button>
            ))}
          </div>
          {categoriesWithEntries.length === 0 && viewMode !== 'overview' && (
            <p className="text-sm text-[#5a6c5a] mt-2 italic">No category data available</p>
          )}
        </div>

        {/* Top Moods Section */}
        <div className="text-left mb-5">
          <h3 className="text-lg font-semibold text-[#344e41] mb-3">
            {viewMode === 'overview' ? 'Top 5 Moods' : `Top Moods in ${CATEGORY_LABELS[viewMode]}`}
          </h3>
          {currentMoods.length > 0 ? (
            <div className="space-y-3">
              {currentMoods.map((mood, index) => (
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
          ) : (
            <p className="text-sm text-[#5a6c5a] italic text-center py-4">
              No entries in this category for {data.year}
            </p>
          )}
        </div>

        {/* Congratulatory Message - Only on overview */}
        {viewMode === 'overview' && (
          <p className="text-[#344e41] italic font-serif text-lg leading-relaxed mb-4 px-2">
            "{ANNUAL_MESSAGE}"
          </p>
        )}

        {/* Days Remaining Indicator */}
        {daysRemaining > 0 && viewMode === 'overview' && (
          <p className="text-sm text-[#5a6c5a] mb-4">
            {canRedownload ? 'Download available for ' : 'Image available for '}
            <strong>{daysRemaining}</strong> more day{daysRemaining !== 1 ? 's' : ''}
          </p>
        )}

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleDownload}
            disabled={isDownloading || (viewMode !== 'overview' && currentMoods.length === 0)}
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
                {viewMode === 'overview'
                  ? (canRedownload ? 'Download Again' : 'Download Recap')
                  : `Download ${CATEGORY_LABELS[viewMode]} Recap`
                }
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
