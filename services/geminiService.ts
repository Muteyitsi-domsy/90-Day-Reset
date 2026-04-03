
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, Arc, OnboardingAnalysis, JournalEntry, EntryAnalysis } from "../types";
import { rateLimiter } from "./rateLimiter";
import { analysisCache } from "./analysisCache";
import { auth } from "../src/config/firebase";
import { getAppCheckToken, APP_CHECK_HEADER } from "../src/utils/appCheck";

// ✅ Feature flag to switch between Gemini API and Vertex AI
const USE_VERTEX_AI = import.meta.env.VITE_USE_VERTEX_AI === 'true';
const VERTEX_API_URL = import.meta.env.VITE_VERTEX_API_URL || '/api/vertex-ai';

// ✅ Environment setup for Vite (browser-safe)
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

if (!GEMINI_KEY && !USE_VERTEX_AI) {
  console.warn("VITE_GEMINI_API_KEY is not set — Gemini features will run in preview mode.");
}

// Initialize Gemini AI client only if a key is available and not using Vertex AI
export const ai = GEMINI_KEY && !USE_VERTEX_AI
  ? new GoogleGenAI({ apiKey: GEMINI_KEY })
  : null;

// Vertex AI API caller
async function callVertexAI(
  prompt: string,
  requestType: 'onboarding' | 'analysis' | 'summary' | 'hunch' = 'analysis',
  config?: { temperature?: number; maxOutputTokens?: number }
): Promise<string> {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('You must be signed in to use AI features.');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`,
  };

  const appCheckToken = await getAppCheckToken();
  if (appCheckToken) headers[APP_CHECK_HEADER] = appCheckToken;

  const response = await fetch(VERTEX_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt, requestType, config })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));

    if (response.status === 429) {
      throw new Error('Daily AI request limit reached. Please try again tomorrow or upgrade to premium.');
    }

    if (response.status === 503 && error.code === 'BUDGET_EXCEEDED') {
      throw new Error('AI service temporarily unavailable. Please try again later.');
    }

    throw new Error(error.error || `API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.text;
}


export type ReflectionReadiness = 'release_needed' | 'aware_not_now' | 'already_reflected';

export interface OnboardingAnswers {
  reflectionReadiness: ReflectionReadiness;
  currentEmotions: string;
  futureFeeling: string;
  readinessScale: number;
  idealSelf: string;
}

export interface IdealSelfAnswers {
    coreValues: string;
    emotionalTone: string;
    habits: string;
    boundaries: string;
    treatmentOfSelf: string;
}

