import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, Stage, OnboardingAnalysis, JournalEntry, EntryAnalysis } from "../types";

// ✅ Environment setup for Vite (browser-safe)
import { GoogleGenAI } from "@google/genai";

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
    const prompt = `
        You are an empathetic, mindful identity coach. Analyze the user's answers to the onboarding questions to determine their current phase in their personal transformation journey.

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

        Based on these answers, classify their phase into one of three categories using the readiness scale (question 4) as a primary guide, but also considering the nuance of their written answers:
        - Healing Phase (Readiness score 0-5): The user needs to work on resolving past emotional patterns. They may express feelings of being stuck, confused, or mention past unresolved issues.
        - Reconstruction Phase (Readiness score 6-7): The user feels emotionally stable but needs guidance and structure. They have some clarity but are unsure of the next steps.
        - Expansion Phase (Readiness score 8-10): The user is ready for growth, embodiment, and actively creating their future self. They express excitement, readiness, and a clear vision.

        Your response MUST be a JSON object with the following structure:
        {
          "phase": "healing" | "reconstruction" | "expansion",
          "summary": "A short, empathetic paragraph summarizing where the user is, based on their answers.",
          "encouragement": "A single, gentle sentence of encouragement."
        }
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    phase: { type: Type.STRING, enum: ['healing', 'reconstruction', 'expansion'] },
                    summary: { type: Type.STRING },
                    encouragement: { type: Type.STRING }
                },
                required: ['phase', 'summary', 'encouragement']
            }
        }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as OnboardingAnalysis;
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

        Craft a single, poetic paragraph. Start with a phrase like "I am becoming someone who..." or "The version of me I’m stepping into..." Weave their answers into a cohesive and inspiring vision of the person they are growing into. The tone should be gentle, empowering, and affirmative.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });

    return response.text.trim();
}


export async function getDailyPrompt(profile: UserProfile): Promise<{ prompt: string, isMilestone: boolean }> {
  const { day } = getDayAndMonth(profile.startDate);

  const isMilestoneDay30 = day === 31 && profile.lastMilestoneDayCompleted < 30;
  const isMilestoneDay60 = day === 61 && profile.lastMilestoneDayCompleted < 60;
  const isMilestoneDay90 = day === 91 && profile.lastMilestoneDayCompleted < 90;
  const isMilestone = isMilestoneDay30 || isMilestoneDay60 || isMilestoneDay90;

  if (isMilestone) {
    return {
        prompt: `You've completed another 30 days. It's time for a deeper reflection.\n\nWhat version of me have I outgrown?\n\nWhat habits feel naturally part of me now?\n\nWhat’s one area that still feels fragile?`,
        isMilestone: true
    };
  }
  
  const { month } = getDayAndMonth(profile.startDate);

  const systemInstruction = `
You are “The Identity Reset Guide” — a mindful, emotionally intelligent journaling and reflection assistant.
Your role is to generate a single, daily reflection prompt for the user on their 90-day journey.

---
### 🎯 USER CONTEXT & PURPOSE
The user is on Day ${day} of their 90-day journey. This falls into Month ${month}.
Their current phase is: "${profile.stage}".
Their Ideal Self Manifesto (their north star) is: "${profile.idealSelfManifesto}"

Your purpose is to provide a single, thought-provoking prompt to guide their journaling for the day.

---
### 🧠 LOGIC FOR TIMELINE
- **Month 1:** Days 1–30
- **Month 2:** Days 31–60
- **Month 3:** Days 61–90

---
### 🌸 ARC 1 — Healing Phase (user stage is "healing")
*   **Month 1 – Healing:** Focus on awareness, release, self-forgiveness. Ex: “What emotion is asking to be seen gently today?”
*   **Month 2 – Re-authoring:** Focus on building compassion and trust. Ex: “What part of you is learning to trust again?”
*   **Month 3 – Embodiment:** Focus on living as the healed self. Ex: “How did you act today as your healed self?”

---
### 🌿 ARC 2 — Reconstruction Phase (user stage is "reconstruction")
*   **Month 1 – Getting Unstuck:** Focus on clarity and gentle activation. Ex: “What small decision can regain momentum?”
*   **Month 2 – Limiting Beliefs:** Focus on cognitive reframing. Ex: “What story have you outgrown?”
*   **Month 3 – Embodiment:** Focus on action and confidence. Ex: “How did your Ideal Self show up through you today?”

