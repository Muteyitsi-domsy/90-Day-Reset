
import { UserProfile, Arc, JournalEntry } from '../types';

/**
 * STRICT NO-REPEAT PROMPT GENERATOR
 *
 * Rules:
 * 1. NEVER repeat a prompt during the entire 90-day journey
 * 2. NEVER repeat a prompt across subsequent journeys if a user restarts
 * 3. Track ALL prompts ever shown permanently
 * 4. Check existing journal entries for used prompts
 */

type PromptCategory = 'intention' | 'reflection';

interface Prompt {
    text: string;
    category: PromptCategory;
}

// Persistent storage key for ALL prompts actually ANSWERED (permanent history)
const ALL_PROMPTS_HISTORY_KEY = 'allPromptsHistory';

// Cache key for today's prompt (so it persists across sessions within the same day)
const DAILY_PROMPT_CACHE_KEY = 'dailyPromptCache';

// Load all prompts ever answered from localStorage
const loadAllPromptsHistory = (): string[] => {
    try {
        const saved = localStorage.getItem(ALL_PROMPTS_HISTORY_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
};

/**
 * Mark a prompt as answered — only call this when user actually saves a journal entry.
 * This permanently retires the prompt so it won't be shown again.
 */
export const markPromptAsAnswered = (prompt: string) => {
    try {
        const history = loadAllPromptsHistory();
        if (!history.includes(prompt)) {
            history.push(prompt);
            localStorage.setItem(ALL_PROMPTS_HISTORY_KEY, JSON.stringify(history));
        }
    } catch (e) {
        console.warn('Failed to save prompt history:', e);
    }
};

/**
 * Get the cached prompt for today, if one exists.
 * Returns null if no cached prompt or if cached prompt is from a different day.
 */
const getCachedDailyPrompt = (dayIndex: number): string | null => {
    try {
        const cached = localStorage.getItem(DAILY_PROMPT_CACHE_KEY);
        if (!cached) return null;
        const { day, prompt } = JSON.parse(cached);
        if (day === dayIndex && prompt) return prompt;
        return null;
    } catch {
        return null;
    }
};

/**
 * Cache a prompt for today so the same prompt is shown across sessions.
 */
const cacheDailyPrompt = (dayIndex: number, prompt: string) => {
    try {
        localStorage.setItem(DAILY_PROMPT_CACHE_KEY, JSON.stringify({ day: dayIndex, prompt }));
    } catch (e) {
        console.warn('Failed to cache daily prompt:', e);
    }
};

// EXPANDED PROMPT POOL - 50 prompts per arc per month = 150 per arc = ~470 total
// Prompts sourced from arc philosophy + book: "Where the Healed Congregate"
// Every prompt is arc-native — no cross-arc borrowing
export const PROMPTS: Record<Arc, Record<number, Prompt[]>> = {
    release: {
        1: [ // Month 1: Awareness & Gentleness (50 prompts)
            { text: "Looking back on yesterday, what emotion showed up unexpectedly? Let it be here without judgment.", category: 'reflection' },
            { text: "What is one old pattern you're ready to observe with kindness today?", category: 'intention' },
            { text: "Reflect on your dreams last night or your first feeling this morning. What message might it hold for you?", category: 'reflection' },
            { text: "How can you offer yourself a moment of quiet comfort today?", category: 'intention' },
            { text: "What part of yourself feels most tender right now? How can you honor that tenderness?", category: 'reflection' },
            { text: "What would it look like to give yourself permission to rest today?", category: 'intention' },
            { text: "When did you last feel truly safe? What elements of that feeling can you create today?", category: 'reflection' },
            { text: "What old belief about yourself is ready to be gently questioned?", category: 'intention' },
            { text: "Where in your body are you holding tension from the past? Can you breathe into that space?", category: 'reflection' },
            { text: "What would your younger self need to hear from you today?", category: 'intention' },
            { text: "What emotion have you been avoiding? What would happen if you let it surface briefly?", category: 'reflection' },
            { text: "How can you treat yourself as gently as you would a dear friend today?", category: 'intention' },
            { text: "What small act of self-care felt meaningful yesterday?", category: 'reflection' },
            { text: "What boundary do you need to set with yourself about self-criticism?", category: 'intention' },
            { text: "When yesterday did you notice your inner critic speak? What did it say?", category: 'reflection' },
            { text: "What is one kind thing you can do for your body today?", category: 'intention' },
            { text: "What memory keeps surfacing that might need acknowledgment?", category: 'reflection' },
            { text: "How can you make space for imperfection today?", category: 'intention' },
            { text: "What did you need as a child that you can give yourself now?", category: 'reflection' },
            { text: "What would unconditional self-acceptance look like for you today?", category: 'intention' },
            { text: "Yesterday, when did you feel most at peace with yourself?", category: 'reflection' },
            { text: "What habit of self-neglect are you ready to let go of?", category: 'intention' },
            { text: "What emotion felt overwhelming yesterday? How did you cope?", category: 'reflection' },
            { text: "How can you honor your need for slowness today?", category: 'intention' },
            { text: "What part of your story are you ready to see with new eyes?", category: 'reflection' },
            { text: "What would healing feel like in your body today?", category: 'intention' },
            { text: "When yesterday did you dismiss your own feelings? What were they?", category: 'reflection' },
            { text: "What is one way you can nurture your inner child today?", category: 'intention' },
            { text: "What wound feels ready for attention, not fixing?", category: 'reflection' },
            { text: "How can you show up for yourself with compassion today?", category: 'intention' },
            { text: "What triggered you yesterday? What need was underneath it?", category: 'reflection' },
            { text: "What would it mean to forgive yourself for one small thing today?", category: 'intention' },
            { text: "What protective pattern served you once but now holds you back?", category: 'reflection' },
            { text: "How can you witness your pain without drowning in it today?", category: 'intention' },
            { text: "What gentle truth about yourself are you beginning to accept?", category: 'reflection' },
            { text: "Is there a story you've been telling about yourself that might be ready to be gently looked at — not discarded, just examined with a little more curiosity?", category: 'reflection' },
            { text: "What would it feel like, even just for today, to hold your past a little more lightly?", category: 'intention' },
            { text: "When did something small set off something bigger in you yesterday?", category: 'reflection' },
            { text: "What might that reaction have been holding — what older feeling was underneath it?", category: 'reflection' },
            { text: "In a moment of reaction yesterday, was there a feeling that had nothing to do with what had just happened?", category: 'reflection' },
            { text: "Is there something you've been carrying quietly — not quite guilt, not quite grief — that has never had the chance to simply be acknowledged?", category: 'reflection' },
            { text: "When you find yourself reaching for distraction, what might be asking for your attention underneath?", category: 'reflection' },
            { text: "Is there something you've been giving a wide berth — aware it's there, but not yet ready to look directly at it?", category: 'reflection' },
            { text: "Can you simply acknowledge its existence today, without having to open the door?", category: 'intention' },
            { text: "Has there been a feeling connected to your past that you've always moved through quickly — never quite letting it land?", category: 'reflection' },
            { text: "What would it be like to give that feeling a little more room today — just enough to breathe?", category: 'intention' },
            { text: "What is one thing you already know — somewhere in yourself — that you haven't yet let yourself act on?", category: 'intention' },
            { text: "Is there a feeling that has been following you lately that you haven't yet turned to face — just to acknowledge it?", category: 'reflection' },
            { text: "What would it mean to be curious about your own experience today, rather than critical of it?", category: 'intention' },
            { text: "What part of yourself has been asking for attention that you've been too busy to sit with?", category: 'reflection' },
        ],
        2: [ // Month 2: Integration & Compassion (47 prompts)
            { text: "Think of an interaction from yesterday. Did your inner response feel different from how you might have reacted a month ago?", category: 'reflection' },
            { text: "What is one compassionate boundary you can set for yourself today?", category: 'intention' },
            { text: "Where in your body did you feel tension yesterday? What might it be asking for?", category: 'reflection' },
            { text: "What part of your past is asking for a little more forgiveness today?", category: 'intention' },
            { text: "How have your reactions to stress changed since you started this journey?", category: 'reflection' },
            { text: "What self-soothing practice can you integrate into today?", category: 'intention' },
            { text: "When did you catch yourself being kind to yourself yesterday?", category: 'reflection' },
            { text: "What relationship pattern are you ready to examine with curiosity?", category: 'intention' },
            { text: "How did you respond to disappointment yesterday? What did you notice?", category: 'reflection' },
            { text: "What would it look like to extend grace to yourself today?", category: 'intention' },
            { text: "What trigger felt less intense yesterday compared to before?", category: 'reflection' },
            { text: "How can you integrate a moment of mindfulness into your routine today?", category: 'intention' },
            { text: "Yesterday, how did you handle a difficult emotion? What worked?", category: 'reflection' },
            { text: "What new way of relating to yourself are you practicing?", category: 'intention' },
            { text: "Where did you notice growth in your self-talk yesterday?", category: 'reflection' },
            { text: "What healthy coping mechanism can you strengthen today?", category: 'intention' },
            { text: "How did compassion show up in your day yesterday, for self or others?", category: 'reflection' },
            { text: "When yesterday did you pause before reacting? What happened?", category: 'reflection' },
            { text: "How can you anchor yourself in self-compassion today?", category: 'intention' },
            { text: "What feeling are you more comfortable sitting with now than before?", category: 'reflection' },
            { text: "How did you nurture yourself yesterday when things got hard?", category: 'reflection' },
            { text: "How can you honor both your progress and your struggles today?", category: 'intention' },
            { text: "How did you show up differently in a relationship yesterday?", category: 'reflection' },
            { text: "What integration work needs your attention today?", category: 'intention' },
            { text: "Where did you notice emotional regulation yesterday?", category: 'reflection' },
            { text: "What forgotten part of yourself is returning?", category: 'intention' },
            { text: "How are you different from when you started this journey?", category: 'reflection' },
            { text: "What old belief is keeping you in place?", category: 'reflection' },
            { text: "What does your stuckness protect you from?", category: 'reflection' },
            { text: "What did you learn about yourself through yesterday's challenges?", category: 'reflection' },
            { text: "When you see someone at ease with themselves, what does it stir in you?", category: 'reflection' },
            { text: "What might that stirring be pointing to in your own story?", category: 'reflection' },
            { text: "Is there a way of being that feels like home simply because it's familiar — even if it no longer serves you?", category: 'reflection' },
            { text: "In a recent interaction, were you responding to the person in front of you — or to someone from your past?", category: 'reflection' },
            { text: "What would a response to this moment — this person, this day — have looked like?", category: 'intention' },
            { text: "Is there a version of an old story you've been carrying that might look different if you gently held it from another angle?", category: 'intention' },
            { text: "What did the younger version of you learn about the world that you're still treating as fact?", category: 'reflection' },
            { text: "Is that belief still true — or did it belong to a time that has already passed?", category: 'reflection' },
            { text: "What did you get through that, at the time, you weren't sure you would?", category: 'reflection' },
            { text: "Have you ever allowed yourself to fully acknowledge that you made it through that?", category: 'intention' },
            { text: "Is there an old anger that's still shaping how you enter new rooms, new relationships, new conversations?", category: 'reflection' },
            { text: "What might it free up in you to set some of that down — even just for today?", category: 'intention' },
            { text: "Yesterday, when a difficult feeling arose, did it feel like something you were having — or something you were?", category: 'reflection' },
            { text: "What is the difference between those two things for you?", category: 'reflection' },
            { text: "Is there a pattern you've noticed in yourself this month that you can now hold with curiosity rather than judgment?", category: 'reflection' },
            { text: "What does it look like to take what you've been learning about yourself and live it — even in one small way today?", category: 'intention' },
        ],
        3: [ // Month 3: Embodiment & Self-Trust (50 prompts)
            { text: "Describe a moment from yesterday where your 'healed self' naturally took the lead.", category: 'reflection' },
            { text: "What choice today will honor the healing journey you've been on?", category: 'intention' },
            { text: "Looking back, what 'trigger' from yesterday felt less powerful than it used to?", category: 'reflection' },
            { text: "How will you trust your intuition in a small way today?", category: 'intention' },
            { text: "When yesterday did you respond from wholeness rather than wounding?", category: 'reflection' },
            { text: "What does embodying your healing look like today?", category: 'intention' },
            { text: "How did your body signal safety to you yesterday?", category: 'reflection' },
            { text: "What wisdom from your healing journey can you share with yourself today?", category: 'intention' },
            { text: "When did you feel most aligned with your healed self yesterday?", category: 'reflection' },
            { text: "How can you live from self-trust today?", category: 'intention' },
            { text: "What old fear no longer has power over you?", category: 'reflection' },
            { text: "What does it mean to be whole, not perfect, today?", category: 'intention' },
            { text: "Yesterday, where did peace show up unexpectedly?", category: 'reflection' },
            { text: "How can you embody compassion in your actions today?", category: 'intention' },
            { text: "What strength did you discover in yourself through this journey?", category: 'reflection' },
            { text: "How will you honor your transformation today?", category: 'intention' },
            { text: "When yesterday did you choose love over fear?", category: 'reflection' },
            { text: "What does sustainable healing look like for you going forward?", category: 'intention' },
            { text: "How has your relationship with yourself transformed?", category: 'reflection' },
            { text: "What ritual can you create to honor your healing today?", category: 'intention' },
            { text: "Yesterday, how did you respond to yourself with trust?", category: 'reflection' },
            { text: "What does freedom from the past feel like in your body?", category: 'intention' },
            { text: "How are you showing up differently in the world now?", category: 'reflection' },
            { text: "What commitment to yourself will you make today?", category: 'intention' },
            { text: "When yesterday did healing feel effortless?", category: 'reflection' },
            { text: "What inner resources do you now have access to?", category: 'reflection' },
            { text: "How can you maintain connection with your healed self today?", category: 'intention' },
            { text: "What does living as your healed self mean today?", category: 'intention' },
            { text: "What does self-trust look like for you today?", category: 'intention' },
            { text: "What would your healed self want you to know today?", category: 'intention' },
            { text: "If you removed your pain from how you introduce yourself — internally, not just to others — who remains?", category: 'reflection' },
            { text: "How do you relate to what you've been through today — is it something you carry, something you've processed, or something that simply belongs to your story?", category: 'reflection' },
            { text: "Is there something from your past that has genuinely healed — but that you still return to out of habit?", category: 'reflection' },
            { text: "What would it look like to let that thing be part of your history rather than your present?", category: 'intention' },
            { text: "When a familiar old thought surfaced yesterday, what did you do with it?", category: 'reflection' },
            { text: "What would it feel like to simply notice it passing — without following it or pushing it away?", category: 'intention' },
            { text: "Is there something you've found easier to forgive in others than in yourself?", category: 'reflection' },
            { text: "What would self-forgiveness look like today — not as a grand act, but as a quiet one?", category: 'intention' },
            { text: "Is there a relationship where love and distance coexist for you?", category: 'reflection' },
            { text: "Have you made peace with the fact that those two things can be true at the same time?", category: 'intention' },
            { text: "What quality in yourself did your survival reveal — one you might not have known was there before?", category: 'intention' },
            { text: "What does it feel like to know where your wound is without being afraid of it?", category: 'reflection' },
            { text: "When yesterday did you respond rather than react?", category: 'reflection' },
            { text: "What does it mean to carry your story lightly — not ignoring it, but no longer being pulled under by it?", category: 'intention' },
            { text: "Is there a version of yourself you trust now that you didn't before this journey began?", category: 'reflection' },
            { text: "What would it look like to move through today as someone at peace with their own history?", category: 'intention' },
            { text: "When yesterday did you feel the difference between who you were and who you are becoming?", category: 'reflection' },
            { text: "What does it mean to be genuinely safe — not just for others, but for yourself?", category: 'intention' },
            { text: "What old reaction no longer belongs to the version of you that you're living into?", category: 'reflection' },
            { text: "How does it feel to know that what happened to you is part of your story — but not the whole of it?", category: 'intention' },
        ],
    },
    reaffirm: {
        1: [ // Month 1: Clarity & Micro-Actions (50 prompts)
            { text: "What is the smallest possible action you can take today that moves you 1% closer to your ideal self?", category: 'intention' },
            { text: "Reflecting on yesterday, where did you feel the most momentum? How can you build on that?", category: 'reflection' },
            { text: "What's one limiting thought you can challenge with a simple 'what if it's not true?' today?", category: 'intention' },
            { text: "Look back at yesterday. What task did you avoid? What's the real reason why?", category: 'reflection' },
            { text: "What tiny step can you take right now toward something you've been putting off?", category: 'intention' },
            { text: "Yesterday, when did you feel stuck? What was happening in your mind?", category: 'reflection' },
            { text: "What one decision can you make today that your future self will thank you for?", category: 'intention' },
            { text: "What story do you tell yourself about why you can't move forward?", category: 'reflection' },
            { text: "How can you make starting easier for yourself today?", category: 'intention' },
            { text: "When yesterday did you notice resistance? What was underneath it?", category: 'reflection' },
            { text: "What is the next single step, not the whole staircase, that you can take today?", category: 'intention' },
            { text: "What would you do if you knew you couldn't fail?", category: 'reflection' },
            { text: "How can you reduce friction on one important task today?", category: 'intention' },
            { text: "Yesterday, what gave you energy? What drained you?", category: 'reflection' },
            { text: "What permission do you need to give yourself to move forward?", category: 'intention' },
            { text: "What fear is disguised as procrastination?", category: 'reflection' },
            { text: "How can you make progress visible to yourself today?", category: 'intention' },
            { text: "When yesterday did you surprise yourself with action?", category: 'reflection' },
            { text: "What would happen if you did just 5 minutes of what you've been avoiding?", category: 'intention' },
            { text: "What's the cost of staying stuck in this area of your life?", category: 'reflection' },
            { text: "How can you build momentum through small wins today?", category: 'intention' },
            { text: "What micro-habit can you start today?", category: 'intention' },
            { text: "Yesterday, where did clarity emerge? How can you create more of that?", category: 'reflection' },
            { text: "What would you attempt if you weren't afraid of looking foolish?", category: 'intention' },
            { text: "How can you reward yourself for small progress today?", category: 'intention' },
            { text: "What constraint can you remove to make action easier today?", category: 'intention' },
            { text: "When did you last take a risk? What happened?", category: 'reflection' },
            { text: "How can you be 1% braver today?", category: 'intention' },
            { text: "What area of life feels most ready for movement?", category: 'reflection' },
            { text: "What would done look like, even imperfectly?", category: 'intention' },
            { text: "Yesterday, what small action created unexpected momentum?", category: 'reflection' },
            { text: "What can you simplify to make progress possible today?", category: 'intention' },
            { text: "Is the story you carry about yourself one you've consciously chosen — or one that was handed to you and never questioned?", category: 'reflection' },
            { text: "What rule or belief about how life works did you absorb growing up that you've never stopped to examine?", category: 'reflection' },
            { text: "What is one insight you've had about yourself that you know — but haven't yet lived?", category: 'intention' },
            { text: "If you already know what the next step is, what is the honest reason you haven't taken it yet?", category: 'reflection' },
            { text: "What would become your responsibility if things in your life actually changed?", category: 'reflection' },
            { text: "Which of the identities you carry — roles, labels, descriptions — actually feel like you, and which were assigned to you?", category: 'reflection' },
            { text: "Is there someone in your life who seems to tread carefully around you — and what might they be responding to?", category: 'reflection' },
            { text: "If you were completely honest with yourself today — what is still unfinished?", category: 'reflection' },
            { text: "Which of your closest connections were formed around a shared struggle — and what holds them together beyond that?", category: 'reflection' },
            { text: "What do the people closest to you know about you beyond what you've been through?", category: 'reflection' },
            { text: "What is one belief about yourself you are ready to update — and what single action today would begin to prove the new belief true?", category: 'intention' },
            { text: "What would the clearest, most grounded version of you do today that your current self keeps postponing?", category: 'intention' },
            { text: "What is one area of your life where you keep waiting for the right moment to begin?", category: 'reflection' },
            { text: "What does the version of you who has already decided look like today?", category: 'intention' },
            { text: "When yesterday did you choose comfort over the direction you actually want to go?", category: 'reflection' },
            { text: "What would you begin today if you trusted that starting imperfectly is still starting?", category: 'intention' },
            { text: "What is one small thing that, if you did it consistently, would begin to change how you see yourself?", category: 'intention' },
            { text: "What did you know you needed to do yesterday that you didn't do?", category: 'reflection' },
        ],
        2: [ // Month 2: Consistency & Beliefs (52 prompts)
            { text: "What habit did you honor yesterday that your future self will thank you for?", category: 'reflection' },
            { text: "Describe one choice you will make today that aligns with your core values.", category: 'intention' },
            { text: "What story about yourself have you outgrown? How did you see evidence of that yesterday?", category: 'reflection' },
            { text: "What is one 'should' you can replace with a 'could' today?", category: 'intention' },
            { text: "How many consecutive days have you taken action toward your goal? How does that feel?", category: 'reflection' },
            { text: "What does showing up for yourself look like today?", category: 'intention' },
            { text: "Yesterday, when did you stay consistent despite resistance?", category: 'reflection' },
            { text: "What belief about your capabilities are you actively updating?", category: 'intention' },
            { text: "What new pattern are you establishing? How is it going?", category: 'reflection' },
            { text: "How can you make your positive habits more automatic today?", category: 'intention' },
            { text: "When yesterday did discipline feel like self-love?", category: 'reflection' },
            { text: "What identity shift is happening as you take consistent action?", category: 'intention' },
            { text: "What would the person you're becoming do today?", category: 'reflection' },
            { text: "How can you strengthen your commitment to yourself today?", category: 'intention' },
            { text: "Yesterday, how did you handle wanting to quit? What helped?", category: 'reflection' },
            { text: "What evidence contradicts your old limiting beliefs?", category: 'intention' },
            { text: "How is your self-image changing through consistent action?", category: 'reflection' },
            { text: "What non-negotiable will you honor today?", category: 'intention' },
            { text: "When yesterday did you choose long-term gain over short-term comfort?", category: 'reflection' },
            { text: "What does sustainable progress look like for you?", category: 'intention' },
            { text: "How are your habits shaping your identity?", category: 'reflection' },
            { text: "What commitment can you deepen today?", category: 'intention' },
            { text: "Yesterday, where did consistency create freedom?", category: 'reflection' },
            { text: "What old story are you proving wrong through your actions?", category: 'intention' },
            { text: "How has your relationship with discipline changed?", category: 'reflection' },
            { text: "What foundation are you building today?", category: 'intention' },
            { text: "When yesterday did you feel proud of your consistency?", category: 'reflection' },
            { text: "What does mastery look like in the area you're developing?", category: 'intention' },
            { text: "How are small actions compounding into bigger changes?", category: 'reflection' },
            { text: "What belief will you reinforce through action today?", category: 'intention' },
            { text: "Yesterday, how did you handle setbacks? What did you learn?", category: 'reflection' },
            { text: "What routine is becoming second nature?", category: 'intention' },
            { text: "How is your capacity for discipline expanding?", category: 'reflection' },
            { text: "What does integrity with yourself look like today?", category: 'intention' },
            { text: "When yesterday did action feel aligned rather than forced?", category: 'reflection' },
            { text: "What old narrative are you actively rewriting?", category: 'intention' },
            { text: "What boundary conversation are you preparing to have?", category: 'intention' },
            { text: "What pattern did you interrupt yesterday?", category: 'reflection' },
            { text: "What emotional skill are you getting better at?", category: 'reflection' },
            { text: "Is there a version of your struggle that has become familiar enough to feel like safety?", category: 'reflection' },
            { text: "What is something true about who you are that you've never said out loud to anyone?", category: 'reflection' },
            { text: "If you were to speak about something difficult from your past today, would it feel like a report or like a re-entry?", category: 'reflection' },
            { text: "Where in your life right now are you still living in a version of events that has already ended?", category: 'reflection' },
            { text: "Is there a version of yourself you tone down or edit when you're around certain people?", category: 'reflection' },
            { text: "What does it cost you each time you make yourself smaller to keep the peace?", category: 'reflection' },
            { text: "Who in your life consistently brings out a version of yourself you're proud of?", category: 'reflection' },
            { text: "Is there a relationship that requires you to be less than you are just to keep it comfortable for someone else?", category: 'reflection' },
            { text: "What do the people closest to you absorb when you are not yet at peace with yourself?", category: 'reflection' },
            { text: "What would it look like to tend to a difficult feeling before it becomes someone else's experience?", category: 'intention' },
            { text: "Why are you doing this work — and is that reason enough to sustain you on the harder days?", category: 'reflection' },
            { text: "What new belief about yourself are you ready to act from today — even before it fully feels true?", category: 'intention' },
            { text: "What would you do today if you trusted the version of yourself you are becoming?", category: 'intention' },
        ],
        3: [ // Month 3: Embodiment & Confidence (50 prompts)
            { text: "How did your Ideal Self show up through your actions or decisions yesterday?", category: 'reflection' },
            { text: "In what area will you act with more confidence and self-trust today?", category: 'intention' },
            { text: "What felt easier yesterday than it did a month ago? Acknowledge that progress.", category: 'reflection' },
            { text: "What decision today will be an investment in your future self?", category: 'intention' },
            { text: "When yesterday did you feel fully capable?", category: 'reflection' },
            { text: "How can you expand your comfort zone today?", category: 'intention' },
            { text: "What new capability have you developed through this journey?", category: 'reflection' },
            { text: "How will you use your growing confidence today?", category: 'intention' },
            { text: "Yesterday, where did you act from strength rather than fear?", category: 'reflection' },
            { text: "What bold step are you ready to take?", category: 'intention' },
            { text: "How has your sense of what's possible changed?", category: 'reflection' },
            { text: "What will you attempt today that you wouldn't have 60 days ago?", category: 'intention' },
            { text: "When yesterday did you trust yourself fully?", category: 'reflection' },
            { text: "How can you embody your ideal self in your work today?", category: 'intention' },
            { text: "What fear have you outgrown?", category: 'reflection' },
            { text: "What does confident action look like for you today?", category: 'intention' },
            { text: "Yesterday, how did momentum carry you forward?", category: 'reflection' },
            { text: "What new standard are you setting for yourself?", category: 'intention' },
            { text: "How are you showing up differently now?", category: 'reflection' },
            { text: "What leadership can you take today?", category: 'intention' },
            { text: "What capacity have you unlocked?", category: 'reflection' },
            { text: "What commitment will you make to your continued growth today?", category: 'intention' },
            { text: "How has your identity as a person of action solidified?", category: 'reflection' },
            { text: "Is the growth you're doing for yourself — or is part of you still waiting for someone to notice?", category: 'reflection' },
            { text: "Is there someone in your life you've been trying to bring along on your journey — and is that impulse serving them, or serving you?", category: 'reflection' },
            { text: "In a recent interaction, were you being yourself — or the version of yourself you thought would be received well?", category: 'reflection' },
            { text: "Is there a situation you've been over-explaining or justifying — and what would it look like to simply live your decision instead?", category: 'intention' },
            { text: "Is there a way of showing up — more confident, more boundaried, more at ease — that still feels like it needs permission?", category: 'reflection' },
            { text: "What would it look like to act from your new self today, without waiting until it feels fully earned?", category: 'intention' },
            { text: "When a difficult feeling arises today, can you give it space internally before it becomes words or actions?", category: 'intention' },
            { text: "What would the people closest to you experience if you were fully at peace with yourself?", category: 'reflection' },
            { text: "Is there something good in your life right now that you find it hard to simply trust and receive?", category: 'reflection' },
            { text: "What is the version of yourself that the people watching you are learning from — and is that the lesson you want to pass on?", category: 'reflection' },
            { text: "What are all the things you are — beyond what you've been through?", category: 'reflection' },
            { text: "If you were to write a new first line for yourself today — not erasing anything, just beginning again — what would it say?", category: 'intention' },
            { text: "What decision today would the most confident version of yourself make without hesitation?", category: 'intention' },
            { text: "When did you act from confidence yesterday — not performance, but genuine self-assurance?", category: 'reflection' },
            { text: "What decision can you make today purely from who you are becoming, without explaining it to anyone?", category: 'intention' },
            { text: "Is there a version of yourself you've been rehearsing in private that is ready to be lived in public?", category: 'reflection' },
            { text: "What does it look like to be the person you've spent these months building — today, in the smallest interactions?", category: 'intention' },
            { text: "Where yesterday did you catch yourself waiting for permission to be who you already are?", category: 'reflection' },
            { text: "What would it mean to stop rehearsing your new self and simply be them today?", category: 'intention' },
            { text: "When yesterday did you act from your values without needing anyone to validate the choice?", category: 'reflection' },
            { text: "What is one way you can lead from your identity today rather than perform it?", category: 'intention' },
            { text: "Is there a conversation you've been avoiding that the most grounded version of you would simply have?", category: 'reflection' },
            { text: "What does it feel like when your actions and your values are fully aligned?", category: 'reflection' },
            { text: "What have you stopped apologising for in yourself?", category: 'reflection' },
            { text: "How can you honour the work you've done by fully living it today — not revisiting it, just inhabiting it?", category: 'intention' },
            { text: "When yesterday did you trust your own judgement without second-guessing it?", category: 'reflection' },
            { text: "What would it look like to be fully yourself in the one situation today where you'd normally hold back?", category: 'intention' },
        ],
    },
    reignition: {
        1: [ // Month 1: Consolidation & Gratitude (50 prompts)
            { text: "Describe a moment from yesterday where you felt completely like 'yourself'. What did that feel like?", category: 'reflection' },
            { text: "What quality of your ideal self do you want to embody and celebrate today?", category: 'intention' },
            { text: "What are you grateful for in this exact moment of your journey?", category: 'reflection' },
            { text: "How can you create a small moment of beauty or peace for yourself today?", category: 'intention' },
            { text: "When yesterday did you feel most aligned?", category: 'reflection' },
            { text: "What does living from wholeness look like today?", category: 'intention' },
            { text: "What abundance did you notice in your life yesterday?", category: 'reflection' },
            { text: "When yesterday did gratitude arise naturally?", category: 'reflection' },
            { text: "How did peace show up in your day yesterday?", category: 'reflection' },
            { text: "What can you appreciate about your journey today?", category: 'intention' },
            { text: "Yesterday, when did you feel fully present?", category: 'reflection' },
            { text: "How can you anchor in contentment today?", category: 'intention' },
            { text: "What growth are you most grateful for?", category: 'reflection' },
            { text: "How will you honor your well-being today?", category: 'intention' },
            { text: "When yesterday did you feel complete?", category: 'reflection' },
            { text: "What simple pleasure can you savor today?", category: 'intention' },
            { text: "How has your relationship with yourself improved?", category: 'reflection' },
            { text: "What will you celebrate about yourself today?", category: 'intention' },
            { text: "Yesterday, where did you notice ease?", category: 'reflection' },
            { text: "What blessing are you aware of right now?", category: 'reflection' },
            { text: "How will you nurture your sense of fulfillment today?", category: 'intention' },
            { text: "When yesterday did you feel truly grateful?", category: 'reflection' },
            { text: "What does appreciation look like today?", category: 'intention' },
            { text: "How did you experience abundance yesterday?", category: 'reflection' },
            { text: "What will you acknowledge about your progress today?", category: 'intention' },
            { text: "Yesterday, what felt sacred?", category: 'reflection' },
            { text: "How can you cultivate more presence today?", category: 'intention' },
            { text: "What has healed that you once thought couldn't?", category: 'reflection' },
            { text: "How will you express gratitude today?", category: 'intention' },
            { text: "What does savoring life look like today?", category: 'intention' },
            { text: "How has your capacity for gratitude expanded?", category: 'reflection' },
            { text: "How can you consolidate your healing gains today?", category: 'intention' },
            { text: "How will you celebrate your journey today?", category: 'intention' },
            { text: "How can you celebrate your transformation today?", category: 'intention' },
            { text: "When yesterday did you feel deeply content?", category: 'reflection' },
            { text: "What would be the very first thing someone learns about you, if your story started from your strength rather than your wound?", category: 'reflection' },
            { text: "What did you discover you were capable of through the hardest chapter of your life?", category: 'reflection' },
            { text: "Have you ever allowed yourself to feel genuinely proud of who you've become — not as performance, but as a quiet acknowledgement to yourself?", category: 'intention' },
            { text: "Is there a place in your life where you've grown beyond something old but haven't yet settled into what comes next?", category: 'reflection' },
            { text: "What would it look like to find some grace for that in-between space — to trust it's part of the process, not a problem?", category: 'intention' },
            { text: "Is there someone whose pace of growth has started to feel frustrating — and what does that frustration tell you about your own journey?", category: 'reflection' },
            { text: "Is there a season of quiet or solitude you're in right now that your instinct wants to rush through — and what might it be offering you?", category: 'reflection' },
            { text: "Who in your life are you still trying to carry — and what would it free up in you to trust them with their own journey?", category: 'reflection' },
            { text: "When you fall short of the version of yourself you're becoming, how quickly do you return to yourself?", category: 'reflection' },
            { text: "What helps you find your way back when you drift?", category: 'reflection' },
            { text: "Is there anywhere your growth has quietly become a measuring stick — for yourself or for others?", category: 'reflection' },
            { text: "When something genuinely good arrived in your life recently, did you allow yourself to simply receive it?", category: 'reflection' },
            { text: "What are you grateful for today that you would not have been able to see or appreciate before this journey?", category: 'intention' },
            { text: "What does it feel like to simply be here — in this version of yourself, on this day?", category: 'intention' },
            { text: "What about where you are right now — this version of your life — deserves to be savoured rather than rushed through?", category: 'reflection' },
        ],
        2: [ // Month 2: Expansion & Joy (58 prompts)
            { text: "Where did you notice effortless alignment in your day yesterday?", category: 'reflection' },
            { text: "What is one way you can express your authentic self more freely today?", category: 'intention' },
            { text: "Looking back, what's something you worried about that never happened? What does that teach you about trust?", category: 'reflection' },
            { text: "How can you invite more play or joy into your day today?", category: 'intention' },
            { text: "When yesterday did you feel expansive?", category: 'reflection' },
            { text: "What new experience will you welcome today?", category: 'intention' },
            { text: "How did joy surprise you yesterday?", category: 'reflection' },
            { text: "What does expansion look like for you today?", category: 'intention' },
            { text: "Yesterday, where did you take a playful risk?", category: 'reflection' },
            { text: "How can you stretch beyond your usual today?", category: 'intention' },
            { text: "What made you laugh yesterday?", category: 'reflection' },
            { text: "What does joyful living mean today?", category: 'intention' },
            { text: "When yesterday did you feel freedom?", category: 'reflection' },
            { text: "How can you make today feel lighter?", category: 'intention' },
            { text: "What are you excited about right now?", category: 'reflection' },
            { text: "What adventure can you create today?", category: 'intention' },
            { text: "Yesterday, how did you express yourself authentically?", category: 'reflection' },
            { text: "How can you amplify your joy today?", category: 'intention' },
            { text: "What new possibility are you opening to?", category: 'reflection' },
            { text: "What will you explore today?", category: 'intention' },
            { text: "How can you expand your sense of what's possible today?", category: 'intention' },
            { text: "What unexpected joy did you encounter yesterday?", category: 'reflection' },
            { text: "How is your life becoming richer?", category: 'reflection' },
            { text: "What creative expression will you engage in today?", category: 'intention' },
            { text: "Yesterday, where did you feel most free?", category: 'reflection' },
            { text: "How can you spread joy today?", category: 'intention' },
            { text: "What is expanding in your life?", category: 'reflection' },
            { text: "What playful energy will you bring today?", category: 'intention' },
            { text: "How can you create space for spontaneity today?", category: 'intention' },
            { text: "What brings you alive?", category: 'reflection' },
            { text: "How will you say yes to life today?", category: 'intention' },
            { text: "Yesterday, what filled your cup?", category: 'reflection' },
            { text: "How can you share your light with others today?", category: 'intention' },
            { text: "What does your healed self want to create?", category: 'reflection' },
            { text: "How has your capacity for joy expanded?", category: 'reflection' },
            { text: "When yesterday did you feel unstoppable?", category: 'reflection' },
            { text: "How can you share what you've learned with others today?", category: 'intention' },
            { text: "What does moving forward with ease look like today?", category: 'intention' },
            { text: "What does your unstuck self want to create next?", category: 'reflection' },
            { text: "How can you expand your capacity for joy today?", category: 'intention' },
            { text: "What quality will you radiate today?", category: 'intention' },
            { text: "How can you spread positivity today?", category: 'intention' },
            { text: "When yesterday did you feel most alive?", category: 'reflection' },
            { text: "What would today look and feel like if you moved through it as the most whole, most settled version of yourself?", category: 'intention' },
            { text: "What have you discovered you enjoy, value, or want — that you didn't know about yourself before this season?", category: 'reflection' },
            { text: "What is something that genuinely fills you up right now — and are you letting yourself have it fully, without guilt or reservation?", category: 'reflection' },
            { text: "Who extended patience or grace to you when you were not yet where you are today — and how can you offer that same quality to someone right now?", category: 'intention' },
            { text: "Is there someone whose struggle you've been trying to solve — and what would it look like to simply be present with them instead?", category: 'reflection' },
            { text: "How has the way you enter relationships changed — what do you bring now that you didn't before?", category: 'reflection' },
            { text: "Is there a space or relationship where you are still making yourself smaller than you actually are?", category: 'reflection' },
            { text: "What would it look like to show up fully there — without editing or apologising for who you've become?", category: 'intention' },
            { text: "What does the next chapter of your growth look like — not as a destination to arrive at, but as a way of living to expand into?", category: 'reflection' },
            { text: "Is there a version of peace or contentment you've been postponing — waiting until you've done enough to deserve it?", category: 'reflection' },
            { text: "What would genuine rest look like for you today — not collapse, not distraction, but true replenishment?", category: 'intention' },
            { text: "What parts of yourself — interests, qualities, ways of being — are you just beginning to reclaim or discover in this season?", category: 'reflection' },
            { text: "Where in your life right now do you feel most free — and how can you create more of that today?", category: 'intention' },
            { text: "What surprised you about yourself this week — something you handled, expressed, or experienced differently than you once would have?", category: 'reflection' },
            { text: "What are you excited about that you haven't yet told anyone?", category: 'reflection' },
        ],
        3: [ // Month 3: Full Embodiment & Radiance (60 prompts)
            { text: "What felt completely natural yesterday that once would have taken great effort?", category: 'reflection' },
            { text: "How will you let your inner light shine a little brighter today?", category: 'intention' },
            { text: "Reflect on an act of kindness you gave or received yesterday. How did it feel?", category: 'reflection' },
            { text: "What does living as your Ideal Self mean to you *today*?", category: 'intention' },
            { text: "When yesterday did you embody your highest self?", category: 'reflection' },
            { text: "How can you share your gifts with others today?", category: 'intention' },
            { text: "What wisdom have you gained through this journey?", category: 'reflection' },
            { text: "How will you live fully expressed today?", category: 'intention' },
            { text: "Yesterday, how did you make a difference?", category: 'reflection' },
            { text: "What does radiance mean for you today?", category: 'intention' },
            { text: "How has your presence changed?", category: 'reflection' },
            { text: "What will you contribute to the world today?", category: 'intention' },
            { text: "When yesterday did you feel truly magnetic?", category: 'reflection' },
            { text: "How can you inspire others today?", category: 'intention' },
            { text: "What do you now embody effortlessly?", category: 'reflection' },
            { text: "How will you honor your full expression today?", category: 'intention' },
            { text: "What does mastery of self look like today?", category: 'intention' },
            { text: "How are you becoming a beacon for others?", category: 'reflection' },
            { text: "What legacy are you creating today?", category: 'intention' },
            { text: "When yesterday did you feel your purpose?", category: 'reflection' },
            { text: "How can you embody love today?", category: 'intention' },
            { text: "How will you celebrate your radiance today?", category: 'intention' },
            { text: "Yesterday, what did you give freely?", category: 'reflection' },
            { text: "What does alignment with your purpose feel like today?", category: 'intention' },
            { text: "How has your light grown?", category: 'reflection' },
            { text: "What will you create from this place of wholeness today?", category: 'intention' },
            { text: "When yesterday did you feel your full power?", category: 'reflection' },
            { text: "What has this journey taught you about yourself?", category: 'reflection' },
            { text: "How will you integrate all you've become as this journey ends?", category: 'intention' },
            { text: "What does living as your healed, radiant self mean going forward?", category: 'reflection' },
            { text: "How will you continue to shine?", category: 'intention' },
            { text: "What are you ready to create from this new beginning?", category: 'reflection' },
            { text: "What legacy of healing are you creating?", category: 'intention' },
            { text: "How will you integrate all you've learned as this journey ends?", category: 'reflection' },
            { text: "What transformation are you most proud of?", category: 'reflection' },
            { text: "Yesterday, what achievement felt natural?", category: 'reflection' },
            { text: "How will you maintain your momentum beyond this journey?", category: 'intention' },
            { text: "What does living fully expressed look like today?", category: 'intention' },
            { text: "Yesterday, what came easily that once was hard?", category: 'reflection' },
            { text: "What will you continue to build?", category: 'reflection' },
            { text: "How will you honor all you've accomplished as this journey ends?", category: 'intention' },
            { text: "When yesterday did you feel limitless?", category: 'reflection' },
            { text: "What does thriving look like today?", category: 'intention' },
            { text: "What has your journey taught you about the many different ways people find their way to themselves?", category: 'reflection' },
            { text: "What have you built in yourself over these months that you are quietly, genuinely proud of?", category: 'reflection' },
            { text: "What do you want the people closest to you to have witnessed — in how you lived, how you treated yourself, how you moved through difficulty?", category: 'reflection' },
            { text: "Where in your life are you giving from fullness — and where are you giving from a place that still needs tending?", category: 'reflection' },
            { text: "What does it feel like when your mind returns to peace after being unsettled?", category: 'reflection' },
            { text: "How quickly does that return happen now compared to before?", category: 'reflection' },
            { text: "What would it mean to make that return to peace your natural rhythm — not something you have to work for, but the place you come home to?", category: 'intention' },
            { text: "What are you modelling for the people watching you — in how you handle difficulty, how you speak about yourself, how you treat others?", category: 'reflection' },
            { text: "What is the first thing in your story that changes — for the people who come after you — because of the work you've done on yourself?", category: 'reflection' },
            { text: "What does it mean to you that the version of yourself you're becoming will be someone else's reference point for what is possible?", category: 'reflection' },
            { text: "What do you know to be true about yourself today that you couldn't have said with confidence when this journey began?", category: 'reflection' },
            { text: "How will you carry what you've learned about yourself beyond this season — not as a practice you follow, but as a person you've become?", category: 'intention' },
            { text: "What does living fully expressed look and feel like for you today — not as an aspiration, but as a lived reality?", category: 'intention' },
            { text: "What would you want to say to someone just starting out on the journey you've been on?", category: 'intention' },
            { text: "Yesterday, where did you overflow with positivity?", category: 'reflection' },
            { text: "How can you maintain this state of being?", category: 'intention' },
            { text: "What are you ready to create from this healed, expanded version of yourself?", category: 'reflection' },
        ],
    },
};

// Fisher-Yates shuffle algorithm
const shuffle = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

/**
 * Get a unique daily prompt that has NEVER been shown before
 *
 * @param userProfile - The user's profile
 * @param dayIndex - Current day in the journey (1-90)
 * @param journalEntries - All existing journal entries (to check used prompts)
 */
export function getDailyPrompt(userProfile: UserProfile, dayIndex: number, journalEntries: JournalEntry[]): string {
    const { arc, intentions } = userProfile;

    // Check if we already have a cached prompt for today — return it immediately
    // This ensures the same prompt persists across sessions within the same day
    const cachedPrompt = getCachedDailyPrompt(dayIndex);
    if (cachedPrompt) {
        return cachedPrompt;
    }

    // Get Day 1 entry for "Then & Now" reflections
    const dayOneEntry = journalEntries.find(e => e.day === 1 && e.type === 'daily');
    const dayOneText = dayOneEntry?.rawText || null;

    // Special milestone prompts (these are unique and only shown once)

    // Day 30: First "Then & Now" reflection
    if (dayIndex === 30 && dayOneText) {
        const milestonePrompt = `You've completed your first month. Here's what you wrote on Day 1:\n\n"${dayOneText.slice(0, 500)}${dayOneText.length > 500 ? '...' : ''}"\n\nThis was where you started. Reading this now, what do you notice? What would you tell that version of yourself?`;
        cacheDailyPrompt(dayIndex, milestonePrompt);
        return milestonePrompt;
    }

    if (dayIndex === 45 && intentions) {
        const milestonePrompt = `You've reached the halfway point of your journey. Your intention was:\n\n"${intentions}"\n\nTake a moment to reflect on this. How do you feel in relation to this intention today? Are you closer, further, or has the intention itself shifted?`;
        cacheDailyPrompt(dayIndex, milestonePrompt);
        return milestonePrompt;
    }

    // Day 60: Second "Then & Now" reflection
    if (dayIndex === 60 && dayOneText) {
        const milestonePrompt = `Two months in. Let's revisit where you began. On Day 1, you wrote:\n\n"${dayOneText.slice(0, 500)}${dayOneText.length > 500 ? '...' : ''}"\n\nHow has your relationship with these words changed? What growth do you see in the space between then and now?`;
        cacheDailyPrompt(dayIndex, milestonePrompt);
        return milestonePrompt;
    }

    // Day 90: Final "Then & Now" reflection
    if (dayIndex === 90) {
        let finalPrompt = `You've arrived at your final daily reflection.`;

        if (dayOneText) {
            finalPrompt += `\n\nOn Day 1, you wrote:\n\n"${dayOneText.slice(0, 500)}${dayOneText.length > 500 ? '...' : ''}"`;
        }

        if (intentions) {
            finalPrompt += `\n\nYour intention was: "${intentions}"`;
        }

        finalPrompt += `\n\nLooking back over the past 90 days, what has this journey meant to you? What wisdom would you offer to someone just beginning?`;

        cacheDailyPrompt(dayIndex, finalPrompt);
        return finalPrompt;
    }

    // Collect ALL answered prompts from multiple sources:
    // 1. From permanent history (only prompts the user actually answered)
    // 2. From existing journal entries (to catch any missed)
    const permanentHistory = loadAllPromptsHistory();
    const entryPrompts = journalEntries
        .filter(e => e.type === 'daily')
        .map(e => e.prompt);

    const allUsedPrompts = new Set([...permanentHistory, ...entryPrompts]);

    // Determine which month we're in
    const month = Math.min(3, Math.floor((dayIndex - 1) / 30) + 1);

    // Get prompts for this arc and month
    const promptsForMonth = PROMPTS[arc][month];

    if (!promptsForMonth || promptsForMonth.length === 0) {
        const fallback = "How are you feeling today, in this moment?";
        addToPromptsHistory(fallback);
        return fallback;
    }

    // Shuffle prompts for randomness
    const shuffledPrompts = shuffle(promptsForMonth);

    // Find first prompt that hasn't been used
    let selectedPrompt: Prompt | undefined;

    for (const prompt of shuffledPrompts) {
        if (!allUsedPrompts.has(prompt.text)) {
            selectedPrompt = prompt;
            break;
        }
    }

    // If all prompts in current month are used, try other months
    if (!selectedPrompt) {
        const otherMonths = [1, 2, 3].filter(m => m !== month);
        for (const otherMonth of otherMonths) {
            const otherPrompts = shuffle(PROMPTS[arc][otherMonth]);
            for (const prompt of otherPrompts) {
                if (!allUsedPrompts.has(prompt.text)) {
                    selectedPrompt = prompt;
                    break;
                }
            }
            if (selectedPrompt) break;
        }
    }

    // If all prompts in current arc are used, try other arcs
    if (!selectedPrompt) {
        const otherArcs: Arc[] = (['release', 'reaffirm', 'reignition'] as Arc[]).filter(a => a !== arc);
        for (const otherArc of otherArcs) {
            for (const m of [1, 2, 3]) {
                const otherPrompts = shuffle(PROMPTS[otherArc][m]);
                for (const prompt of otherPrompts) {
                    if (!allUsedPrompts.has(prompt.text)) {
                        selectedPrompt = prompt;
                        break;
                    }
                }
                if (selectedPrompt) break;
            }
            if (selectedPrompt) break;
        }
    }

    // Ultimate fallback: Generate a dynamic prompt if ALL prompts exhausted
    // This should be extremely rare given we have 315 prompts total
    if (!selectedPrompt) {
        const dynamicPrompts = [
            `Day ${dayIndex}: What is alive in you right now?`,
            `Day ${dayIndex}: What truth is asking to be acknowledged today?`,
            `Day ${dayIndex}: What would feel like progress today, even if small?`,
            `Day ${dayIndex}: How can you honor yourself right now?`,
            `Day ${dayIndex}: What does your intuition want you to notice?`,
        ];

        for (const dynPrompt of dynamicPrompts) {
            if (!allUsedPrompts.has(dynPrompt)) {
                cacheDailyPrompt(dayIndex, dynPrompt);
                return dynPrompt;
            }
        }

        // Absolute last resort
        const lastResort = `Day ${dayIndex}: Take a moment to breathe and check in with yourself. What arises?`;
        cacheDailyPrompt(dayIndex, lastResort);
        return lastResort;
    }

    // Cache the selected prompt for today (persists across sessions)
    cacheDailyPrompt(dayIndex, selectedPrompt.text);

    return selectedPrompt.text;
}
