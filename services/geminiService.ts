
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, Arc, OnboardingAnalysis, JournalEntry, EntryAnalysis } from "../types";
import { rateLimiter } from "./rateLimiter";
import { analysisCache } from "./analysisCache";

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

// ✅ Vertex AI API caller
async function callVertexAI(
  prompt: string,
  requestType: 'onboarding' | 'analysis' | 'summary' | 'hunch' = 'analysis',
  config?: { temperature?: number; maxOutputTokens?: number }
): Promise<string> {
  const userId = localStorage.getItem('userId') || 'anonymous';

  const response = await fetch(VERTEX_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      userId,
      requestType,
      config
    })
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
                model: 'gemini-2.0-flash',
                contents: prompt,
                config: {
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
                model: 'gemini-2.0-flash',
                contents: prompt,
            });

            return response.text.trim();
        }, 'ideal_self_manifesto');

        return result;
    } catch (error) {
        console.error("Error generating manifesto:", error);

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
                model: 'gemini-2.0-flash',
                contents: prompt,
                config: {
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

    // Arc-specific reflection guidance
    const arcReflection = {
        release: "What was recognized, what was released, what softened over these 90 days",
        reaffirm: "What beliefs shifted, what was reaffirmed, what emerged over these 90 days",
        reignition: "What was embodied, what became natural, what ignited over these 90 days"
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

        Generate a reflective summary following this EXACT structure (400 words max):

        **[PERSONALIZED TITLE BASED ON THEIR JOURNEY - not generic]**

        **THE BEGINNING**
        2-3 sentences on where they started—their arc, their intention (if provided), what was present in the early entries. Observational, not judgmental.

        **THE TERRAIN**
        3-4 sentences on the major themes that moved through the 90 days. What kept appearing? What evolved? Reference specific phases or turning points. Use their own words as evidence where possible.

        **THE ARC**
        2-3 sentences specific to their arc: ${arcReflection[profile.arc]}. Describe what was observed, not what was achieved.

        **THE THREADS**
        2-3 sentences weaving together recurring elements—images, words, or themes that appeared across the journey.${hunchHistory.length > 0 ? " Note any patterns between conscious entries and intuitive insights." : ""}

        **THE MIRRORS**
        3-4 direct quotes from their entries across different phases of the journey (early, middle, late), showing the arc through their own words. Format each quote on its own line with the day number.

        **THE CLOSING**
        2-3 sentences of synthesis—not advice, not encouragement, just a poetic observation of what 90 days held. End with a single line from or inspired by their Ideal Self Manifesto, presented as a reflection of who they have been becoming. Do NOT tell them what to do next.

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
                model: 'gemini-2.0-flash', // Using a powerful model for the final, complex summary
                contents: prompt,
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
                model: 'gemini-2.0-flash',
                contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                config: {
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

export async function generateMonthlySummary(userProfile: UserProfile, month: number, entries: JournalEntry[], forceRefresh = false): Promise<any> {
    const checkinCount = entries.filter(e => e.type === 'daily' && e.eveningCheckin).length;
    const dailyEntryCount = entries.filter(e => e.type === 'daily').length;
    const completionRate = dailyEntryCount > 0 ? checkinCount / dailyEntryCount : 0;

    const dateRange = getMonthDateRange(userProfile.startDate, month);
    const periodLabel = `Month ${month}`;

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
                model: 'gemini-2.0-flash',
                contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                config: {
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


/**
 * Generates a reframing question from the user's wiser, future self perspective
 * Used by the Flip Journal feature
 */
export async function generateReframingQuestion(challenge: string): Promise<string> {
  const prompt = `
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

  try {
    // Use Vertex AI if enabled
    if (import.meta.env.VITE_USE_VERTEX_AI === 'true') {
      const userId = localStorage.getItem('userId') || 'anonymous';
      const VERTEX_API_URL = import.meta.env.VITE_VERTEX_API_URL || '/api/vertex-ai';

      const response = await fetch(VERTEX_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          userId,
          requestType: 'analysis',
          config: { temperature: 0.8, maxOutputTokens: 256 }
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        if (response.status === 429) {
          throw new Error('Daily AI request limit reached. Please try again tomorrow.');
        }
        throw new Error(error.error || `API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.text.trim();
    }

    // Fallback to Gemini API
    if (!ai) {
      throw new Error("AI not configured. Please enable Vertex AI or set VITE_GEMINI_API_KEY.");
    }

    const result = await rateLimiter.enqueue(async () => {
      const response = await ai!.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: { temperature: 0.8, maxOutputTokens: 256 }
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