---
### 🌞 ARC 3 — Expansion Phase (user stage is "expansion")
*   **Month 1 – Confirmation:** Focus on stabilization and recognizing transformation. Ex: “What moment proved you’re no longer who you were?”
*   **Month 2 – Assuredness:** Focus on effortless trust and relaxed discipline. Ex: “Where can you do less and still feel aligned?”
*   **Month 3 – Full Embodiment:** Focus on living as the Ideal Self. Ex: “What felt completely natural today that once took effort?”

---
### 💬 OUTPUT FORMAT
Your entire response must be ONLY the text of the prompt. No extra words or formatting.
Example: "What emotion is asking to be seen gently today?"
---
End of instruction.
`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: systemInstruction
  });

  return { prompt: response.text.trim(), isMilestone: false };
}

export async function analyzeJournalEntry(entryText: string): Promise<EntryAnalysis> {
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

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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
}

export async function generateWeeklySummary(journalEntries: JournalEntry[], idealSelfManifesto: string): Promise<string> {
    const weeklyText = journalEntries.length > 0
      ? journalEntries.map(entry => `Day ${entry.day}:\nPrompt: ${entry.prompt}\nEntry: ${entry.rawText}\n`).join('\n---\n')
      : "The user did not write any journal entries this week. Acknowledge this gently and encourage them for the week ahead.";

    const prompt = `
        You are the user’s weekly guide. It is the end of a week in their 90-day journey.
        Review their Ideal Self Manifesto and their daily journal entries from the past 7 days.

        **User's Ideal Self Manifesto (their goal):**
        "${idealSelfManifesto}"

        **User's Journal Entries from the Past Week:**
        """
        ${weeklyText}
        """

        Now, generate a short, compassionate weekly summary. The summary should be a single, cohesive paragraph that does the following:
        1. Acknowledges the main emotional tone or theme of the week.
        2. Highlights one key insight or pattern that emerged from their writing.
        3. Suggests one small, gentle focus for the week ahead.
        4. Ends with a powerful affirmation inspired by their Ideal Self Manifesto that connects to the week's insight.

        Speak directly to the user ("You..."). Your tone should be warm, insightful, and encouraging.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });

    return response.text.trim();
}


export async function generateFinalSummary(profile: UserProfile, journalHistory: JournalEntry[], hunchHistory: JournalEntry[]): Promise<string> {
    const historyText = journalHistory.map(entry => `Day ${entry.day}: ${entry.rawText}`).join('\n\n');

    let hunchTextSection = '';
    if (hunchHistory && hunchHistory.length > 0) {
        const hunchEntriesText = hunchHistory.map(h => `Recorded on Day ${h.day}: ${h.rawText}`).join('\n\n');
        hunchTextSection = `
You also have access to the user's private "Intuitive Insights"—a collection of dreams and hunches they recorded. Use these to add color and depth to the summary.
"""
${hunchEntriesText}
"""
`;
    }

    const prompt = `
        You are a reflective narrator concluding the user's 90-Day Identity Reset journey.
        The user started in the "${profile.stage}" phase.
        Their Ideal Self Manifesto is: "${profile.idealSelfManifesto}"

        You have access to all of their daily journal entries from the past 90 days:
        """
        ${historyText}
        """
        ${hunchTextSection}

        Your task is to use this complete history to write a personalized closing summary.
        The response MUST be under 300 words, poetic yet grounded, and follow this exact structure:

        **Title:** Your 90-Day Evolution

        **Paragraph 1:** A warm congratulations, acknowledging their commitment and the courage it takes to show up for oneself consistently.

        **Paragraph 2:** A summary of the key themes of growth you detected in their reflections. Mention specific mindset shifts, new habits, or changes in self-perception that are evident from their entries. ${hunchHistory.length > 0 ? "If you see connections, briefly weave in themes from their intuitive insights, noting how their inner knowing might have guided their conscious journey." : ""}

        **Paragraph 3:** A reflection on their specific transformation arc, based on their starting phase:
        - If their stage was "healing": Highlight their journey of emotional release, self-compassion, and self-forgiveness.
        - If their stage was "reconstruction": Highlight how they regained momentum, challenged old beliefs, and built new foundations.
        - If their stage was "expansion": Highlight how they moved into a state of embodiment, effortless alignment, and living as their Ideal Self.

        **Paragraph 4:** Gentle forward guidance. Remind them that growth is a spiral, not a straight line. Invite them to rest and integrate, or to begin a new cycle when they feel ready.

        **Final Line:** A single, powerful, one-line affirmation spoken in their Ideal-Self's voice, derived from their manifesto.

        The entire response should be a single block of text formatted with Markdown for the title (using **).
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro', // Using a more powerful model for the final, complex summary
        contents: prompt,
    });

    return response.text.trim();
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