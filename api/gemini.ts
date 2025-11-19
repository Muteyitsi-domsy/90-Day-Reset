
/**
 * NOTE: This file should be placed in an `/api` directory for serverless function deployment
 * on platforms like Vercel or Netlify. The platform will automatically create the `/api/gemini` endpoint.
 */
import { GoogleGenAI, Type } from "@google/genai";
import { detectCrisis } from "../utils/crisisDetector"; // Adjust path as needed

// This function would typically be part of a server's request handling logic.
// In a serverless environment, this is the entry point for the function.
export default async function handler(req: Request): Promise<Response> {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        // --- EXPECTED REQUEST BODY ---
        // {
        //   "action": "generate_weekly_summary",
        //   "week": 1,
        //   "dateRange": "2023-10-26 - 2023-11-01",
        //   "userProfile": { "name": "Alex", "arc": "healing", "idealSelfManifesto": "..." },
        //   "entries": [ { "date": "...", "rawText": "...", "type": "daily"| "hunch" } ],
        //   "checkinCompletionRate": 0.66,
        //   "streak": 5
        // }
        const body = await req.json();

        if (body.action === 'generate_weekly_summary') {
            const summary = await getWeeklySummary(body);
            return new Response(JSON.stringify(summary), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } else {
            return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
    } catch (error) {
        console.error('Error in API handler:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}


async function getWeeklySummary(data: any) {
    // --- CRISIS DETECTION ---
    const combinedText = data.entries.map((e: any) => e.rawText).join(' ');
    const severity = detectCrisis(combinedText);
    if (severity >= 2) {
        return { crisisDetected: true };
    }

    // Check for API key - try multiple environment variable names
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        console.error('Gemini API key not found. Please set GEMINI_API_KEY, API_KEY, or VITE_GEMINI_API_KEY environment variable.');
        throw new Error('API key not configured. Please set the GEMINI_API_KEY environment variable in your deployment settings.');
    }

    const ai = new GoogleGenAI({ apiKey });

    // --- GEMINI PROMPT TEMPLATE ---
    const systemInstruction = `You are an empathetic and insightful identity coach. Your task is to analyze a user's journal entries from the past week and generate a structured, compassionate summary. The user is on a 90-day personal transformation journey. Your output must be a single, clean JSON object matching the provided schema, with no additional text, explanation, or markdown formatting. Be concise and pull direct evidence where possible.`;

    const userPrompt = `
        Please analyze the following data for ${data.userProfile.name}'s weekly summary.

        **User Context:**
        - Arc: ${data.userProfile.arc}
        - Ideal Self Manifesto: "${data.userProfile.idealSelfManifesto}"
        - Week Number: ${data.week}
        - Date Range: ${data.dateRange}

        **Weekly Journal Entries & Insights:**
        ${data.entries.map((e: any) => `[${e.type.toUpperCase()} on ${e.date}]: ${e.rawText}`).join('\n')}

        **Instructions:**
        Based on all the provided context and entries, generate a JSON object that synthesizes the user's week.
    `;

    // --- SAFE SERVER-SIDE GEMINI CALL ---
    const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    weekNumber: { type: Type.NUMBER },
                    dateRange: { type: Type.STRING },
                    stage: { type: Type.STRING, description: "A short descriptor of the current stage, e.g., 'Healing - Month 1 (Processing)'" },
                    themes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 short, bullet-point themes from the week." },
                    challenges: { type: Type.ARRAY, items: { type: Type.STRING }, description: "2 short, bullet-point challenges or blocks." },
                    growth: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                observation: { type: Type.STRING },
                                evidence: { type: Type.STRING, description: "A brief, direct quote from an entry that supports the observation." }
                            }
                        },
                        description: "4 concise observations of growth seen this week."
                    },
                    notableExcerpts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "2-3 short, impactful user-written quotes." },
                    actionPlan: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 bite-sized, actionable steps for the week ahead." },
                    encouragement: { type: Type.STRING, description: "A short, warm, empowering closing paragraph." },
                    metrics: {
                        type: Type.OBJECT,
                        properties: {
                            entries: { type: Type.NUMBER },
                            streak: { type: Type.NUMBER },
                            completionRate: { type: Type.STRING }
                        },
                        description: "Metrics about the user's journal activity this week."
                    }
                },
            }
        }
    });

    const summaryJson = JSON.parse(response.text);

    // Override metrics with actual data passed in (don't trust AI to calculate these)
    summaryJson.metrics = {
        entries: data.entries.length,
        streak: data.streak,
        completionRate: `${Math.round(data.checkinCompletionRate * 100)}%`
    };

    return summaryJson;
}
