/**
 * finalReport.spec.ts
 *
 * Tests for the final report (KeepsakeWindow) and its PDF service.
 *
 * Coverage:
 *   1. parseReport() — splits the AI summary into sections by **HEADER** markers.
 *      If this breaks, the entire final report shows as a blank wall of text.
 *   2. Section content and arrangement — sections appear in the correct order,
 *      title is extracted correctly, named sections are separated from the title.
 *   3. Display warning flags — isSparseData, isNoSections, hasMissingReports.
 *      These control whether users see "incomplete report" warnings.
 *   4. Email logic — truncation at 5000 chars, empty address guard,
 *      username fallback when profile name is missing.
 */

import { describe, test, expect } from 'vitest';
import { makeJournalEntry } from './helpers/factories';
import type { JournalEntry } from '../types';

// ─── parseReport — mirrors KeepsakeWindow.tsx (private function) ──────────────

interface ReportSection {
  name: string | null;
  content: string;
}

const NAMED_SECTIONS = [
  'THE BEGINNING', 'THE TERRAIN', 'THE ARC',
  'THE THREADS', 'THE MIRRORS', 'THE PRACTICE', 'THE CLOSING',
];

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

/** Mirrors KeepsakeWindow: first section whose name is not a known section header. */
function extractTitle(sections: ReportSection[]): ReportSection | undefined {
  return sections.find(s => s.name !== null && !NAMED_SECTIONS.includes(s.name));
}

/** Mirrors KeepsakeWindow: sections whose names are in NAMED_SECTIONS, in order. */
function extractNamedSections(sections: ReportSection[]): ReportSection[] {
  return sections.filter(s => s.name !== null && NAMED_SECTIONS.includes(s.name));
}

// ─── Display warning flags — mirrors KeepsakeWindow computed values ───────────

function computeDisplayFlags(journalEntries: JournalEntry[], namedSections: ReportSection[]) {
  const dailyEntries   = journalEntries.filter(e => e.type === 'daily');
  const weeklyReports  = journalEntries.filter(e => e.type === 'weekly_summary_report');
  const monthlyReports = journalEntries.filter(e => e.type === 'monthly_summary_report');
  return {
    isSparseData:       dailyEntries.length > 0 && dailyEntries.length < 15,
    isNoSections:       namedSections.length === 0,
    hasMissingReports:  weeklyReports.length < 13 || monthlyReports.length < 3,
  };
}

// ─── Email helpers — mirrors KeepsakeWindow email logic ──────────────────────

const EMAIL_MAX_CHARS = 5000;

function truncateSummary(summary: string): string {
  if (summary.length <= EMAIL_MAX_CHARS) return summary;
  return summary.slice(0, EMAIL_MAX_CHARS) + '\n\n[Full summary available in your app keepsake]';
}

function resolveEmailUsername(name: string | undefined, email: string): string {
  return name || email.split('@')[0];
}

function isValidEmailRecipient(email: string): boolean {
  return email.trim().length > 0;
}

// ─── A realistic AI summary fixture ──────────────────────────────────────────

const SAMPLE_SUMMARY = `
**Sarah's 90-Day Journey: From Survival to Sovereignty**

Something shifted in these 90 days that can't be easily named.

**THE BEGINNING**

You came in carrying exhaustion you'd normalised as personality.

**THE TERRAIN**

Month one was harder than expected. The resistance was real.

**THE ARC**

By day 45 the patterns became impossible to ignore.

**THE THREADS**

Three threads wove through every entry: rest, trust, and presence.

**THE MIRRORS**

The people around you reflected back exactly what you were becoming.

**THE PRACTICE**

You kept showing up even when the words wouldn't come.

**THE CLOSING**

This is not the end. It is a more honest beginning.
`.trim();

// ─── parseReport — basic behaviour ───────────────────────────────────────────

