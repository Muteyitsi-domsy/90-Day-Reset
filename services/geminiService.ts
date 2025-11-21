
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, Arc, OnboardingAnalysis, JournalEntry, EntryAnalysis } from "../types";

// ✅ Environment setup for Vite (browser-safe)
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

if (!GEMINI_KEY) {
  console.warn("VITE_GEMINI_API_KEY is not set — Gemini features will run in preview mode.");
}

// Initialize Gemini AI client only if a key is available
export const ai = GEMINI_KEY
  ? new GoogleGenAI({ apiKey: GEMINI_KEY })
  : null;


export interface OnboardingAnswers {
  previousWork: string;
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
    // Check if AI client is available
    if (!ai) {
        throw new Error("Gemini API key not configured. Please ensure VITE_GEMINI_API_KEY is set in your environment.");
    }

    const prompt = `
        You are an empathetic, mindful identity coach. Analyze the user's answers to the onboarding questions to determine their current arc in their personal transformation journey.

        The user's answers are:
        1. Have you done inner emotional healing or reflection work before?
           - "${answers.previousWork}"
        2. What emotions or patterns feel most present right now?
           - "${answers.currentEmotions}"
        3. In one word, how do you feel about the future?
           - "${answers.futureFeeling}"
        4. On a scale of 1–10, how ready do you feel to evolve into a new version of yourself?
           - ${answers.readinessScale}
        5. Describe briefly what your Ideal Self might look or feel like.
           - "${answers.idealSelf}"

        Based on these answers, classify their arc into one of three categories using the readiness scale (question 4) as a primary guide, but also considering the nuance of their written answers:
        - healing (Readiness score 0-5): The user needs to work on resolving past emotional patterns. They may express feelings of being stuck, confused, or mention past unresolved issues.
        - unstuck (Readiness score 6-7): The user feels emotionally stable but needs guidance and structure to break current patterns. They have some clarity but are unsure of the next steps.
        - healed (Readiness score 8-10): The user is ready for growth, embodiment, and actively creating their future self. They express excitement, readiness, and a clear vision.

        Your response MUST be a JSON object with the following structure:
        {
          "phase": "healing" | "unstuck" | "healed",
          "summary": "A short, empathetic paragraph summarizing where the user is, based on their answers.",
          "encouragement": "A single, gentle sentence of encouragement."
        }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        phase: { type: Type.STRING, enum: ['healing', 'unstuck', 'healed'] },
                        summary: { type: Type.STRING },
                        encouragement: { type: Type.STRING }
                    },
                    required: ['phase', 'summary', 'encouragement']
                }
            }
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as OnboardingAnalysis;
    } catch (error) {
        console.error("Error analyzing onboarding answers:", error);
        throw new Error(`Failed to analyze onboarding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function generateIdealSelfManifesto(answers: IdealSelfAnswers): Promise<string> {
    // Check if AI client is available
    if (!ai) {
        throw new Error("Gemini API key not configured. Please ensure VITE_GEMINI_API_KEY is set in your environment.");
    }

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
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error generating manifesto:", error);
        throw new Error(`Failed to generate manifesto: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}


export async function analyzeJournalEntry(entryText: string): Promise<EntryAnalysis> {
    // Check if AI client is available
    if (!ai) {
        throw new Error("Gemini API key not configured. Daily insights are unavailable.");
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
        const response = await ai.models.generateContent({
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
    } catch (error) {
        console.error("Error in analyzeJournalEntry:", error);
        throw new Error(`Failed to analyze journal entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function generateFinalSummary(profile: UserProfile, journalHistory: JournalEntry[], hunchHistory: JournalEntry[]): Promise<string> {
    // Check if AI client is available
    if (!ai) {
        throw new Error("Gemini API key not configured. Final summary generation is unavailable.");
    }

    const historyText = journalHistory.map(entry => `Day ${entry.day}: ${entry.rawText}`).join('\n\n');

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
        healing: "What was recognized, what was released, what softened over these 90 days",
        unstuck: "What beliefs shifted, what momentum built, what was shed over these 90 days",
        healed: "What was embodied, what became natural, what expanded over these 90 days"
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
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash', // Using a powerful model for the final, complex summary
            contents: prompt,
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error generating final summary:", error);
        throw new Error(`Failed to generate final summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
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