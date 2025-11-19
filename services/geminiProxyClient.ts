
import { UserProfile, JournalEntry, SummaryData } from "../types";

interface WeeklySummaryPayload {
    userProfile: UserProfile;
    week: number;
    entries: JournalEntry[];
}

interface MonthlySummaryPayload {
    userProfile: UserProfile;
    month: number;
    entries: JournalEntry[];
}

function getWeekDateRange(startDate: string, weekNumber: number): string {
    const start = new Date(startDate);
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + (weekNumber - 1) * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
}

function getMonthDateRange(startDate: string, monthNumber: number): string {
    const start = new Date(startDate);
    const monthStart = new Date(start);
    monthStart.setDate(start.getDate() + (monthNumber - 1) * 30); // Approximation

    const monthEnd = new Date(monthStart);
    monthEnd.setDate(monthStart.getDate() + 29);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    return `${formatDate(monthStart)} - ${formatDate(monthEnd)}`;
}


export async function generateWeeklySummary(payload: WeeklySummaryPayload): Promise<SummaryData> {
    const { userProfile, week, entries } = payload;
    
    const checkinCount = entries.filter(e => e.type === 'daily' && e.eveningCheckin).length;
    const dailyEntryCount = entries.filter(e => e.type === 'daily').length;
    const completionRate = dailyEntryCount > 0 ? checkinCount / dailyEntryCount : 0;

    const requestBody = {
        action: "generate_weekly_summary",
        period: week,
        periodType: "week",
        dateRange: getWeekDateRange(userProfile.startDate, week),
        userProfile: {
            name: userProfile.name,
            arc: userProfile.arc,
            idealSelfManifesto: userProfile.idealSelfManifesto
        },
        entries: entries.map(e => ({ date: e.date, rawText: e.rawText, type: e.type })),
        checkinCompletionRate: completionRate,
        streak: userProfile.streak,
    };

    return fetchSummary(requestBody);
}

export async function generateMonthlySummary(payload: MonthlySummaryPayload): Promise<SummaryData> {
    const { userProfile, month, entries } = payload;
    
    const checkinCount = entries.filter(e => e.type === 'daily' && e.eveningCheckin).length;
    const dailyEntryCount = entries.filter(e => e.type === 'daily').length;
    const completionRate = dailyEntryCount > 0 ? checkinCount / dailyEntryCount : 0;

    const requestBody = {
        action: "generate_monthly_summary",
        period: month,
        periodType: "month",
        dateRange: getMonthDateRange(userProfile.startDate, month),
        userProfile: {
            name: userProfile.name,
            arc: userProfile.arc,
            idealSelfManifesto: userProfile.idealSelfManifesto
        },
        entries: entries.map(e => ({ date: e.date, rawText: e.rawText, type: e.type })),
        checkinCompletionRate: completionRate,
        streak: userProfile.streak,
    };

    return fetchSummary(requestBody);
}

async function fetchSummary(requestBody: any): Promise<SummaryData> {
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
        }

        return await response.json() as SummaryData;
    } catch (error) {
        console.error("Failed to fetch summary:", error);
        throw new Error("Could not connect to the summarization service.");
    }
}
