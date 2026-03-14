import React, { useState } from 'react';
import Confetti from './Confetti';
import { UserProfile, JournalEntry, Settings } from '../types';
import { generateJourneyKeepsake } from '../services/pdfKeepsakeService';

interface KeepsakeWindowProps {
  completionSummary: string;
  userProfile: UserProfile;
  journalEntries: JournalEntry[];
  settings: Settings;
  daysRemaining: number;
  onStartNewJourney: () => void;
  onExport: () => void;
}

interface ReportSection {
  name: string | null;
  content: string;
}

const NAMED_SECTIONS = ['THE BEGINNING', 'THE TERRAIN', 'THE ARC', 'THE THREADS', 'THE MIRRORS', 'THE PRACTICE', 'THE CLOSING'];

function parseReport(text: string): ReportSection[] {
  const lines = text.split('\n');
  const sections: ReportSection[] = [];
  let currentName: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^\*\*([^*]+)\*\*\s*$/);
    if (headerMatch) {
      if (currentLines.join('').trim()) {
        sections.push({ name: currentName, content: currentLines.join('\n').trim() });
      }
      currentName = headerMatch[1].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentLines.join('').trim()) {
    sections.push({ name: currentName, content: currentLines.join('\n').trim() });
  }
  return sections;
}

// Section icons as inline SVG
const SectionIcon: React.FC<{ name: string }> = ({ name }) => {
  const cls = 'w-4 h-4 shrink-0 stroke-amber-600 dark:stroke-amber-400';
  const props = { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (name) {
    case 'THE BEGINNING':
      // Sprout: stem + two leaves
      return (
        <svg className={cls} {...props}>
          <path d="M8 14 V7" />
          <path d="M8 9 C8 9 5 7 5 5 C5 3 7 2 8 4" />
          <path d="M8 9 C8 9 11 7 11 5 C11 3 9 2 8 4" />
        </svg>
      );
    case 'THE TERRAIN':
      // Mountain ridge
      return (
        <svg className={cls} {...props}>
          <path d="M1 13 L6 4 L10 9 L13 6 L15 13" />
        </svg>
      );
    case 'THE ARC':
      // Gentle crescent arc
      return (
        <svg className={cls} {...props}>
          <path d="M3 12 Q8 2 13 12" />
        </svg>
      );
    case 'THE THREADS':
      // Three wavy lines
      return (
        <svg className={cls} {...props}>
          <path d="M2 5 Q5 3 8 5 Q11 7 14 5" />
          <path d="M2 8 Q5 6 8 8 Q11 10 14 8" />
          <path d="M2 11 Q5 9 8 11 Q11 13 14 11" />
        </svg>
      );
    case 'THE MIRRORS':
      // Two overlapping thin circles
      return (
        <svg className={cls} {...props}>
          <circle cx="6" cy="8" r="4" />
          <circle cx="10" cy="8" r="4" />
        </svg>
      );
    case 'THE PRACTICE':
      // Two concentric circles — rhythm, return, daily repetition
      return (
        <svg className={cls} {...props}>
          <circle cx="8" cy="8" r="5.5" />
          <circle cx="8" cy="8" r="2.5" />
        </svg>
      );
    case 'THE CLOSING':
      // 4-point star
      return (
        <svg className={cls} {...props}>
          <path d="M8 2 L8.7 6.5 L13 8 L8.7 9.5 L8 14 L7.3 9.5 L3 8 L7.3 6.5 Z" />
        </svg>
      );
    default:
      return null;
  }
};

const SectionLabel: React.FC<{ name: string }> = ({ name }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-300/50 dark:to-amber-600/30" />
    <SectionIcon name={name} />
    <span className="text-[10px] tracking-[0.2em] uppercase font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap">
      {name}
    </span>
    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-300/50 dark:to-amber-600/30" />
  </div>
);

const MirrorsSection: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n').filter(l => l.trim());
  const blocks: { quote: string; day: string | null }[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    // Detect "Day N:" prefix or quoted line
    const dayMatch = line.match(/^Day\s+(\d+)[:\s–-]\s*(.+)/i);
    const quoteMatch = line.match(/^["'""](.+)["'""]$/);

    if (dayMatch) {
      blocks.push({ day: `Day ${dayMatch[1]}`, quote: dayMatch[2].replace(/^["'""]|["'""]$/g, '') });
    } else if (quoteMatch) {
      // Look ahead for day label
      const nextLine = lines[i + 1]?.trim() ?? '';
      const nextDayMatch = nextLine.match(/^Day\s+(\d+)/i);
      blocks.push({ day: nextDayMatch ? `Day ${nextDayMatch[1]}` : null, quote: quoteMatch[1] });
      if (nextDayMatch) i++;
    } else if (line) {
      blocks.push({ quote: line, day: null });
    }
    i++;
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, idx) => (
        <div key={idx} className="border-l-2 border-amber-400 dark:border-amber-500 pl-4 py-1 bg-amber-50/60 dark:bg-amber-950/20 rounded-r-lg">
          <p className="italic text-stone-700 dark:text-stone-300 text-sm leading-relaxed">
            "{block.quote}"
          </p>
          {block.day && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 tracking-wider uppercase">
              {block.day}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

const ClosingSection: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n').filter(l => l.trim());
  const lastLine = lines[lines.length - 1] ?? '';
  const bodyLines = lines.slice(0, -1);

  return (
    <div className="text-center space-y-3">
      <p className="text-lg text-stone-600 dark:text-stone-400 leading-relaxed font-light">
        {bodyLines.join(' ')}
      </p>
      {lastLine && (
        <p className="text-base text-amber-600 dark:text-amber-400 italic font-light">
          {lastLine}
        </p>
      )}
    </div>
  );
};

const ConsistencyGraph: React.FC<{ entries: JournalEntry[] }> = ({ entries }) => {
  // Only count daily entries (not summaries/hunches)
  const dailyEntries = entries.filter(e => e.type === 'daily');

  // Count entries per week (13 weeks)
  const weekCounts = Array.from({ length: 13 }, (_, i) => {
    const weekNum = i + 1;
    return dailyEntries.filter(e => e.week === weekNum).length;
  });

  const maxCount = Math.max(...weekCounts, 7); // at least 7 so bars have room
  const baseline = 4; // baseline = 4 entries/week

  const width = 300;
  const height = 120;
  const paddingLeft = 28;
  const paddingRight = 8;
  const paddingTop = 8;
  const paddingBottom = 24;
  const graphWidth = width - paddingLeft - paddingRight;
  const graphHeight = height - paddingTop - paddingBottom;
  const barWidth = (graphWidth / 13) * 0.6;
  const gap = (graphWidth / 13) * 0.4;

  const baselineY = paddingTop + graphHeight - (baseline / maxCount) * graphHeight;

  return (
    <div className="bg-white/60 dark:bg-stone-900/40 backdrop-blur-sm rounded-2xl px-5 py-5 border border-amber-100 dark:border-amber-900/30 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-300/50 dark:to-amber-600/30" />
        <span className="text-[10px] tracking-[0.2em] uppercase font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap">
          13 Weeks of Showing Up
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-300/50 dark:to-amber-600/30" />
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ maxHeight: 160 }}
        aria-label="Weekly journal consistency over 13 weeks"
      >
        {/* Baseline */}
        <line
          x1={paddingLeft}
          y1={baselineY}
          x2={width - paddingRight}
          y2={baselineY}
          stroke="#d97706"
          strokeWidth={0.8}
          strokeDasharray="3 3"
          opacity={0.5}
        />
        <text
          x={paddingLeft - 2}
          y={baselineY + 3}
          fontSize={5}
          fill="#d97706"
          opacity={0.7}
          textAnchor="end"
        >
          4
        </text>

        {/* Bars */}
        {weekCounts.map((count, i) => {
          const barHeight = (count / maxCount) * graphHeight;
          const x = paddingLeft + i * (graphWidth / 13) + gap / 2;
          const y = paddingTop + graphHeight - barHeight;
          const isAboveBaseline = count >= baseline;
          return (
            <g key={i}>
              <rect
                x={x}
                y={barHeight > 0 ? y : paddingTop + graphHeight - 1}
                width={barWidth}
                height={Math.max(barHeight, 1)}
                rx={1.5}
                fill={isAboveBaseline ? '#92400e' : '#d6b896'}
                opacity={isAboveBaseline ? 0.75 : 0.35}
                className="dark:opacity-80"
              />
              {/* Week label */}
              <text
                x={x + barWidth / 2}
                y={paddingTop + graphHeight + 10}
                fontSize={5}
                fill="#78716c"
                textAnchor="middle"
              >
                {i + 1}
              </text>
              {/* Count on top if > 0 */}
              {count > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 2}
                  fontSize={4.5}
                  fill="#92400e"
                  textAnchor="middle"
                  opacity={0.8}
                >
                  {count}
                </text>
              )}
            </g>
          );
        })}

        {/* Y-axis label */}
        <text
          x={12}
          y={paddingTop + graphHeight / 2}
          fontSize={5}
          fill="#78716c"
          textAnchor="middle"
          transform={`rotate(-90, 12, ${paddingTop + graphHeight / 2})`}
        >
          entries
        </text>

        {/* X-axis label */}
        <text
          x={width / 2}
          y={height - 2}
          fontSize={5}
          fill="#78716c"
          textAnchor="middle"
        >
          week
        </text>
      </svg>
      <p className="text-[10px] text-stone-400 dark:text-stone-500 text-center mt-1">
        dashed line = 4 entries / week
      </p>
    </div>
  );
};

const KeepsakeWindow: React.FC<KeepsakeWindowProps> = ({
  completionSummary,
  userProfile,
  journalEntries,
  settings,
  // daysRemaining kept for App.tsx compatibility but not displayed
  onStartNewJourney,
  onExport
}) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);

  const handleGenerateKeepsake = async () => {
    setIsGeneratingPDF(true);
    try {
      await generateJourneyKeepsake({
        userProfile,
        journalEntries,
        settings,
        finalSummary: completionSummary
      });
      setHasDownloaded(true);
    } catch (error) {
      console.error('Error generating PDF keepsake:', error);
      alert('There was an error generating your keepsake. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const NAMED_SECTIONS = ['THE BEGINNING', 'THE TERRAIN', 'THE ARC', 'THE THREADS', 'THE MIRRORS', 'THE PRACTICE', 'THE CLOSING'];

  const sections = parseReport(completionSummary);
  // The personalized title is emitted by the AI as a **bold header** line,
  // so it lands in section.name (not content). Find the first section whose
  // name isn't one of the six known section headers — that's the title.
  const titleSection = sections.find(s => s.name !== null && !NAMED_SECTIONS.includes(s.name));
  const namedSections = sections.filter(s => s.name !== null && NAMED_SECTIONS.includes(s.name));

  return (
    <div className="min-h-screen overflow-y-auto bg-gradient-to-b from-amber-50 via-stone-50 to-amber-100 dark:from-stone-950 dark:via-amber-950/10 dark:to-stone-950">
      <Confetti numberOfPieces={150} recycle={false} />

      <div className="max-w-lg mx-auto md:max-w-2xl px-5 md:px-8 pb-16">

        {/* Hero Section */}
        <div className="text-center pt-12 pb-8">
          <span className="inline-block px-3 py-1 text-xs tracking-[0.15em] uppercase font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-full mb-6">
            Journey Complete
          </span>

          {titleSection ? (
            <h1 className="text-2xl sm:text-3xl font-light text-stone-800 dark:text-stone-100 leading-snug mb-3">
              {titleSection.name}
            </h1>
          ) : (
            <h1 className="text-2xl sm:text-3xl font-light text-stone-800 dark:text-stone-100 leading-snug mb-3">
              Your 90-Day Journey
            </h1>
          )}

          <p className="text-sm text-stone-500 dark:text-stone-400 tracking-wide">
            90 days. Shown up for yourself.
          </p>
        </div>

        {/* Slim download reminder */}
        <div className="mb-6 px-4 py-2.5 bg-amber-100/80 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v8m0 0l-3-3m3 3l3-3M3 13h10" />
          </svg>
          <p className="text-xs text-amber-800 dark:text-amber-300">
            Download your keepsake before starting a new journey.
          </p>
        </div>

        {/* Report Sections */}
        <div className="space-y-8 mb-8">
          {namedSections.map((section, idx) => {
            const sectionName = section.name!;
            const isKnown = NAMED_SECTIONS.includes(sectionName);

            return (
              <div key={idx} className="bg-white/60 dark:bg-stone-900/40 backdrop-blur-sm rounded-2xl px-5 py-5 border border-amber-100 dark:border-amber-900/30 shadow-sm">
                {isKnown ? (
                  <SectionLabel name={sectionName} />
                ) : (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-300/50" />
                    <span className="text-[10px] tracking-[0.2em] uppercase font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap">
                      {sectionName}
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-300/50" />
                  </div>
                )}

                {sectionName === 'THE MIRRORS' ? (
                  <MirrorsSection content={section.content} />
                ) : sectionName === 'THE CLOSING' ? (
                  <ClosingSection content={section.content} />
                ) : (
                  <p className="text-sm sm:text-base leading-relaxed text-stone-700 dark:text-stone-300 font-light">
                    {section.content}
                  </p>
                )}

                {sectionName === 'THE PRACTICE' && (
                  <div className="mt-5">
                    <ConsistencyGraph entries={journalEntries} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mood Journal note */}
        <div className="mb-8 px-4 py-3.5 bg-stone-100/80 dark:bg-stone-800/40 rounded-xl border border-stone-200 dark:border-stone-700">
          <p className="text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
            Your Mood Journal &amp; Flip Journal continue
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-500 leading-relaxed">
            Your mood and flip journal entries are preserved across journeys. Continue using them anytime, or start a fresh 90-day transformation when you're ready.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={handleGenerateKeepsake}
            disabled={isGeneratingPDF}
            className="w-full max-w-xs bg-amber-600 hover:bg-amber-700 text-white px-6 py-3.5 rounded-xl font-medium shadow-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingPDF ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </span>
            ) : (
              'Download Journey Keepsake'
            )}
          </button>

          {hasDownloaded && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Keepsake downloaded successfully.
            </p>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={onStartNewJourney}
              className="border border-amber-500 text-amber-700 dark:text-amber-400 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            >
              Start New Journey
            </button>
            <button
              onClick={onExport}
              className="border border-stone-300 dark:border-stone-600 text-stone-500 dark:text-stone-400 px-5 py-2.5 rounded-lg text-sm hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors"
            >
              Export Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeepsakeWindow;