export async function analyzeOnboardingAnswers(answers: OnboardingAnswers): Promise<OnboardingAnalysis> {
    // Map reflection readiness to descriptive text for the prompt
    const reflectionReadinessText = {
      'release_needed': 'There are past experiences I\'d like to spend some time reflecting on and letting go of.',
      'aware_not_now': 'I\'m aware of past experiences, but I\'d prefer not to focus on them right now.',
      'already_reflected': 'I\'ve already reflected on the past and feel ready to focus on what\'s ahead.'
    };

    const prompt = `
        You are an empathetic, mindful identity coach. Analyze the user's answers to the onboarding questions to determine their current arc in their personal growth journey.

        The user's answers are:
        1. How do you feel about reflecting on past experiences now?
           - "${reflectionReadinessText[answers.reflectionReadiness]}"
        2. What emotions or recurring themes feel most noticeable right now?
           - "${answers.currentEmotions}"
        3. In one word, how does the future feel to you right now?
           - "${answers.futureFeeling}"
        4. On a scale of 1–10, how ready do you feel to make changes in your daily focus or habits?
           - ${answers.readinessScale}
        5. Describe what you'd like to focus more on in your life over the coming months.
           - "${answers.idealSelf}"

        Based on these answers, classify their arc into one of three categories:

        ROUTING RULES:
        1. The reflection readiness question (question 1) is the PRIMARY determinant for the Release arc:
           - release: ONLY if the user selected "There are past experiences I'd like to spend some time reflecting on and letting go of" (release_needed). This user has indicated readiness to reflect on and release past experiences.

        2. If the user did NOT select release_needed, use the readiness scale (question 4) as the guide:
           - reaffirm (Readiness score 1-4): The user wants to stabilize, reconnect, and reflect. They may need grounding and structure before making big changes.
           - reaffirm (Readiness score 5-7): Mid-range - consider other answers. If emotions suggest uncertainty or need for stability, lean toward reaffirm. If there's forward energy, consider reignition.
           - reignition (Readiness score 8-10): The user is ready for energy, exploration, and forward movement. They express excitement, readiness, and are actively creating their future self.

        IMPORTANT: If the user selected "aware_not_now" or "already_reflected" for question 1, they should NOT be placed in the Release arc regardless of other answers.

        Your response MUST be a JSON object with the following structure:
        {
          "phase": "release" | "reaffirm" | "reignition",
          "summary": "A short, empathetic paragraph summarizing where the user is, based on their answers. Reference their focus areas and readiness to make changes in a natural, non-clinical way. Avoid therapy language.",
          "encouragement": "A single, gentle sentence of encouragement."
        }
    `;

    try {
        // ✅ Use Vertex AI if enabled
        if (USE_VERTEX_AI) {
            const resultText = await callVertexAI(prompt, 'onboarding');
            // Parse JSON from response
            const jsonMatch = resultText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Invalid JSON response from AI');
            }
            return JSON.parse(jsonMatch[0]) as OnboardingAnalysis;
        }

        // ✅ Fallback to original Gemini API
        if (!ai) {
            throw new Error("AI not configured. Please enable Vertex AI or set VITE_GEMINI_API_KEY.");
        }

        // Use rate limiter to queue the request
        const result = await rateLimiter.enqueue(async () => {
            const response = await ai!.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    maxOutputTokens: 2048,
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            phase: { type: Type.STRING, enum: ['release', 'reaffirm', 'reignition'] },
                            summary: { type: Type.STRING },
                            encouragement: { type: Type.STRING }
                        },
                        required: ['phase', 'summary', 'encouragement']
                    }
                }
            });

            const jsonText = response.text.trim();
            return JSON.parse(jsonText) as OnboardingAnalysis;
        }, 'onboarding_analysis');

        return result;
    } catch (error) {
        console.error("Error analyzing onboarding answers:", error);
        console.error("Onboarding error full dump:", JSON.stringify(error, Object.getOwnPropertyNames(error)));

        // Provide user-friendly error messages for quota errors
        if (error && typeof error === 'object' && 'message' in error) {
            const errorMessage = (error as Error).message.toLowerCase();
            if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('resource_exhausted')) {
                throw new Error('Analysis quota exceeded. Please try again in a few minutes.');
            }
        }

        throw new Error(`Failed to analyze onboarding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function generateIdealSelfManifesto(answers: IdealSelfAnswers): Promise<string> {
    const prompt = `
        You are a poetic, emotionally intelligent writer. Based on the user's answers about their Ideal Self, compile them into a beautiful, first-person paragraph that reads like a "Manifesto."

        User's answers:
        - Core values and guiding principles: "${answers.coreValues}"
        - Emotional tone they want to live in: "${answers.emotionalTone}"
        - Habits or routines their ideal self maintains: "${answers.habits}"
        - Boundaries or behaviors they practice: "${answers.boundaries}"
        - How they treat themselves and others: "${answers.treatmentOfSelf}"

        Craft a single, poetic paragraph. Start with a phrase like "I am becoming someone who..." or "The version of me I'm stepping into..." Weave their answers into a cohesive and inspiring vision of the person they are growing into. The tone should be gentle, empowering, and affirmative.
    `;

    try {
        // ✅ Use Vertex AI if enabled
        if (USE_VERTEX_AI) {
            const resultText = await callVertexAI(prompt, 'onboarding', { temperature: 0.9 });
            return resultText.trim();
        }

        // ✅ Fallback to original Gemini API
        if (!ai) {
            throw new Error("AI not configured. Please enable Vertex AI or set VITE_GEMINI_API_KEY.");
        }

        // Use rate limiter to queue the request
        const result = await rateLimiter.enqueue(async () => {
            const response = await ai!.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    maxOutputTokens: 2048,
                    thinkingConfig: { thinkingBudget: 0 }
                }
            });

            return response.text.trim();
        }, 'ideal_self_manifesto');

        return result;
    } catch (error) {
        console.error("Error generating manifesto:", error);
        if (error && typeof error === 'object' && 'message' in error) {
            console.error("Manifesto error detail:", (error as Error).message);
        }

        // Provide user-friendly error messages for quota errors
        if (error && typeof error === 'object' && 'message' in error) {
            const errorMessage = (error as Error).message.toLowerCase();
            if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('resource_exhausted')) {
                throw new Error('Manifesto generation quota exceeded. Please try again in a few minutes.');
            }
        }

        throw new Error(`Failed to generate manifesto: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}