describe('parseReport — section extraction', () => {
  test('returns empty array for empty string', () => {
    expect(parseReport('')).toHaveLength(0);
  });

  test('returns a single null-named section when there are no headers', () => {
    const sections = parseReport('Just some text without headers.');
    expect(sections).toHaveLength(1);
    expect(sections[0].name).toBeNull();
    expect(sections[0].content).toBe('Just some text without headers.');
  });

  test('parses a single header + content correctly', () => {
    const text = '**THE BEGINNING**\nYou came in carrying exhaustion.';
    const sections = parseReport(text);
    expect(sections).toHaveLength(1);
    expect(sections[0].name).toBe('THE BEGINNING');
    expect(sections[0].content).toBe('You came in carrying exhaustion.');
  });

  test('strips leading/trailing whitespace from section content', () => {
    const text = '**THE ARC**\n\n  Some content here  \n\n';
    const sections = parseReport(text);
    expect(sections[0].content).toBe('Some content here');
  });

  test('skips empty sections (header immediately followed by another header)', () => {
    const text = '**THE BEGINNING**\n**THE TERRAIN**\nActual content here.';
    const sections = parseReport(text);
    expect(sections).toHaveLength(1);
    expect(sections[0].name).toBe('THE TERRAIN');
  });

  test('preserves content that appears before the first header (null name)', () => {
    const text = 'Preamble text.\n**THE BEGINNING**\nSection content.';
    const sections = parseReport(text);
    expect(sections).toHaveLength(2);
    expect(sections[0].name).toBeNull();
    expect(sections[0].content).toBe('Preamble text.');
  });

  test('partial **bold** inline text is NOT treated as a section header', () => {
    const text = 'She said **this is important** in passing.\n**THE BEGINNING**\nContent.';
    const sections = parseReport(text);
    // The inline bold is in a content line, not a standalone header line
    const beginning = sections.find(s => s.name === 'THE BEGINNING');
    expect(beginning).toBeDefined();
    // Inline bold line should be in whatever section captures it
    const allContent = sections.map(s => s.content).join('\n');
    expect(allContent).toContain('this is important');
  });
});

// ─── parseReport — content and arrangement ───────────────────────────────────

describe('parseReport — content and arrangement with realistic summary', () => {
  let sections: ReportSection[];

  // Parse once for all tests in this block
  sections = parseReport(SAMPLE_SUMMARY);

  test('extracts all 7 named sections from a full report', () => {
    const named = extractNamedSections(sections);
    expect(named).toHaveLength(7);
  });

  test('sections appear in document order (not shuffled)', () => {
    const named = extractNamedSections(sections);
    const names = named.map(s => s.name);
    expect(names).toEqual([
      'THE BEGINNING', 'THE TERRAIN', 'THE ARC',
      'THE THREADS', 'THE MIRRORS', 'THE PRACTICE', 'THE CLOSING',
    ]);
  });

  test('title section is extracted correctly (first non-standard name)', () => {
    const title = extractTitle(sections);
    expect(title).toBeDefined();
    expect(title!.name).toBe("Sarah's 90-Day Journey: From Survival to Sovereignty");
  });

  test('title section content matches the text after the title header', () => {
    const title = extractTitle(sections);
    expect(title!.content).toContain("Something shifted in these 90 days");
  });

  test('each named section has non-empty content', () => {
    const named = extractNamedSections(sections);
    named.forEach(section => {
      expect(section.content.length).toBeGreaterThan(0);
    });
  });

  test('THE BEGINNING section has correct content', () => {
    const beginning = sections.find(s => s.name === 'THE BEGINNING');
    expect(beginning?.content).toContain('exhaustion');
  });

  test('THE CLOSING section has correct content', () => {
    const closing = sections.find(s => s.name === 'THE CLOSING');
    expect(closing?.content).toContain('honest beginning');
  });

  test('title section is NOT included in named sections list', () => {
    const named = extractNamedSections(sections);
    const titleInNamed = named.find(s => s.name === "Sarah's 90-Day Journey: From Survival to Sovereignty");
    expect(titleInNamed).toBeUndefined();
  });
});

describe('parseReport — malformed or partial summaries', () => {
  test('summary with no named sections → isNoSections warning fires', () => {
    const sections = parseReport('**A Custom Title**\nSome fallback text.');
    const named = extractNamedSections(sections);
    expect(named).toHaveLength(0); // triggers isNoSections warning
  });

  test('only some named sections present — partial report is still parsed', () => {
    const partial = '**THE BEGINNING**\nStarted here.\n**THE CLOSING**\nEnded here.';
    const sections = parseReport(partial);
    const named = extractNamedSections(sections);
    expect(named).toHaveLength(2);
    expect(named.map(s => s.name)).toEqual(['THE BEGINNING', 'THE CLOSING']);
  });
});

// ─── Display warning flags ────────────────────────────────────────────────────

describe('display flags — isSparseData', () => {
  test('0 daily entries → NOT sparse (no data at all)', () => {
    const { isSparseData } = computeDisplayFlags([], []);
    expect(isSparseData).toBe(false);
  });

  test('1 daily entry → sparse (1–14 entries)', () => {
    const entries = Array.from({ length: 1 }, () => makeJournalEntry({ type: 'daily' }));
    const { isSparseData } = computeDisplayFlags(entries, []);
    expect(isSparseData).toBe(true);
  });

  test('14 daily entries → still sparse', () => {
    const entries = Array.from({ length: 14 }, () => makeJournalEntry({ type: 'daily' }));
    const { isSparseData } = computeDisplayFlags(entries, []);
    expect(isSparseData).toBe(true);
  });

  test('15 daily entries → NOT sparse (threshold met)', () => {
    const entries = Array.from({ length: 15 }, () => makeJournalEntry({ type: 'daily' }));
    const { isSparseData } = computeDisplayFlags(entries, []);
    expect(isSparseData).toBe(false);
  });

  test('90 daily entries → NOT sparse (full journey)', () => {
    const entries = Array.from({ length: 90 }, () => makeJournalEntry({ type: 'daily' }));
    const { isSparseData } = computeDisplayFlags(entries, []);
    expect(isSparseData).toBe(false);
  });
});

