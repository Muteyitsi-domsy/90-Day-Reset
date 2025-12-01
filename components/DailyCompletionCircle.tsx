import React from 'react';

interface DailyCompletionCircleProps {
  ritualCompleted: boolean;
  morningEntryCompleted: boolean;
  eveningCheckinCompleted: boolean;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

const DailyCompletionCircle: React.FC<DailyCompletionCircleProps> = ({
  ritualCompleted,
  morningEntryCompleted,
  eveningCheckinCompleted,
  size = 'medium',
  showLabel = false,
}) => {
  // Circle dimensions based on size
  const dimensions = {
    small: { size: 32, stroke: 4, radius: 14 },
    medium: { size: 48, stroke: 6, radius: 21 },
    large: { size: 64, stroke: 8, radius: 28 },
  };

  const { size: circleSize, stroke, radius } = dimensions[size];
  const circumference = 2 * Math.PI * radius;

  // Each segment is 1/3 of the circle (120 degrees)
  const segmentLength = circumference / 3;

  // Colors for each activity
  const colors = {
    ritual: '#8b5cf6',      // Purple - spiritual/meditation
    morning: '#f59e0b',     // Amber - energetic/morning
    evening: '#14b8a6',     // Teal - calm/reflective
    inactive: '#d1d5db',    // Gray - incomplete (light mode)
    inactiveDark: '#4b5563' // Gray - incomplete (dark mode)
  };

  // Calculate completion percentage
  const completedCount = [ritualCompleted, morningEntryCompleted, eveningCheckinCompleted].filter(Boolean).length;
  const completionPercentage = Math.round((completedCount / 3) * 100);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: circleSize, height: circleSize }}>
        <svg
          width={circleSize}
          height={circleSize}
          viewBox={`0 0 ${circleSize} ${circleSize}`}
          className="transform -rotate-90"
        >
          {/* Background circle (inactive state) */}
          <circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-gray-300 dark:text-gray-600"
          />

          {/* Segment 1: Daily Ritual (top, 0-120 degrees) */}
          <circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            fill="none"
            stroke={ritualCompleted ? colors.ritual : 'transparent'}
            strokeWidth={stroke}
            strokeDasharray={`${segmentLength} ${circumference}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            className="transition-all duration-500"
          />

          {/* Segment 2: Morning Entry (120-240 degrees) */}
          <circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            fill="none"
            stroke={morningEntryCompleted ? colors.morning : 'transparent'}
            strokeWidth={stroke}
            strokeDasharray={`${segmentLength} ${circumference}`}
            strokeDashoffset={-segmentLength}
            strokeLinecap="round"
            className="transition-all duration-500"
          />

          {/* Segment 3: Evening Checkin (240-360 degrees) */}
          <circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            fill="none"
            stroke={eveningCheckinCompleted ? colors.evening : 'transparent'}
            strokeWidth={stroke}
            strokeDasharray={`${segmentLength} ${circumference}`}
            strokeDashoffset={-segmentLength * 2}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>

        {/* Center completion percentage */}
        {size !== 'small' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-[var(--text-primary)]">
              {completionPercentage}%
            </span>
          </div>
        )}
      </div>

      {/* Optional label */}
      {showLabel && (
        <div className="text-center">
          <div className="text-xs font-medium text-[var(--text-primary)]">
            {completedCount}/3 Complete
          </div>
          <div className="text-[10px] text-[var(--text-secondary)] mt-1 space-y-0.5">
            <div className="flex items-center gap-1 justify-center">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: ritualCompleted ? colors.ritual : colors.inactive }}
              />
              <span>Daily Ritual</span>
            </div>
            <div className="flex items-center gap-1 justify-center">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: morningEntryCompleted ? colors.morning : colors.inactive }}
              />
              <span>Morning Entry</span>
            </div>
            <div className="flex items-center gap-1 justify-center">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: eveningCheckinCompleted ? colors.evening : colors.inactive }}
              />
              <span>Evening Check-in</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyCompletionCircle;