export async function analyzeJournalEntry(entryText: string, forceRefresh = false): Promise<EntryAnalysis> {
    // Check cache first (unless forced refresh)
    if (!forceRefresh) {
        const cached = analysisCache.get<EntryAnalysis>(entryText, 'journal_entry');
        if (cached) {
            console.log('Using cached analysis for journal entry');
            return cached;
        }
    }

    const prompt = `
    You are an empathetic, mindful AI assistant. Your role is to analyze a user's journal entry and provide a synthesis for their reflection. Do not be conversational. Your output must be a pure JSON object.

    The user's journal entry is:
    """
    ${entryText}
    """

    Based on this entry, perform the following tasks:
    1.  **Summarize:** Write a short, compassionate summary (2-3 sentences) of the core feeling or theme in the user's writing.
    2.  **Extract Insights:** Identify 3-5 key insights, patterns, or powerful statements from the text. These should be direct or closely paraphrased observations.
    3.  **Identify Tags:** Generate an array of 3-5 relevant emotional or thematic tags (e.g., "gratitude", "self-doubt", "healing", "boundary setting").
    4.  **Suggest Micro-Action:** Propose one small, gentle, and actionable step the user could take today, based on their writing.

    Your response MUST be a JSON object with the following structure:
    {
      "summary": "string",
      "insights": ["string", "string", ...],
      "tags": ["string", "string", ...],
      "microAction": "string"
    }
    `;

    try {
        // ✅ Use Vertex AI if enabled
        if (USE_VERTEX_AI) {
            const resultText = await callVertexAI(prompt, 'analysis');
            // Parse JSON from response
            const jsonMatch = resultText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Invalid JSON response from AI');
            }
            const result = JSON.parse(jsonMatch[0]) as EntryAnalysis;
            // Cache the result
            analysisCache.set(entryText, 'journal_entry', result);
            return result;
        }

        // ✅ Fallback to original Gemini API
        if (!ai) {
            throw new Error("AI not configured. Please enable Vertex AI or set VITE_GEMINI_API_KEY.");
        }

        // Use rate limiter to queue the request
        const result = await rateLimiter.enqueue(async () => {
            const response = await ai!.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    maxOutputTokens: 2048,
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            summary: { type: Type.STRING },
                            insights: { type: Type.ARRAY, items: { type: Type.STRING } },
                            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                            microAction: { type: Type.STRING }
                        },
                        required: ['summary', 'insights', 'tags', 'microAction']
                    }
                }
            });

            const jsonText = response.text.trim();
            return JSON.parse(jsonText) as EntryAnalysis;
        }, `journal_entry_${entryText.substring(0, 50)}`);

        // Cache the result
        analysisCache.set(entryText, 'journal_entry', result);

        return result;
    } catch (error) {
        console.error("Error in analyzeJournalEntry:", error);

        // Provide user-friendly error messages for quota errors
        if (error && typeof error === 'object' && 'message' in error) {
            const errorMessage = (error as Error).message.toLowerCase();
            if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('resource_exhausted')) {
                throw new Error('Daily analysis quota exceeded. Please try again later or disable automatic analysis in settings. Your journal entry was still saved.');
            }
        }

        throw new Error(`Failed to analyze journal entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function generateFinalSummary(profile: UserProfile, journalHistory: JournalEntry[], hunchHistory: JournalEntry[], forceRefresh = false): Promise<string> {
    const historyText = journalHistory.map(entry => `Day ${entry.day}: ${entry.rawText}`).join('\n\n');

    // Generate cache key
    const cacheContent = `${profile.name}_final_${historyText}_${hunchHistory.map(h => h.rawText).join('|')}`;

    // Check cache first
    if (!forceRefresh) {
        const cached = analysisCache.get<string>(cacheContent, 'final_summary');
        if (cached) {
            console.log('Using cached final summary');
            return cached;
        }
    }

    let hunchTextSection = '';
    if (hunchHistory && hunchHistory.length > 0) {
        const hunchEntriesText = hunchHistory.map(h => `Recorded on Day ${h.day}: ${h.rawText}`).join('\n\n');
        hunchTextSection = `
You also have access to the user's private "Intuitive Insights"—a collection of dreams and hunches they recorded.
"""
${hunchEntriesText}
"""
`;
    }

    const intentionSection = profile.intentions
        ? `Their intention for the journey was: "${profile.intentions}"`
        : '';

    // Practice consistency — week-by-week habit analysis
    const dailyEntries = journalHistory.filter(e => e.type === 'daily');
    const weekMap = new Map<number, number>();
    for (const entry of dailyEntries) {
        weekMap.set(entry.week, (weekMap.get(entry.week) ?? 0) + 1);
    }
    const wellUsedWeeks = [...weekMap.values()].filter(count => count > 2).length;
    const ritualWasConsistent = wellUsedWeeks >= 10;
    const practiceContext = `
Practice data (use as context only, weave into prose—do not quote these numbers directly):
- They completed ${dailyEntries.length} of 90 possible daily journal entries.
- They journaled more than twice in ${wellUsedWeeks} of 13 weeks.${ritualWasConsistent ? '\n- This reflects a genuinely consistent practice. The daily ritual was deeply embodied—acknowledge this.' : ''}
`;

    // Arc-specific reflection guidance
    const arcReflection = {
        release: "what you recognized, what you released, what softened across your 90 days",
        reaffirm: "what beliefs shifted, what was reaffirmed, what emerged across your 90 days",
        reignition: "what was embodied, what became natural, what ignited across your 90 days"
    };

    const arcAnalysisPrompt = {
        release: `This arc moved through three distinct terrains. Write a separate 2-3 sentence reflection for each, clearly labelled:
- Release (Month 1): The courage it took to look inward — what was met, what began to loosen, what asked to be seen and released.
- New Leaf (Month 2): The action that followed — what was built day by day, the life being constructed through the dailiness of showing up.
- Recognition (Month 3): The embodiment — the new self that emerged and was met, what was recognised as already becoming true.
Observe what was present in each terrain without prescribing or advising.`,
        reaffirm: `This arc moved through two terrains. Write a separate 2-3 sentence reflection for each, clearly labelled:
- Grounding (Months 1–2): What was stabilised, what became clear, what the person returned to again and again as their truth.
- Strengthening (Month 3): What solidified, what was reaffirmed, what identity began to crystallise through consistent practice.
Observe without prescribing.`,
        reignition: `This arc moved through three distinct phases. Write a separate 2-3 sentence reflection for each, clearly labelled:
- Consolidation & Gratitude (Month 1): What was savoured and appreciated — what the person recognised as already working, where alignment was felt, what was anchored as a foundation.
- Expansion & Joy (Month 2): Where the person stretched beyond the familiar — what freedom and joy emerged, how authentic expression grew and opened.
- Full Embodiment & Radiance (Month 3): What became effortless and natural — how the person showed up fully, what was shared and given outward, what was lived rather than merely intended.
Observe the qualities that were present in each phase without prescribing or advising.`
    };

    const prompt = `
        You are a reflective mirror concluding a user's 90-Day Identity Reset journey. Your role is to observe and reflect—NOT to coach, advise, or prescribe. You do not give forward guidance or tell them what to do next. You simply reveal what the 90 days contained.

        CRITICAL RULES:
        - NO advice or suggestions for the future
        - NO phrases like "consider", "try to", "remember to"
        - NO forward guidance paragraphs
        - Use neutral, observational language
        - Let their own words carry the weight
        - End with reflection, not prescription

        The user's name is ${profile.name}.
        They started in the "${profile.arc}" arc.
        ${intentionSection}
        Their Ideal Self Manifesto is: "${profile.idealSelfManifesto}"

        You have access to all of their daily journal entries from the past 90 days:
        """
        ${historyText}
        """
        ${hunchTextSection}
        ${practiceContext}

        Generate a reflective summary following this EXACT structure (500 words max):

        **[PERSONALIZED TITLE BASED ON THEIR JOURNEY - not generic]**

        **THE BEGINNING**
        2-3 sentences on where you started—your arc, your intention (if provided), what was present in the early entries. Observational, not judgmental.

        **THE TERRAIN**
        Begin with 1-2 sentences naming and defining what the ${profile.arc} arc set out to do — the terrain's purpose and what it asked of the person. Then 2-3 sentences on the major themes that moved through the 90 days: what kept appearing, what evolved, what was present. Reference specific phases or turning points, using their own words as evidence where possible.

        **THE ARC**
        ${arcAnalysisPrompt[profile.arc]}

        **THE THREADS**
        2-3 sentences weaving together recurring elements—images, words, or themes that appeared across your journey.${hunchHistory.length > 0 ? " Note any patterns between conscious entries and intuitive insights." : ""}

        **THE MIRRORS**
        3-4 direct quotes from your entries across different phases of the journey (early, middle, late), showing the arc through your own words. Format each quote on its own line with the day number.

        **THE PRACTICE**
        2-3 sentences reflecting on how the act of showing up became its own form of transformation. Weave in how consistently the journaling practice was held (drawing from the practice data provided). Reflect on which specific qualities or values from the Ideal Self Manifesto appear to have been lived—not just aspired to—across the entries. If an intention was stated at the outset, observe how it moved through the journey: whether it deepened, shifted, or quietly became part of the fabric. Observational, not celebratory. If the practice was consistent, acknowledge it with warmth but without flattery.

        **THE CLOSING**
        2-3 sentences of synthesis—not advice, not encouragement, just a poetic observation of what your 90 days held. End with a single line from or inspired by your Ideal Self Manifesto, presented as a reflection of who you have been becoming. Do NOT tell them what to do next.

        Format with Markdown: Use ** for section headers. The response should read as a cohesive narrative, not a list.
    `;

    try {
        // ✅ Use Vertex AI if enabled
        if (USE_VERTEX_AI) {
            const resultText = await callVertexAI(prompt, 'summary', { temperature: 0.8, maxOutputTokens: 4096 });
            const result = resultText.trim();
            // Cache the result
            analysisCache.set(cacheContent, 'final_summary', result);
            return result;
        }

        // ✅ Fallback to original Gemini API
        if (!ai) {
            throw new Error("AI not configured. Please enable Vertex AI or set VITE_GEMINI_API_KEY.");
        }

        // Use rate limiter to queue the request
        const result = await rateLimiter.enqueue(async () => {
            const response = await ai!.models.generateContent({
                model: 'gemini-2.5-flash', // Using a powerful model for the final, complex summary
                contents: prompt,
                config: {
                    maxOutputTokens: 4096,
                    thinkingConfig: { thinkingBudget: 0 }
                }
            });

            return response.text.trim();
        }, 'final_summary');

        // Cache the result
        analysisCache.set(cacheContent, 'final_summary', result);

        return result;
    } catch (error) {
        console.error("Error generating final summary:", error);

        // Provide user-friendly error messages for quota errors
        if (error && typeof error === 'object' && 'message' in error) {
            const errorMessage = (error as Error).message.toLowerCase();
            if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('resource_exhausted')) {
                throw new Error('Final summary quota exceeded. Please try again later. Your journey data has been saved.');
            }
        }

        throw new Error(`Failed to generate final summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Helper functions for date ranges
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
    monthStart.setDate(start.getDate() + (monthNumber - 1) * 30);

    const monthEnd = new Date(monthStart);
    monthEnd.setDate(monthStart.getDate() + 29);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    return `${formatDate(monthStart)} - ${formatDate(monthEnd)}`;
}

