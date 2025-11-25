
/**
 * NOTE: This file should be placed in an `/api` directory for serverless function deployment
 * on platforms like Vercel or Netlify. The platform will automatically create the `/api/gemini` endpoint.
 */
import { GoogleGenAI, Type } from "@google/genai";
import { detectCrisis } from "../utils/crisisDetector"; 

export default async function handler(req: Request): Promise<Response> {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        const body = await req.json();

        if (body.action === 'generate_weekly_summary' || body.action === 'generate_monthly_summary') {
            const summary = await getSummary(body);
            return new Response(JSON.stringify(summary), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } else {
            return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
    } catch (error) {
        console.error('Error in API handler:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}


async function getSummary(data: any) {
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
    const isMonthly = data.periodType === 'month';
    const periodLabel = isMonthly ? `Month ${data.period}` : `Week ${data.period}`;

    // --- GEMINI PROMPT TEMPLATE (Reflective Mirror Approach) ---
    const systemInstruction = `You are a reflective mirror for personal journal entries. Your role is to observe and reflect patterns back to the user WITHOUT judgment, diagnosis, advice, or encouragement. You do not coach, suggest, or prescribe. You simply reveal what is present in the writing.

CRITICAL RULES:
- NEVER use diagnostic or clinical language
- NEVER give advice or action items
- NEVER use phrases like "you should", "consider", "try to"
- NEVER judge entries as good/bad, healthy/unhealthy
- Use neutral, observational language: "appeared", "emerged", "was present"
- Describe tensions as "a pull between X and Y" not "you struggled with"
- Let the user's own words carry the weight - quote them directly
- End with synthesis, not prescription

Your output must be a single, clean JSON object matching the provided schema.`;

    const userPrompt = `
        Reflect the following journal data for ${data.userProfile.name}'s ${isMonthly ? 'monthly' : 'weekly'} summary.

        **Context:**
        - Arc: ${data.userProfile.arc}
        - Ideal Self Manifesto: "${data.userProfile.idealSelfManifesto}"
        - Period: ${periodLabel}
        - Date Range: ${data.dateRange}

        **Journal Entries:**
        ${data.entries.map((e: any, i: number) => `[Day ${e.day || i + 1}, ${e.type.toUpperCase()}]: ${e.rawText}`).join('\n\n')}

        **Instructions:**
        Analyze these entries and generate a JSON object that mirrors back what appeared, without judgment or advice. Focus on:
        1. What themes dominated this period
        2. What patterns repeated or shifted
        3. What tensions were present (frame neutrally as "a pull between...")
        4. Direct quotes that reveal the journey
        5. A poetic synthesis that weaves it together without prescribing next steps
    `;

    // --- SAFE SERVER-SIDE GEMINI CALL ---
    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "A poetic, evocative title for this period (e.g., 'The Week of Quiet Unfolding')" },
                    period: { type: Type.NUMBER },
                    dateRange: { type: Type.STRING },
                    dominantThemes: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "3-5 themes that emerged, phrased as observations (e.g., 'Grief finding its voice', 'Permission to be still')"
                    },
                    emotionalTerrain: {
                        type: Type.STRING,
                        description: "2-3 sentences describing the emotional texture of this period. Use neutral, observational language."
                    },
                    recurringThreads: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "2-3 patterns that appeared multiple times (e.g., 'References to childhood', 'The word enough appearing in multiple contexts')"
                    },
                    shifts: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "2-3 observable changes from earlier in the journey (e.g., 'Earlier entries focused on X; this period moved toward Y')"
                    },
                    mirrors: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                pattern: { type: Type.STRING, description: "Brief label for what this excerpt reflects" },
                                excerpt: { type: Type.STRING, description: "Direct quote from their entry" },
                                day: { type: Type.NUMBER, description: "Which day this came from" }
                            },
                            required: ["pattern", "excerpt", "day"]
                        },
                        description: "4-5 significant excerpts that reveal the journey. Use their exact words."
                    },
                    tensions: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "2-3 areas where opposing forces appeared, phrased neutrally (e.g., 'A pull between wanting to heal quickly and honoring the pace that feels true')"
                    },
                    synthesis: {
                        type: Type.STRING,
                        description: "2-3 sentences weaving the period together. End with observation, NOT advice. Do not tell them what to do next."
                    }
                },
                required: ["title", "period", "dateRange", "dominantThemes", "emotionalTerrain", "recurringThreads", "shifts", "mirrors", "tensions", "synthesis"]
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
