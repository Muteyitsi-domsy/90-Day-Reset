
import { UserProfile, Arc } from '../types';

/**
 * --- EXAMPLE PROMPTS PER ARC ---
 *
 * Arc: 'healing'
 * - Day 1 (Morning): "As you begin, what is one old feeling or pattern you're ready to start observing with gentleness, without needing to fix it?"
 * - Day 3 (Morning): "Looking back on yesterday, was there a moment where you treated yourself more kindly than you might have in the past? Describe it briefly."
 * - Day 35 (Start of Month 2 - Integration): "Reflect on an interaction from yesterday. Did your inner response feel different from how you might have reacted a month ago? What shifted?"
 *
 * Arc: 'unstuck'
 * - Day 1 (Morning): "What is the smallest possible action you could take today that feels like a step towards the person you want to become?"
 * - Day 3 (Morning): "Consider a routine from yesterday. What's one tiny adjustment you could make today to better align it with your goals?"
 * - Day 35 (Start of Month 2 - Consistency): "Yesterday, where did you feel the most friction or resistance? What can that feeling teach you about the path forward?"
 *
 * Arc: 'healed'
 * - Day 1 (Morning): "What quality of your ideal self do you want to embody and celebrate today?"
 * - Day 3 (Morning): "Describe a moment from yesterday where you felt truly at peace or aligned. What were the circumstances?"
 * - Day 35 (Start of Month 2 - Expansion): "How can you create a moment of unexpected joy or beauty for yourself today?"
 */

type PromptCategory = 'intention' | 'reflection';

interface Prompt {
    text: string;
    category: PromptCategory;
}

const shuffle = <T,>(array: T[]): T[] => {
    return array.sort(() => Math.random() - 0.5);
};

// Simplified prompt store for demonstration. A real app might fetch these from a remote config.
const PROMPTS: Record<Arc, Record<number, Prompt[]>> = {
    healing: {
        1: shuffle([ // Month 1: Awareness & Gentleness
            { text: "Looking back on yesterday, what emotion showed up unexpectedly? Let it be here without judgment.", category: 'reflection' },
            { text: "What is one old pattern you're ready to observe with kindness today?", category: 'intention' },
            { text: "Reflect on your dreams last night or your first feeling this morning. What message might it hold for you?", category: 'reflection' },
            { text: "How can you offer yourself a moment of quiet comfort today?", category: 'intention' },
        ]),
        2: shuffle([ // Month 2: Integration & Compassion
            { text: "Think of an interaction from yesterday. Did your inner response feel different from how you might have reacted a month ago?", category: 'reflection' },
            { text: "What is one compassionate boundary you can set for yourself today?", category: 'intention' },
            { text: "Where in your body did you feel tension yesterday? What might it be asking for?", category: 'reflection' },
            { text: "What part of your past is asking for a little more forgiveness today?", category: 'intention' },
        ]),
        3: shuffle([ // Month 3: Embodiment & Self-Trust
            { text: "Describe a moment from yesterday where your 'healed self' naturally took the lead.", category: 'reflection' },
            { text: "What choice today will honor the healing journey you've been on?", category: 'intention' },
            { text: "Looking back, what 'trigger' from yesterday felt less powerful than it used to?", category: 'reflection' },
            { text: "How will you trust your intuition in a small way today?", category: 'intention' },
        ]),
    },
    unstuck: {
        1: shuffle([ // Month 1: Clarity & Micro-Actions
            { text: "What is the smallest possible action you can take today that moves you 1% closer to your ideal self?", category: 'intention' },
            { text: "Reflecting on yesterday, where did you feel the most momentum? How can you build on that?", category: 'reflection' },
            { text: "What's one limiting thought you can challenge with a simple 'what if it's not true?' today?", category: 'intention' },
            { text: "Look back at yesterday. What task did you avoid? What's the real reason why?", category: 'reflection' },
        ]),
        2: shuffle([ // Month 2: Consistency & Beliefs
            { text: "What habit did you honor yesterday that your future self will thank you for?", category: 'reflection' },
            { text: "Describe one choice you will make today that aligns with your core values.", category: 'intention' },
            { text: "What story about yourself have you outgrown? How did you see evidence of that yesterday?", category: 'reflection' },
            { text: "What is one 'should' you can replace with a 'could' today?", category: 'intention' },
        ]),
        3: shuffle([ // Month 3: Embodiment & Confidence
            { text: "How did your Ideal Self show up through your actions or decisions yesterday?", category: 'reflection' },
            { text: "In what area will you act with more confidence and self-trust today?", category: 'intention' },
            { text: "What felt easier yesterday than it did a month ago? Acknowledge that progress.", category: 'reflection' },
            { text: "What decision today will be an investment in your future self?", category: 'intention' },
        ]),
    },
    healed: {
        1: shuffle([ // Month 1: Consolidation & Gratitude
            { text: "Describe a moment from yesterday where you felt completely like 'yourself'. What did that feel like?", category: 'reflection' },
            { text: "What quality of your ideal self do you want to embody and celebrate today?", category: 'intention' },
            { text: "What are you grateful for in this exact moment of your journey?", category: 'reflection' },
            { text: "How can you create a small moment of beauty or peace for yourself today?", category: 'intention' },
        ]),
        2: shuffle([ // Month 2: Expansion & Joy
            { text: "Where did you notice effortless alignment in your day yesterday?", category: 'reflection' },
            { text: "What is one way you can express your authentic self more freely today?", category: 'intention' },
            { text: "Looking back, what's something you worried about that never happened? What does that teach you about trust?", category: 'reflection' },
            { text: "How can you invite more play or joy into your day today?", category: 'intention' },
        ]),
        3: shuffle([ // Month 3: Full Embodiment & Radiance
            { text: "What felt completely natural yesterday that once would have taken great effort?", category: 'reflection' },
            { text: "How will you let your inner light shine a little brighter today?", category: 'intention' },
            { text: "Reflect on an act of kindness you gave or received yesterday. How did it feel?", category: 'reflection' },
            { text: "What does living as your Ideal Self mean to you *today*?", category: 'intention' },
        ]),
    },
};