export async function generateWeeklySummary(userProfile: UserProfile, week: number, entries: JournalEntry[], forceRefresh = false): Promise<any> {
    const checkinCount = entries.filter(e => e.type === 'daily' && e.eveningCheckin).length;
    const dailyEntryCount = entries.filter(e => e.type === 'daily').length;
    const completionRate = dailyEntryCount > 0 ? checkinCount / dailyEntryCount : 0;

    const dateRange = getWeekDateRange(userProfile.startDate, week);
    const periodLabel = `Week ${week}`;

    // Generate cache key from entries
    const cacheContent = `${userProfile.name}_week_${week}_${entries.map(e => e.rawText).join('|')}`;

    // Check cache first
    if (!forceRefresh) {
        const cached = analysisCache.get<any>(cacheContent, 'weekly_summary');
        if (cached) {
            console.log(`Using cached weekly summary for week ${week}`);
            return cached;
        }
    }

    // System instruction (same as server-side)
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
        Reflect the following journal data for ${userProfile.name}'s weekly summary.

        **Context:**
        - Arc: ${userProfile.arc}
        - Ideal Self Manifesto: "${userProfile.idealSelfManifesto}"
        - Period: ${periodLabel}
        - Date Range: ${dateRange}

        **Journal Entries:**
        ${entries.map((e: any, i: number) => `[Day ${e.day || i + 1}, ${e.type.toUpperCase()}]: ${e.rawText}`).join('\n\n')}

        **Instructions:**
        Analyze these entries and generate a JSON object that mirrors back what appeared, without judgment or advice. Focus on:
        1. What themes dominated this period
        2. What patterns repeated or shifted
        3. What tensions were present (frame neutrally as "a pull between...")
        4. Direct quotes that reveal the journey
        5. A poetic synthesis that weaves it together without prescribing next steps
    `;

    try {
        // ✅ Use Vertex AI if enabled
        if (USE_VERTEX_AI) {
            // Combine system instruction with user prompt for Vertex AI
            const fullPrompt = `${systemInstruction}\n\n${userPrompt}`;
            const resultText = await callVertexAI(fullPrompt, 'summary', { temperature: 0.7, maxOutputTokens: 2048 });

            // Parse JSON from response
            const jsonMatch = resultText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Invalid JSON response from AI');
            }
            const summaryJson = JSON.parse(jsonMatch[0]);

            // Add metrics
            summaryJson.metrics = {
                entries: entries.length,
                streak: userProfile.streak,
                completionRate: `${Math.round(completionRate * 100)}%`
            };

            // Cache the result
            analysisCache.set(cacheContent, 'weekly_summary', summaryJson);
            return summaryJson;
        }

        // ✅ Fallback to original Gemini API
        if (!ai) {
            throw new Error("AI not configured. Please enable Vertex AI or set VITE_GEMINI_API_KEY.");
        }

        // Use rate limiter to queue the request
        const result = await rateLimiter.enqueue(async () => {
            const response = await ai!.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                config: {
                    maxOutputTokens: 4096,
                    systemInstruction,
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING, description: "A poetic, evocative title for this period" },
                            period: { type: Type.NUMBER },
                            dateRange: { type: Type.STRING },
                            dominantThemes: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING },
                                description: "3-5 themes that emerged"
                            },
                            emotionalTerrain: { type: Type.STRING },
                            recurringThreads: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                            },
                            shifts: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                            },
                            mirrors: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        pattern: { type: Type.STRING },
                                        excerpt: { type: Type.STRING },
                                        day: { type: Type.NUMBER }
                                    },
                                    required: ["pattern", "excerpt", "day"]
                                }
                            },
                            tensions: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                            },
                            synthesis: { type: Type.STRING }
                        },
                        required: ["title", "period", "dateRange", "dominantThemes", "emotionalTerrain", "recurringThreads", "shifts", "mirrors", "tensions", "synthesis"]
                    }
                }
            });

            const summaryJson = JSON.parse(response.text);

            // Add metrics
            summaryJson.metrics = {
                entries: entries.length,
                streak: userProfile.streak,
                completionRate: `${Math.round(completionRate * 100)}%`
            };

            return summaryJson;
        }, `weekly_summary_${week}`);

        // Cache the result
        analysisCache.set(cacheContent, 'weekly_summary', result);

        return result;
    } catch (error) {
        console.error("Error generating weekly summary:", error);

        // Provide user-friendly error messages for quota errors
        if (error && typeof error === 'object' && 'message' in error) {
            const errorMessage = (error as Error).message.toLowerCase();
            if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('resource_exhausted')) {
                throw new Error('Weekly summary quota exceeded. Please try again later. Your progress has been saved.');
            }
        }

        throw new Error(`Failed to generate weekly summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

function getArcPhaseContext(arc: Arc, month: number): { phase: string; focus: string } {
    if (arc === 'release') {
        if (month === 1) return { phase: 'Release', focus: 'the courage to look inward, what began to loosen, what was named and released' };
        if (month === 2) return { phase: 'New Leaf', focus: 'the action taken, what was built day by day, new ground being planted' };
        return { phase: 'Recognition', focus: 'the embodiment of the new self, what was met and recognised as true' };
    }
    if (arc === 'reaffirm') {
        if (month <= 2) return { phase: 'Grounding', focus: 'what was stabilised, what became clear, what was returned to as true' };
        return { phase: 'Strengthening', focus: 'what solidified, what was reaffirmed, what identity began to crystallise' };
    }
    // reignition: three distinct monthly phases
    if (month === 1) return { phase: 'Consolidation & Gratitude', focus: 'what was savoured and appreciated, where alignment was felt, what the person recognised as already working and worth anchoring' };
    if (month === 2) return { phase: 'Expansion & Joy', focus: 'where the person stretched beyond the familiar, what joy and freedom emerged, how authentic expression grew' };
    return { phase: 'Full Embodiment & Radiance', focus: 'what became effortless and natural, how the person showed up fully, what was shared and radiated outward' };
}

export async function generateMonthlySummary(userProfile: UserProfile, month: number, entries: JournalEntry[], forceRefresh = false): Promise<any> {
    const checkinCount = entries.filter(e => e.type === 'daily' && e.eveningCheckin).length;
    const dailyEntryCount = entries.filter(e => e.type === 'daily').length;
    const completionRate = dailyEntryCount > 0 ? checkinCount / dailyEntryCount : 0;

    const dateRange = getMonthDateRange(userProfile.startDate, month);
    const periodLabel = `Month ${month}`;
    const arcPhaseCtx = getArcPhaseContext(userProfile.arc, month);

    // Generate cache key from entries
    const cacheContent = `${userProfile.name}_month_${month}_${entries.map(e => e.rawText).join('|')}`;

    // Check cache first
    if (!forceRefresh) {
        const cached = analysisCache.get<any>(cacheContent, 'monthly_summary');
        if (cached) {
            console.log(`Using cached monthly summary for month ${month}`);
            return cached;
        }
    }

    // System instruction (same as server-side)
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
        Reflect the following journal data for ${userProfile.name}'s monthly summary.

        **Context:**
        - Arc: ${userProfile.arc} — ${arcPhaseCtx.phase} phase
        - Arc Phase Focus: This is the ${arcPhaseCtx.phase} terrain. The reflection should be attuned to ${arcPhaseCtx.focus}.
        - Ideal Self Manifesto: "${userProfile.idealSelfManifesto}"
        - Period: ${periodLabel}
        - Date Range: ${dateRange}

        **Journal Entries:**
        ${entries.map((e: any, i: number) => `[Day ${e.day || i + 1}, ${e.type.toUpperCase()}]: ${e.rawText}`).join('\n\n')}

        **Instructions:**
        Analyze these entries and generate a JSON object that mirrors back what appeared, without judgment or advice. Focus on:
        1. What themes dominated this period
        2. What patterns repeated or shifted
        3. What tensions were present (frame neutrally as "a pull between...")
        4. Direct quotes that reveal the journey
        5. A poetic synthesis that weaves it together without prescribing next steps
        6. Arc-phase attunement: ground the reflection in the ${arcPhaseCtx.phase} terrain — what this specific phase of the arc asked of the person, and how these entries moved through that terrain.
    `;

    try {
        // ✅ Use Vertex AI if enabled
        if (USE_VERTEX_AI) {
            // Combine system instruction with user prompt for Vertex AI
            const fullPrompt = `${systemInstruction}\n\n${userPrompt}`;
            const resultText = await callVertexAI(fullPrompt, 'summary', { temperature: 0.7, maxOutputTokens: 2048 });

            // Parse JSON from response
            const jsonMatch = resultText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Invalid JSON response from AI');
            }
            const summaryJson = JSON.parse(jsonMatch[0]);

            // Add metrics
            summaryJson.metrics = {
                entries: entries.length,
                streak: userProfile.streak,
                completionRate: `${Math.round(completionRate * 100)}%`
            };
            summaryJson.arcPhase = arcPhaseCtx.phase;

            // Cache the result
            analysisCache.set(cacheContent, 'monthly_summary', summaryJson);
            return summaryJson;
        }

        // ✅ Fallback to original Gemini API
        if (!ai) {
            throw new Error("AI not configured. Please enable Vertex AI or set VITE_GEMINI_API_KEY.");
        }

        // Use rate limiter to queue the request
        const result = await rateLimiter.enqueue(async () => {
            const response = await ai!.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                config: {
                    maxOutputTokens: 4096,
                    systemInstruction,
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING, description: "A poetic, evocative title for this period" },
                            period: { type: Type.NUMBER },
                            dateRange: { type: Type.STRING },
                            dominantThemes: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING },
                                description: "3-5 themes that emerged"
                            },
                            emotionalTerrain: { type: Type.STRING },
                            recurringThreads: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                            },
                            shifts: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                            },
                            mirrors: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        pattern: { type: Type.STRING },
                                        excerpt: { type: Type.STRING },
                                        day: { type: Type.NUMBER }
                                    },
                                    required: ["pattern", "excerpt", "day"]
                                }
                            },
                            tensions: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                            },
                            synthesis: { type: Type.STRING },
                            arcPhase: { type: Type.STRING, description: "The arc phase this month corresponds to" }
                        },
                        required: ["title", "period", "dateRange", "dominantThemes", "emotionalTerrain", "recurringThreads", "shifts", "mirrors", "tensions", "synthesis", "arcPhase"]
                    }
                }
            });

            const summaryJson = JSON.parse(response.text);

            // Add metrics
            summaryJson.metrics = {
                entries: entries.length,
                streak: userProfile.streak,
                completionRate: `${Math.round(completionRate * 100)}%`
            };
            summaryJson.arcPhase = arcPhaseCtx.phase;

            return summaryJson;
        }, `monthly_summary_${month}`);

        // Cache the result
        analysisCache.set(cacheContent, 'monthly_summary', result);

        return result;
    } catch (error) {
        console.error("Error generating monthly summary:", error);

        // Provide user-friendly error messages for quota errors
        if (error && typeof error === 'object' && 'message' in error) {
            const errorMessage = (error as Error).message.toLowerCase();
            if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('resource_exhausted')) {
                throw new Error('Monthly summary quota exceeded. Please try again later. Your progress has been saved.');
            }
        }

        throw new Error(`Failed to generate monthly summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}


// Emotions considered positive for pattern-tuning purposes
const POSITIVE_EMOTIONS = new Set([
  'joyful', 'calm', 'energized', 'grateful',
]);

function isPositiveEmotion(emotion: string): boolean {
  return POSITIVE_EMOTIONS.has(emotion.toLowerCase());
}

/**
 * Builds the flip reframing prompt, optionally tuned by a detected mood pattern.
 *
 * Tuning logic:
 *  - Negative emotion pattern  → empowerment-focused, future-oriented, pattern-interrupting
 *  - Positive emotion pattern  → deepening + anchoring (what's working, how to invite more)
 *  - Cross-area spillover       → boundary-awareness + containment framing
 *  - No pattern (base case)    → original wiser-self question
 */
function buildReframingPrompt(
  challenge: string,
  patternContext?: PatternInsightInput & { mood_type?: string },
): string {
  if (!patternContext) {
    // Original baseline prompt — unchanged behaviour
    return `
You are the user's wiser, older self who has already overcome this challenge. Your role is to ask a single powerful question that helps them see the situation from a different angle.

The user has shared this challenge or stuck thought:
"""
${challenge}
"""

Generate ONE thought-provoking question that:
1. Comes from the perspective of their wiser future self who conquered this
2. Encourages viewing the situation from an unexpected or hidden angle
3. Opens possibilities rather than validating negative patterns
4. Focuses on growth, learning, or hidden opportunities
5. Is open-ended (not yes/no)
6. Uses warm, conversational language (not clinical or therapeutic)

The question should feel like wisdom from their future self gently guiding them to a new perspective.

Respond with ONLY the question itself, no introduction or explanation. Start the question directly.
`;
  }

  const { pattern_type, life_area, mood_type, source_area, target_area, score_level } =
    patternContext;
  const positive = mood_type ? isPositiveEmotion(mood_type) : false;

  // ── Cross-area spillover ───────────────────────────────────────────────────
  if (pattern_type === 'cross_area') {
    return `
You are the user's wiser, older self. You can see something the user may not yet — that when things feel heavy in their ${source_area ?? 'one area of life'}, it tends to spill into their ${target_area ?? 'another area'} soon after. This pattern has repeated itself.

The user has written:
"""
${challenge}
"""

Your task: ask ONE question that gently brings awareness to this connection and invites the user to imagine what could help them keep these areas from bleeding into each other. The question should feel caring, not alarming. It should open a door, not apply pressure.

Rules:
- Future-oriented (what could be different, not what went wrong)
- No advice, no prescriptions
- Open-ended (not yes/no)
- Warm and conversational

Respond with ONLY the question. No introduction.
`;
  }

  // ── Escalation (building intensity) ───────────────────────────────────────
  if (pattern_type === 'escalation') {
    return `
You are the user's wiser, older self. You can see that feelings in their ${life_area ?? 'this area'} have been building — getting heavier with each entry. The intensity is ${score_level?.toLowerCase() ?? 'notable'}.

The user has written:
"""
${challenge}
"""

Your task: ask ONE question that is especially empowering and future-focused — something that could interrupt this build-up and help the user see a path forward from a calmer, wiser vantage point. The question should feel like a hand reaching toward them, not a push.

Rules:
- Empowerment focus — what agency do they have?
- Future-self perspective — what does the version of them who navigated this already know?
- Gently pattern-interrupting without drama
- Open-ended, warm, not clinical

Respond with ONLY the question. No introduction.
`;
  }

  // ── Positive emotion repetition ───────────────────────────────────────────
  if (positive) {
    return `
You are the user's wiser, older self. You notice something beautiful — the user keeps returning to ${life_area ?? 'this area'} with ${mood_type ?? 'positive feelings'}. This is a pattern worth understanding deeply.

The user has written:
"""
${challenge}
"""

Your task: ask ONE question that helps the user understand and anchor what is working so well here — so they can consciously invite more of it into their life. This is a celebration question, not a challenge.

Rules:
- Curious and appreciative tone
- Focus on what's nourishing this positive pattern
- Open-ended invitation to reflect, not interrogate
- Warm and genuine

Respond with ONLY the question. No introduction.
`;
  }

  // ── Negative emotion repetition (default for non-escalation, non-cross-area) ──
  return `
You are the user's wiser, older self. You can see something the user may be in the middle of — the feeling of ${mood_type ?? 'this emotion'} in their ${life_area ?? 'life'} has been showing up repeatedly. This is a pattern, not a permanent state.

The user has written:
"""
${challenge}
"""

Your task: ask ONE question that empowers the user to step slightly outside this loop and look at it with fresh eyes. The question should feel like a perspective shift — something their future self, who already moved through this, would ask with love and confidence in their ability to navigate it.

Rules:
- Empowerment-focused (not pity, not pressure)
- Future-oriented — what might be possible, what can they build toward
- Acknowledge the pattern exists without dramatising it
- Open-ended, warm, conversational

Respond with ONLY the question. No introduction.
`;
}

/**
 * Generates a reframing question from the user's wiser, future self perspective.
 * Used by the Flip Journal feature.
 *
 * When patternContext is provided (Pro users), the question is tuned to the
 * detected mood pattern — empowering for negative patterns, deepening for positive ones.
 */
export async function generateReframingQuestion(
  challenge: string,
  patternContext?: PatternInsightInput & { mood_type?: string },
): Promise<string> {
  const prompt = buildReframingPrompt(challenge, patternContext);

  try {
    // Use Vertex AI if enabled
    if (USE_VERTEX_AI) {
      return (await callVertexAI(prompt, 'analysis', { temperature: 0.8, maxOutputTokens: 1024 })).trim();
    }

    // Fallback to Gemini API
    if (!ai) {
      throw new Error("AI not configured. Please enable Vertex AI or set VITE_GEMINI_API_KEY.");
    }

    const result = await rateLimiter.enqueue(async () => {
      const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.8,
          maxOutputTokens: 1024,
          // Disable thinking — Gemini 2.5 Flash thinking tokens share the
          // maxOutputTokens budget, which truncates the actual answer.
          thinkingConfig: { thinkingBudget: 0 }
        }
      });
      return response.text.trim();
    }, `flip_reframe_${Date.now()}`);

    return result;
  } catch (error) {
    console.error("Error generating reframing question:", error);

    // Provide user-friendly error messages for quota errors
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = (error as Error).message.toLowerCase();
      if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('resource_exhausted')) {
        throw new Error('Question generation quota exceeded. Please try again in a few minutes.');
      }
    }

    throw new Error(`Failed to generate reframing question: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function getDayAndMonth(startDate: string): { day: number; month: number } {
  const start = new Date(startDate);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffTime = Math.max(0, today.getTime() - start.getTime());
  const day = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  let month;
  if (day <= 30) {
    month = 1;
  } else if (day <= 60) {
    month = 2;
  } else {
    month = 3;
  }
  return { day, month };
}

// ---------------------------------------------------------------------------
// Pattern Insight Generation (Pro feature)
// ---------------------------------------------------------------------------

export interface PatternInsightInput {
  pattern_type: 'repetition' | 'escalation' | 'cross_area';
  life_area?: string;
  mood_type?: string;
  source_area?: string;
  target_area?: string;
  occurrences: number;
  score_level: 'Low' | 'Moderate' | 'High';
}

/**
 * Generates a calm, non-judgmental 1–2 sentence insight describing the
 * detected behavioural pattern. No advice. No calls to improve.
 * The user should feel: "Your feelings are valid. I see you."
 */
export async function generatePatternInsight(input: PatternInsightInput): Promise<string> {
  const contextLine =
    input.pattern_type === 'cross_area'
      ? `A cross-area pattern: when stress or difficult emotions appear in "${input.source_area}", an entry in "${input.target_area}" tends to follow within 24 hours. This has happened ${input.occurrences} times.`
      : input.pattern_type === 'escalation'
      ? `An escalation pattern: emotional intensity in the "${input.life_area}" area has been increasing across the last 3 entries (score level: ${input.score_level}).`
      : `A repetition pattern: the emotion "${input.mood_type}" in the "${input.life_area}" area has appeared ${input.occurrences} times in the last 4 days.`;

  const prompt = `You are a gentle, non-judgmental reflection companion.

A user has just submitted a mood journal entry. The following behavioural pattern has been detected in their recent entries:

${contextLine}

Generate a calm, reflective, non-judgmental 1–2 sentence observation describing this pattern.

Rules:
- Do NOT give advice or tell the user what to do.
- Do NOT sound clinical, alarming, or prescriptive.
- Make it feel personal, warm, and purely observational.
- Meet the user exactly where they are — no calls to change or be different.
- Write in second person ("You've been…", "It seems…", "There's a pattern…").

Respond with ONLY the observation text. No introduction, no labels, no explanation.`;

  try {
    if (USE_VERTEX_AI) {
      return (await callVertexAI(prompt, 'analysis', { temperature: 0.7, maxOutputTokens: 256 })).trim();
    }

    if (!ai) {
      // Return a safe rule-based fallback when AI is unavailable
      return buildFallbackInsight(input);
    }

    const result = await rateLimiter.enqueue(async () => {
      const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.7,
          maxOutputTokens: 256,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      return response.text.trim();
    }, `pattern_insight_${Date.now()}`);

    return result;
  } catch (error) {
    console.error('Error generating pattern insight:', error);
    return buildFallbackInsight(input);
  }
}

function buildFallbackInsight(input: PatternInsightInput): string {
  if (input.pattern_type === 'cross_area') {
    return `When things feel heavy in ${input.source_area ?? 'one area'}, it often carries into ${input.target_area ?? 'another area'} soon after.`;
  }
  if (input.pattern_type === 'escalation') {
    return `Your feelings in ${input.life_area ?? 'this area'} have been building in intensity recently.`;
  }
  return `You've been experiencing ${input.mood_type ?? 'similar feelings'} in ${input.life_area ?? 'this area'} a few times lately.`;
}