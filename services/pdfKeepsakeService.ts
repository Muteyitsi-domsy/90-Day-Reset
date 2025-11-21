import { jsPDF } from 'jspdf';
import { UserProfile, JournalEntry, Settings, HunchType } from '../types';

interface KeepsakeData {
    userProfile: UserProfile;
    journalEntries: JournalEntry[];
    settings: Settings;
    finalSummary: string;
}

export async function generateJourneyKeepsake(data: KeepsakeData): Promise<void> {
    const { userProfile, journalEntries, settings, finalSummary } = data;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPosition = margin;

    // Color palette
    const colors = {
        primary: [16, 185, 129] as [number, number, number],      // emerald-500
        secondary: [107, 114, 128] as [number, number, number],   // gray-500
        text: [31, 41, 55] as [number, number, number],           // gray-800
        lightText: [107, 114, 128] as [number, number, number],   // gray-500
        accent: [5, 150, 105] as [number, number, number],        // emerald-600
    };

    // Helper functions
    const addNewPage = () => {
        doc.addPage();
        yPosition = margin;
    };

    const checkPageBreak = (neededHeight: number) => {
        if (yPosition + neededHeight > pageHeight - margin) {
            addNewPage();
            return true;
        }
        return false;
    };

    const addText = (text: string, fontSize: number, color: [number, number, number], options: {
        align?: 'left' | 'center' | 'right',
        fontStyle?: 'normal' | 'bold' | 'italic',
        maxWidth?: number,
        lineHeight?: number
    } = {}) => {
        const { align = 'left', fontStyle = 'normal', maxWidth = contentWidth, lineHeight = 1.5 } = options;

        doc.setFontSize(fontSize);
        doc.setTextColor(...color);
        doc.setFont('helvetica', fontStyle);

        const lines = doc.splitTextToSize(text, maxWidth);
        const textHeight = lines.length * fontSize * 0.352778 * lineHeight;

        checkPageBreak(textHeight);

        let xPos = margin;
        if (align === 'center') xPos = pageWidth / 2;
        else if (align === 'right') xPos = pageWidth - margin;

        doc.text(lines, xPos, yPosition, { align, lineHeightFactor: lineHeight });
        yPosition += textHeight + 2;

        return textHeight;
    };

    const addSpacer = (height: number) => {
        yPosition += height;
    };

    const addHorizontalLine = () => {
        doc.setDrawColor(...colors.secondary);
        doc.setLineWidth(0.3);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 5;
    };

    // Format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // ===== COVER PAGE =====
    yPosition = pageHeight / 3;

    addText('90-Day Identity Reset', 28, colors.primary, { align: 'center', fontStyle: 'bold' });
    addSpacer(5);
    addText('Journey Keepsake', 16, colors.secondary, { align: 'center' });

    addSpacer(30);

    addText(userProfile.name, 20, colors.text, { align: 'center', fontStyle: 'bold' });
    addSpacer(5);

    const startDate = formatDate(userProfile.startDate);
    const endDate = formatDate(new Date().toISOString());
    addText(`${startDate} — ${endDate}`, 12, colors.lightText, { align: 'center' });

    addSpacer(20);

    const arcLabels = {
        healing: 'The Healing Arc',
        unstuck: 'The Unstuck Arc',
        healed: 'The Healed Arc'
    };
    addText(arcLabels[userProfile.arc], 14, colors.accent, { align: 'center', fontStyle: 'italic' });

    // ===== INTENTION & MANIFESTO PAGE =====
    addNewPage();

    if (userProfile.intentions) {
        addText('My Intention', 18, colors.primary, { fontStyle: 'bold' });
        addSpacer(5);
        addText(`"${userProfile.intentions}"`, 12, colors.text, { fontStyle: 'italic', lineHeight: 1.6 });
        addSpacer(15);
    }

    if (userProfile.idealSelfManifesto) {
        addText('Ideal Self Manifesto', 18, colors.primary, { fontStyle: 'bold' });
        addSpacer(5);
        addText(userProfile.idealSelfManifesto, 11, colors.text, { lineHeight: 1.7 });
        addSpacer(15);
    }

    // ===== JOURNAL ENTRIES BY MONTH =====
    const dailyEntries = journalEntries
        .filter(e => e.type === 'daily')
        .sort((a, b) => a.day - b.day);

    const weeklyReports = journalEntries
        .filter(e => e.type === 'weekly_summary_report')
        .sort((a, b) => a.day - b.day);

    const monthlyReports = journalEntries
        .filter(e => e.type === 'monthly_summary_report')
        .sort((a, b) => a.day - b.day);

    // Group entries by month
    const months = [
        { name: 'Month One', subtitle: 'Days 1-30', entries: dailyEntries.filter(e => e.day <= 30) },
        { name: 'Month Two', subtitle: 'Days 31-60', entries: dailyEntries.filter(e => e.day > 30 && e.day <= 60) },
        { name: 'Month Three', subtitle: 'Days 61-90', entries: dailyEntries.filter(e => e.day > 60) }
    ];

    for (const month of months) {
        if (month.entries.length === 0) continue;

        addNewPage();

        // Month header
        addText(month.name, 22, colors.primary, { align: 'center', fontStyle: 'bold' });
        addText(month.subtitle, 12, colors.lightText, { align: 'center' });
        addSpacer(10);
        addHorizontalLine();
        addSpacer(5);

        // Entries for this month
        for (const entry of month.entries) {
            checkPageBreak(40);

            // Day header
            addText(`Day ${entry.day}`, 14, colors.accent, { fontStyle: 'bold' });
            addText(formatDate(entry.date), 9, colors.lightText);
            addSpacer(3);

            // Entry text
            const entryText = entry.rawText.length > 800
                ? entry.rawText.slice(0, 800) + '...'
                : entry.rawText;
            addText(entryText, 10, colors.text, { lineHeight: 1.5 });

            // Analysis insights
            if (entry.analysis && entry.analysis.insights.length > 0) {
                addSpacer(3);
                const insightText = `Key insight: ${entry.analysis.insights[0]}`;
                addText(insightText, 9, colors.secondary, { fontStyle: 'italic' });
            }

            // Tags
            if (entry.analysis && entry.analysis.tags.length > 0) {
                const tagsText = entry.analysis.tags.join(' • ');
                addText(tagsText, 8, colors.lightText);
            }

            addSpacer(8);

            // Light separator between entries
            doc.setDrawColor(230, 230, 230);
            doc.setLineWidth(0.2);
            doc.line(margin + 20, yPosition, pageWidth - margin - 20, yPosition);
            addSpacer(8);
        }
    }

    // ===== WEEKLY SUMMARIES =====
    if (weeklyReports.length > 0) {
        addNewPage();
        addText('Weekly Reflections', 22, colors.primary, { align: 'center', fontStyle: 'bold' });
        addSpacer(10);
        addHorizontalLine();
        addSpacer(5);

        for (const report of weeklyReports) {
            checkPageBreak(50);

            const summaryData = report.summaryData;
            if (!summaryData) continue;

            addText(summaryData.title || `Week ${summaryData.period}`, 14, colors.accent, { fontStyle: 'bold' });
            addText(summaryData.dateRange || '', 9, colors.lightText);
            addSpacer(3);

            if (summaryData.synthesis) {
                addText(summaryData.synthesis, 10, colors.text, { lineHeight: 1.5 });
            }

            if (summaryData.dominantThemes && summaryData.dominantThemes.length > 0) {
                addSpacer(3);
                addText(`Themes: ${summaryData.dominantThemes.join(', ')}`, 9, colors.secondary, { fontStyle: 'italic' });
            }

            addSpacer(10);
        }
    }

    // ===== INTUITIVE INSIGHTS (if enabled) =====
    if (settings.includeHunchesInFinalSummary) {
        const includedTypes = settings.finalSummaryIncludedTypes || ['insight', 'dream', 'hunch'];
        const hunches = journalEntries
            .filter(e => e.type === 'hunch' && includedTypes.includes(e.hunchType || 'hunch'))
            .sort((a, b) => a.day - b.day);

        if (hunches.length > 0) {
            addNewPage();
            addText('Intuitive Insights', 22, colors.primary, { align: 'center', fontStyle: 'bold' });
            addText('Dreams, Hunches & Sudden Insights', 12, colors.lightText, { align: 'center' });
            addSpacer(10);
            addHorizontalLine();
            addSpacer(5);

            for (const hunch of hunches) {
                checkPageBreak(30);

                const typeLabels: Record<HunchType, string> = {
                    dream: '💭 Dream',
                    insight: '💡 Insight',
                    hunch: '🔮 Hunch'
                };

                const label = typeLabels[hunch.hunchType || 'hunch'];
                addText(`${label} — Day ${hunch.day}`, 11, colors.accent, { fontStyle: 'bold' });
                addSpacer(2);
                addText(hunch.rawText, 10, colors.text, { lineHeight: 1.5 });
                addSpacer(8);
            }
        }
    }

    // ===== FINAL SUMMARY =====
    addNewPage();
    addText('Your 90-Day Evolution', 22, colors.primary, { align: 'center', fontStyle: 'bold' });
    addSpacer(10);
    addHorizontalLine();
    addSpacer(5);

    // Clean up markdown formatting from final summary
    const cleanSummary = finalSummary
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/#{1,3}\s/g, '');

    addText(cleanSummary, 11, colors.text, { lineHeight: 1.6 });

    // ===== CLOSING PAGE =====
    addNewPage();
    yPosition = pageHeight / 3;

    addText('Thank you for showing up', 18, colors.primary, { align: 'center', fontStyle: 'italic' });
    addSpacer(10);
    addText('for yourself, every day.', 18, colors.primary, { align: 'center', fontStyle: 'italic' });

    addSpacer(30);

    addText('🌿', 24, colors.text, { align: 'center' });

    addSpacer(30);

    addText('90-Day Identity Reset', 10, colors.lightText, { align: 'center' });

    // Save the PDF
    const fileName = `${userProfile.name.replace(/\s+/g, '-')}-90-Day-Journey-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
}