// Use a simple in-memory cache to rotate through prompts and avoid immediate repetition.
const rotationCache: Record<string, number> = {};

export function getDailyPrompt(userProfile: UserProfile, dayIndex: number, totalEntries: number): string {
    const { arc, intentions } = userProfile;

    // Special milestone prompts
    if (dayIndex === 45 && intentions) {
        return `You've reached the halfway point of your journey. Your intention was:\n\n"${intentions}"\n\nTake a moment to reflect on this. How do you feel in relation to this intention today? Are you closer, further, or has the intention itself shifted?`;
    }

    if (dayIndex === 90 && intentions) {
        return `You've arrived at your final daily reflection. Your journey began with the intention:\n\n"${intentions}"\n\nLooking back over the past 90 days, what significance has this journey had on your life and your relationship with this intention, regardless of whether you feel you've "achieved" it?`;
    }
    
    // Scaffolding for new users
    if (totalEntries < 3) {
        const beginnerPrompts = [
            "What is one feeling present for you right now?",
            "What is your main intention for the day ahead?",
            "What's one thing, no matter how small, you're looking forward to today?"
        ];
        return beginnerPrompts[totalEntries];
    }
    
    const month = Math.min(3, Math.floor((dayIndex - 1) / 30) + 1);
    const promptsForMonth = PROMPTS[arc][month];
    
    if (!promptsForMonth || promptsForMonth.length === 0) {
        return "How are you feeling today, in this moment?"; // Fallback
    }

    const cacheKey = `${arc}-${month}`;
    const currentIndex = rotationCache[cacheKey] || 0;
    
    const prompt = promptsForMonth[currentIndex];

    // Update index for next time, looping back to 0 if at the end
    rotationCache[cacheKey] = (currentIndex + 1) % promptsForMonth.length;
    
    return prompt.text;
}