describe('display flags — isNoSections', () => {
  test('empty named sections → isNoSections true (blank report warning)', () => {
    const { isNoSections } = computeDisplayFlags([], []);
    expect(isNoSections).toBe(true);
  });

  test('at least one named section → isNoSections false', () => {
    const sections = [{ name: 'THE BEGINNING', content: 'content' }];
    const { isNoSections } = computeDisplayFlags([], sections);
    expect(isNoSections).toBe(false);
  });
});

describe('display flags — hasMissingReports', () => {
  test('no weekly or monthly reports → hasMissingReports true', () => {
    const { hasMissingReports } = computeDisplayFlags([], []);
    expect(hasMissingReports).toBe(true);
  });

  test('12 weekly reports (missing 1) → hasMissingReports true', () => {
    const weekly = Array.from({ length: 12 }, () => makeJournalEntry({ type: 'weekly_summary_report' }));
    const monthly = Array.from({ length: 3 }, () => makeJournalEntry({ type: 'monthly_summary_report' }));
    const { hasMissingReports } = computeDisplayFlags([...weekly, ...monthly], []);
    expect(hasMissingReports).toBe(true);
  });

  test('13 weekly + 2 monthly reports → hasMissingReports true (monthly short)', () => {
    const weekly = Array.from({ length: 13 }, () => makeJournalEntry({ type: 'weekly_summary_report' }));
    const monthly = Array.from({ length: 2 }, () => makeJournalEntry({ type: 'monthly_summary_report' }));
    const { hasMissingReports } = computeDisplayFlags([...weekly, ...monthly], []);
    expect(hasMissingReports).toBe(true);
  });

  test('13 weekly + 3 monthly reports → hasMissingReports false (complete)', () => {
    const weekly = Array.from({ length: 13 }, () => makeJournalEntry({ type: 'weekly_summary_report' }));
    const monthly = Array.from({ length: 3 }, () => makeJournalEntry({ type: 'monthly_summary_report' }));
    const { hasMissingReports } = computeDisplayFlags([...weekly, ...monthly], []);
    expect(hasMissingReports).toBe(false);
  });
});

// ─── Email logic ──────────────────────────────────────────────────────────────

describe('email — summary truncation', () => {
  test('summary under 5000 chars passes through unchanged', () => {
    const short = 'A'.repeat(100);
    expect(truncateSummary(short)).toBe(short);
  });

  test('summary exactly 5000 chars passes through unchanged', () => {
    const exact = 'A'.repeat(5000);
    expect(truncateSummary(exact)).toBe(exact);
  });

  test('summary over 5000 chars is truncated with a continuation note', () => {
    const long = 'A'.repeat(6000);
    const result = truncateSummary(long);
    expect(result.startsWith('A'.repeat(5000))).toBe(true);
    expect(result).toContain('[Full summary available in your app keepsake]');
    expect(result.length).toBeLessThan(6000);
  });

  test('truncated summary starts at exactly char 5000', () => {
    const long = 'X'.repeat(5000) + 'Y'.repeat(1000);
    const result = truncateSummary(long);
    expect(result.startsWith('X'.repeat(5000))).toBe(true);
    expect(result).not.toContain('YYYY'); // 'Y' chars after truncation are gone
  });
});

describe('email — address validation', () => {
  test('non-empty address is valid', () => {
    expect(isValidEmailRecipient('user@example.com')).toBe(true);
  });

  test('empty string is invalid — button should be disabled', () => {
    expect(isValidEmailRecipient('')).toBe(false);
  });

  test('whitespace-only string is invalid', () => {
    expect(isValidEmailRecipient('   ')).toBe(false);
  });
});

describe('email — username resolution', () => {
  test('uses profile name when available', () => {
    expect(resolveEmailUsername('Sarah', 'sarah@example.com')).toBe('Sarah');
  });

  test('falls back to email prefix when name is missing', () => {
    expect(resolveEmailUsername(undefined, 'sarah@example.com')).toBe('sarah');
  });

  test('falls back to email prefix when name is empty string', () => {
    expect(resolveEmailUsername('', 'sarah@example.com')).toBe('sarah');
  });
});
