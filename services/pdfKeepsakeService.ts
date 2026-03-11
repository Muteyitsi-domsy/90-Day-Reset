import { jsPDF } from 'jspdf';
import { UserProfile, JournalEntry, Settings, HunchType } from '../types';

interface KeepsakeData {
    userProfile: UserProfile;
    journalEntries: JournalEntry[];
    settings: Settings;
    finalSummary: string;
}

interface ReportSection {
    name: string | null;
    content: string;
}

const NAMED_SECTIONS = [
    'THE BEGINNING', 'THE TERRAIN', 'THE ARC',
    'THE THREADS', 'THE MIRRORS', 'THE PRACTICE', 'THE CLOSING'
];

function parseReportSections(text: string): ReportSection[] {
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

export async function generateJourneyKeepsake(data: KeepsakeData): Promise<void> {
    const { userProfile, journalEntries, settings, finalSummary } = data;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageWidth  = doc.internal.pageSize.getWidth();   // 210mm
    const pageHeight = doc.internal.pageSize.getHeight();  // 297mm
    const margin = 22;
    const contentWidth = pageWidth - (margin * 2);         // 166mm
    let yPosition = margin;

    // ── Amber / stone palette ────────────────────────────────────────────────
    const c = {
        amber:      [217, 119,   6] as [number, number, number], // amber-600
        amberDark:  [180,  83,   9] as [number, number, number], // amber-700
        amberLight: [251, 191,  36] as [number, number, number], // amber-400
        amberBand:  [253, 230, 138] as [number, number, number], // amber-200
        amberPale:  [255, 251, 235] as [number, number, number], // amber-50
        stone:      [ 41,  37,  36] as [number, number, number], // stone-800
        stoneMid:   [ 87,  83,  78] as [number, number, number], // stone-600
        stoneLight: [168, 162, 158] as [number, number, number], // stone-400
        stonePale:  [245, 245, 244] as [number, number, number], // stone-100
    };

    // ── Core helpers ─────────────────────────────────────────────────────────

    const addNewPage = () => { doc.addPage(); yPosition = margin; };

    const checkPageBreak = (needed: number) => {
        // Reserve 18mm at bottom for footer clearance
        if (yPosition + needed > pageHeight - 18) { addNewPage(); return true; }
        return false;
    };

    const addSpacer = (h: number) => { yPosition += h; };

    /**
     * Core text renderer. Wraps text, checks page breaks, positions correctly.
     * Returns the rendered height (mm).
     */
    const addText = (
        text: string,
        fontSize: number,
        color: [number, number, number],
        opts: {
            align?: 'left' | 'center' | 'right';
            style?: 'normal' | 'bold' | 'italic' | 'bolditalic';
            width?: number;
            lh?: number;   // line height factor
            gap?: number;  // trailing gap after text (default 2)
        } = {}
    ): number => {
        const { align = 'left', style = 'normal', width = contentWidth, lh = 1.55, gap = 2 } = opts;

        doc.setFontSize(fontSize);
        doc.setTextColor(...color);
        doc.setFont('helvetica', style);

        const lines = doc.splitTextToSize(text, width);
        const h = lines.length * fontSize * 0.352778 * lh;
        checkPageBreak(h + gap);

        const x = align === 'center' ? pageWidth / 2 : align === 'right' ? pageWidth - margin : margin;
        doc.text(lines, x, yPosition, { align, lineHeightFactor: lh });
        yPosition += h + gap;
        return h;
    };

    /**
     * Reusable content-page header: 3mm amber stripe → 27mm stone-100 band
     * → thin amber rule. Sets yPosition ready for body content at ~38mm.
     */
    const addContentPageHeader = (title: string, subtitle?: string) => {
        doc.setFillColor(...c.amber);
        doc.rect(0, 0, pageWidth, 3, 'F');

        doc.setFillColor(...c.stonePale);
        doc.rect(0, 3, pageWidth, 27, 'F');

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...c.stone);
        doc.text(title, pageWidth / 2, subtitle ? 15 : 20, { align: 'center' });

        if (subtitle) {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...c.stoneLight);
            doc.text(subtitle, pageWidth / 2, 25, { align: 'center' });
        }

        doc.setDrawColor(...c.amberLight);
        doc.setLineWidth(0.3);
        doc.line(margin, 30, pageWidth - margin, 30);

        yPosition = 38;
    };

    /**
     * Decorative section divider for the summary page:
     *   ─────── THE BEGINNING ───────
     */
    const addSectionDivider = (name: string) => {
        checkPageBreak(14);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...c.amberDark);

        const tw = doc.getTextWidth(name);
        const cx = pageWidth / 2;
        const ly = yPosition + 3;

        doc.setDrawColor(...c.amberLight);
        doc.setLineWidth(0.3);
        doc.line(margin, ly, cx - tw / 2 - 4, ly);
        doc.text(name, cx, yPosition + 4, { align: 'center' });
        doc.line(cx + tw / 2 + 4, ly, pageWidth - margin, ly);

        yPosition += 12;
    };

    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // ── COVER PAGE ───────────────────────────────────────────────────────────

    // Amber header band
    doc.setFillColor(...c.amberBand);
    doc.rect(0, 0, pageWidth, 22, 'F');
    doc.setFillColor(...c.amber);
    doc.rect(0, 0, pageWidth, 3, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...c.amberDark);
    doc.text('JOURNEY COMPLETE', pageWidth / 2, 14, { align: 'center' });

    // Amber footer band
    doc.setFillColor(...c.amber);
    doc.rect(0, pageHeight - 5, pageWidth, 5, 'F');

    // Center block at optical center (~38% from top)
    yPosition = pageHeight * 0.34;

    addText('90-Day Identity Reset', 26, c.stone, { align: 'center', style: 'bold', gap: 3 });
    addText('Journey Keepsake', 13, c.stoneLight, { align: 'center', gap: 0 });

    addSpacer(24);

    addText(userProfile.name, 20, c.stone, { align: 'center', style: 'bold', gap: 5 });

    const arcLabels: Record<string, string> = {
        release: 'The Release Arc', reaffirm: 'The Reaffirm Arc', reignition: 'The Reignition Arc'
    };
    addText(arcLabels[userProfile.arc] ?? userProfile.arc, 12, c.amber, { align: 'center', style: 'italic', gap: 4 });

    const startDate = formatDate(userProfile.startDate);
    const endDate   = formatDate(new Date().toISOString());
    addText(`${startDate} — ${endDate}`, 9.5, c.stoneLight, { align: 'center', gap: 0 });

    addSpacer(20);

    doc.setDrawColor(...c.amberLight);
    doc.setLineWidth(0.4);
    doc.line(margin + 28, yPosition, pageWidth - margin - 28, yPosition);
    addSpacer(7);

    addText('90 days. Shown up for yourself.', 9, c.stoneLight, { align: 'center', style: 'italic' });

    // ── FOUNDATION PAGE (Intention + Manifesto) ──────────────────────────────

    addNewPage();
    addContentPageHeader('The Foundation');

    if (userProfile.intentions) {
        addText('My Intention', 14, c.amberDark, { style: 'bold', gap: 5 });
        addText(`"${userProfile.intentions}"`, 11, c.stoneMid, { style: 'italic', lh: 1.7, gap: 0 });
        addSpacer(12);

        doc.setDrawColor(...c.amberLight);
        doc.setLineWidth(0.3);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        addSpacer(12);
    }

    if (userProfile.idealSelfManifesto) {
        addText('Ideal Self Manifesto', 14, c.amberDark, { style: 'bold', gap: 5 });
        addText(userProfile.idealSelfManifesto, 11, c.stone, { lh: 1.7 });
    }

    // ── Prepare entry data (used later, after the AI report) ────────────────

    const dailyEntries = journalEntries
        .filter(e => e.type === 'daily')
        .sort((a, b) => a.day - b.day);

    const weeklyReports = journalEntries
        .filter(e => e.type === 'weekly_summary_report')
        .sort((a, b) => a.day - b.day);

    const monthlyReports = journalEntries
        .filter(e => e.type === 'monthly_summary_report')
        .sort((a, b) => a.day - b.day);

    const months = [
        { name: 'Month One',   sub: 'Days 1–30',  entries: dailyEntries.filter(e => e.day <= 30) },
        { name: 'Month Two',   sub: 'Days 31–60', entries: dailyEntries.filter(e => e.day > 30 && e.day <= 60) },
        { name: 'Month Three', sub: 'Days 61–90', entries: dailyEntries.filter(e => e.day > 60) }
    ];

    // ── FINAL SUMMARY (AI Report — comes right after Foundation) ─────────────

    addNewPage();

    // Summary page header uses amber band (not stone-100 — this page feels different)
    doc.setFillColor(...c.amberBand);
    doc.rect(0, 0, pageWidth, 22, 'F');
    doc.setFillColor(...c.amber);
    doc.rect(0, 0, pageWidth, 3, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...c.amberDark);
    doc.text('YOUR JOURNEY', pageWidth / 2, 14, { align: 'center' });

    doc.setDrawColor(...c.amberLight);
    doc.setLineWidth(0.3);
    doc.line(margin, 22, pageWidth - margin, 22);

    yPosition = 30;

    const sections = parseReportSections(finalSummary);
    const titleSection = sections.find(s => s.name !== null && !NAMED_SECTIONS.includes(s.name));
    const namedSections = sections.filter(s => s.name !== null && NAMED_SECTIONS.includes(s.name));

    // Personalized title
    if (titleSection) {
        addText(titleSection.name!, 20, c.stone, { align: 'center', style: 'bold', lh: 1.3, gap: 5 });
    } else {
        addText('Your 90-Day Journey', 20, c.stone, { align: 'center', style: 'bold', gap: 5 });
    }

    doc.setDrawColor(...c.amberLight);
    doc.setLineWidth(0.4);
    doc.line(margin + 18, yPosition, pageWidth - margin - 18, yPosition);
    addSpacer(12);

    // Render each section
    for (const section of namedSections) {
        const name = section.name!;

        checkPageBreak(22);
        addSectionDivider(name);

        if (name === 'THE MIRRORS') {
            const mirrorLines = section.content.split('\n').filter(l => l.trim());

            for (const line of mirrorLines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                const dayMatch = trimmed.match(/^Day\s+(\d+)[:\s\u2013-]\s*(.+)/i);
                const isQuote = dayMatch
                    || trimmed.startsWith('"')
                    || trimmed.startsWith('\u201c');

                if (isQuote) {
                    let quoteText = '';
                    let dayLabel = '';

                    if (dayMatch) {
                        dayLabel   = `DAY ${dayMatch[1]}`;
                        quoteText  = dayMatch[2].replace(/^["\u201c]|["\u201d]$/g, '').trim();
                    } else {
                        quoteText = trimmed.replace(/^["\u201c]|["\u201d]$/g, '').trim();
                    }

                    // Measure the quote block
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'italic');
                    const quoteW = contentWidth - 12;
                    const qLines = doc.splitTextToSize(`"${quoteText}"`, quoteW);
                    const qTextH = qLines.length * 10 * 0.352778 * 1.5;
                    const blockH = qTextH + (dayLabel ? 7 : 0) + 7; // top + bottom padding

                    checkPageBreak(blockH + 5);

                    const rectY = yPosition - 1.5;

                    // Pale amber fill
                    doc.setFillColor(...c.amberPale);
                    doc.rect(margin + 2, rectY, contentWidth - 2, blockH, 'F');

                    // Amber left border
                    doc.setDrawColor(...c.amber);
                    doc.setLineWidth(0.9);
                    doc.line(margin + 2, rectY, margin + 2, rectY + blockH);

                    // Quote text
                    doc.setTextColor(...c.stoneMid);
                    doc.text(qLines, margin + 9, yPosition + 3, { lineHeightFactor: 1.5 });
                    yPosition += qTextH + 4;

                    // Day label
                    if (dayLabel) {
                        doc.setFontSize(7);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(...c.amber);
                        doc.text(dayLabel, margin + 9, yPosition);
                        yPosition += 5;
                    }

                    addSpacer(4); // gap between quote cards

                } else {
                    addText(trimmed, 10, c.stone, { lh: 1.5 });
                }
            }

        } else if (name === 'THE CLOSING') {
            // Centered body; last line amber italic
            const closingLines = section.content.split('\n').filter(l => l.trim());
            const lastLine  = closingLines.at(-1) ?? '';
            const bodyText  = closingLines.slice(0, -1).join(' ');

            if (bodyText) {
                addText(bodyText, 11, c.stoneMid, { align: 'center', lh: 1.75, width: contentWidth - 20, gap: 5 });
            }
            if (lastLine) {
                // Closing line: slightly indented from edges, amber italic
                addText(lastLine, 12, c.amber, { align: 'center', style: 'italic', lh: 1.6, width: contentWidth - 20 });
            }

        } else {
            addText(section.content, 10.5, c.stone, { lh: 1.65 });
        }

        addSpacer(11);
    }

    // ── CLOSING PAGE ─────────────────────────────────────────────────────────

    addNewPage();

    doc.setFillColor(...c.amberBand);
    doc.rect(0, 0, pageWidth, 8, 'F');
    doc.setFillColor(...c.amber);
    doc.rect(0, 0, pageWidth, 3, 'F');

    doc.setFillColor(...c.amber);
    doc.rect(0, pageHeight - 5, pageWidth, 5, 'F');

    yPosition = pageHeight / 3;

    addText('Thank you for showing up', 17, c.stone, { align: 'center', style: 'italic', gap: 5 });
    addText('for yourself, every day.', 17, c.stone, { align: 'center', style: 'italic', gap: 0 });

    addSpacer(20);

    doc.setDrawColor(...c.amberLight);
    doc.setLineWidth(0.45);
    doc.line(margin + 28, yPosition, pageWidth - margin - 28, yPosition);

    addSpacer(10);
    addText('90-Day Identity Reset', 8.5, c.stoneLight, { align: 'center' });

    // ── COMPLETE RECORD DIVIDER ──────────────────────────────────────────────
    // Separator page between the curated report and the full entry archive

    const hasEntries  = dailyEntries.length > 0 || weeklyReports.length > 0 || monthlyReports.length > 0;
    const hasHunches  = settings.includeHunchesInFinalSummary && journalEntries.some(
        e => e.type === 'hunch' && (settings.finalSummaryIncludedTypes || ['insight','dream','hunch']).includes(e.hunchType || 'hunch')
    );

    if (hasEntries || hasHunches) {
        addNewPage();

        // Full amber-banded divider page
        doc.setFillColor(...c.amberBand);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        doc.setFillColor(...c.amber);
        doc.rect(0, 0, pageWidth, 4, 'F');
        doc.setFillColor(...c.amber);
        doc.rect(0, pageHeight - 4, pageWidth, 4, 'F');

        yPosition = pageHeight / 2 - 16;

        doc.setDrawColor(...c.amber);
        doc.setLineWidth(0.4);
        doc.line(margin + 20, yPosition, pageWidth - margin - 20, yPosition);
        addSpacer(8);

        addText('Your Complete Journey', 20, c.amberDark, { align: 'center', style: 'bold', gap: 4 });
        addText('Every entry. Every week. Every insight.', 10, c.amber, { align: 'center', style: 'italic', gap: 0 });

        addSpacer(8);
        doc.setDrawColor(...c.amber);
        doc.line(margin + 20, yPosition, pageWidth - margin - 20, yPosition);

        // ── JOURNAL ENTRIES BY MONTH ─────────────────────────────────────────

        for (const month of months) {
            if (month.entries.length === 0) continue;

            addNewPage();
            addContentPageHeader(month.name, month.sub);

            for (const entry of month.entries) {
                checkPageBreak(44);

                addText(`Day ${entry.day}`, 12, c.amber, { style: 'bold', gap: 1 });
                addText(formatDate(entry.date), 8, c.stoneLight, { gap: 3 });

                // Full entry — no truncation
                addText(entry.rawText, 10, c.stone, { lh: 1.5 });

                if (entry.analysis?.insights?.length) {
                    addSpacer(2);
                    addText(`Insight: ${entry.analysis.insights[0]}`, 8.5, c.stoneMid, { style: 'italic' });
                }
                if (entry.analysis?.tags?.length) {
                    addText(entry.analysis.tags.join(' · '), 7.5, c.stoneLight, { gap: 0 });
                }

                addSpacer(6);
                doc.setDrawColor(225, 220, 215);
                doc.setLineWidth(0.2);
                doc.line(margin + 14, yPosition, pageWidth - margin - 14, yPosition);
                addSpacer(7);
            }
        }

        // ── WEEKLY REFLECTIONS ────────────────────────────────────────────────
        // Only rendered if weekly AI analysis was enabled and reports exist

        if (weeklyReports.length > 0) {
            addNewPage();
            addContentPageHeader('Weekly Reflections');

            for (const report of weeklyReports) {
                checkPageBreak(50);
                const sd = report.summaryData;
                if (!sd) continue;

                addText(sd.title || `Week ${sd.period}`, 13, c.amber, { style: 'bold', gap: 2 });
                if (sd.dateRange) addText(sd.dateRange, 8, c.stoneLight, { gap: 4 });
                if (sd.synthesis) addText(sd.synthesis, 10, c.stone, { lh: 1.55 });

                if (sd.dominantThemes?.length) {
                    addSpacer(2);
                    addText(`Themes: ${sd.dominantThemes.join(', ')}`, 8.5, c.stoneMid, { style: 'italic' });
                }

                addSpacer(10);
            }
        }

        // ── MONTHLY REFLECTIONS ───────────────────────────────────────────────
        // Only rendered if monthly AI analysis was enabled and reports exist

        if (monthlyReports.length > 0) {
            addNewPage();
            addContentPageHeader('Monthly Reflections');

            for (const report of monthlyReports) {
                checkPageBreak(60);
                const sd = report.summaryData;
                if (!sd) continue;

                addText(sd.title || `Month ${sd.period}`, 13, c.amber, { style: 'bold', gap: 2 });
                if (sd.dateRange) addText(sd.dateRange, 8, c.stoneLight, { gap: 4 });

                if (sd.synthesis) {
                    addText(sd.synthesis, 10, c.stone, { lh: 1.6 });
                }

                if (sd.dominantThemes?.length) {
                    addSpacer(2);
                    addText(`Themes: ${sd.dominantThemes.join(', ')}`, 8.5, c.stoneMid, { style: 'italic' });
                }

                if (sd.recurringThreads?.length) {
                    addSpacer(2);
                    addText(`Threads: ${sd.recurringThreads.join(', ')}`, 8.5, c.stoneMid, { style: 'italic' });
                }

                if (sd.shifts?.length) {
                    addSpacer(2);
                    addText(`Shifts: ${sd.shifts.join(', ')}`, 8.5, c.stoneMid, { style: 'italic' });
                }

                addSpacer(10);
            }
        }

        // ── INTUITIVE INSIGHTS ───────────────────────────────────────────────

        if (settings.includeHunchesInFinalSummary) {
            const included = settings.finalSummaryIncludedTypes || ['insight', 'dream', 'hunch'];
            const hunches = journalEntries
                .filter(e => e.type === 'hunch' && included.includes(e.hunchType || 'hunch'))
                .sort((a, b) => a.day - b.day);

            if (hunches.length > 0) {
                addNewPage();
                addContentPageHeader('Intuitive Insights', 'Dreams, Hunches & Sudden Insights');

                const typeLabels: Record<HunchType, string> = {
                    dream: 'Dream', insight: 'Insight', hunch: 'Hunch'
                };

                for (const h of hunches) {
                    checkPageBreak(32);
                    addText(`${typeLabels[h.hunchType || 'hunch']}  —  Day ${h.day}`, 11, c.amber, { style: 'bold', gap: 3 });
                    addText(h.rawText, 10, c.stone, { lh: 1.5 });
                    addSpacer(9);
                }
            }
        }
    }

    // ── PAGE NUMBERS (interior pages only) ──────────────────────────────────

    const totalPages = doc.getNumberOfPages();
    // Page 1 = cover, last page = closing — skip both
    for (let p = 2; p <= totalPages - 1; p++) {
        doc.setPage(p);

        doc.setDrawColor(...c.stonePale);
        doc.setLineWidth(0.2);
        doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...c.stoneLight);
        doc.text(String(p - 1), pageWidth / 2, pageHeight - 7, { align: 'center' });
    }

    // ── SAVE ─────────────────────────────────────────────────────────────────

    const fileName = `${userProfile.name.replace(/\s+/g, '-')}-90-Day-Journey-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
}
