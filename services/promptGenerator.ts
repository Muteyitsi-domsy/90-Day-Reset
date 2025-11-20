
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

// Persistent storage key for ALL prompts ever shown (permanent history)
const ALL_PROMPTS_HISTORY_KEY = 'allPromptsHistory';

// Load all prompts ever shown from localStorage
const loadAllPromptsHistory = (): string[] => {
    try {
        const saved = localStorage.getItem(ALL_PROMPTS_HISTORY_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
};

// Save prompt to permanent history
const addToPromptsHistory = (prompt: string) => {
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

// EXPANDED PROMPT POOL - At least 35 prompts per arc per month = 105 per arc
// This ensures we have enough unique prompts for 90 days plus buffer
const PROMPTS: Record<Arc, Record<number, Prompt[]>> = {
    healing: {
        1: [ // Month 1: Awareness & Gentleness (35+ prompts)
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
        ],
        2: [ // Month 2: Integration & Compassion (35+ prompts)
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
            { text: "What old narrative are you actively rewriting?", category: 'intention' },
            { text: "When yesterday did you pause before reacting? What happened?", category: 'reflection' },
            { text: "How can you anchor yourself in self-compassion today?", category: 'intention' },
            { text: "What feeling are you more comfortable sitting with now than before?", category: 'reflection' },
            { text: "What boundary conversation are you preparing to have?", category: 'intention' },
            { text: "How did you nurture yourself yesterday when things got hard?", category: 'reflection' },
            { text: "What would your healed self want you to know today?", category: 'intention' },
            { text: "What pattern did you interrupt yesterday?", category: 'reflection' },
            { text: "How can you honor both your progress and your struggles today?", category: 'intention' },
            { text: "What emotional skill are you getting better at?", category: 'reflection' },
            { text: "What does self-trust look like for you today?", category: 'intention' },
            { text: "How did you show up differently in a relationship yesterday?", category: 'reflection' },
            { text: "What integration work needs your attention today?", category: 'intention' },
            { text: "What did you learn about yourself through yesterday's challenges?", category: 'reflection' },
            { text: "How can you consolidate your healing gains today?", category: 'intention' },
            { text: "Where did you notice emotional regulation yesterday?", category: 'reflection' },
            { text: "What forgotten part of yourself is returning?", category: 'intention' },
            { text: "How are you different from when you started this journey?", category: 'reflection' },
        ],
        3: [ // Month 3: Embodiment & Self-Trust (35+ prompts)
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
            { text: "How can you share your light with others today?", category: 'intention' },
            { text: "What does your healed self want to create?", category: 'reflection' },
            { text: "How will you celebrate your journey today?", category: 'intention' },
            { text: "What inner resources do you now have access to?", category: 'reflection' },
            { text: "How can you maintain connection with your healed self today?", category: 'intention' },
            { text: "Yesterday, what felt easy that once was hard?", category: 'reflection' },
            { text: "What legacy of healing are you creating?", category: 'intention' },
            { text: "How has your capacity for joy expanded?", category: 'reflection' },
            { text: "What does living as your healed self mean today?", category: 'intention' },
            { text: "How will you integrate all you've learned as this journey ends?", category: 'reflection' },
        ],
    },
    unstuck: {
        1: [ // Month 1: Clarity & Micro-Actions (35+ prompts)
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
            { text: "What old belief is keeping you in place?", category: 'reflection' },
            { text: "What micro-habit can you start today?", category: 'intention' },
            { text: "Yesterday, where did clarity emerge? How can you create more of that?", category: 'reflection' },
            { text: "What would you attempt if you weren't afraid of looking foolish?", category: 'intention' },
            { text: "What does your stuckness protect you from?", category: 'reflection' },
            { text: "How can you reward yourself for small progress today?", category: 'intention' },
            { text: "What did you learn about yourself through yesterday's challenges?", category: 'reflection' },
            { text: "What constraint can you remove to make action easier today?", category: 'intention' },
            { text: "When did you last take a risk? What happened?", category: 'reflection' },
            { text: "How can you be 1% braver today?", category: 'intention' },
            { text: "What area of life feels most ready for movement?", category: 'reflection' },
            { text: "What would done look like, even imperfectly?", category: 'intention' },
            { text: "Yesterday, what small action created unexpected momentum?", category: 'reflection' },
            { text: "What can you simplify to make progress possible today?", category: 'intention' },
        ],
        2: [ // Month 2: Consistency & Beliefs (35+ prompts)
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
        ],
        3: [ // Month 3: Embodiment & Confidence (35+ prompts)
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
            { text: "When yesterday did you feel unstoppable?", category: 'reflection' },
            { text: "How can you share what you've learned with others today?", category: 'intention' },
            { text: "What transformation are you most proud of?", category: 'reflection' },
            { text: "What does moving forward with ease look like today?", category: 'intention' },
            { text: "Yesterday, what achievement felt natural?", category: 'reflection' },
            { text: "How will you maintain your momentum beyond this journey?", category: 'intention' },
            { text: "What capacity have you unlocked?", category: 'reflection' },
            { text: "What commitment will you make to your continued growth today?", category: 'intention' },
            { text: "How has your identity as a person of action solidified?", category: 'reflection' },
            { text: "What does living fully expressed look like today?", category: 'intention' },
            { text: "Yesterday, what came easily that once was hard?", category: 'reflection' },
            { text: "How can you celebrate your transformation today?", category: 'intention' },
            { text: "What will you continue to build?", category: 'reflection' },
            { text: "How will you honor all you've accomplished as this journey ends?", category: 'intention' },
            { text: "What does your unstuck self want to create next?", category: 'reflection' },
        ],
    },
    healed: {
        1: [ // Month 1: Consolidation & Gratitude (35+ prompts)
            { text: "Describe a moment from yesterday where you felt completely like 'yourself'. What did that feel like?", category: 'reflection' },
            { text: "What quality of your ideal self do you want to embody and celebrate today?", category: 'intention' },
            { text: "What are you grateful for in this exact moment of your journey?", category: 'reflection' },
            { text: "How can you create a small moment of beauty or peace for yourself today?", category: 'intention' },
            { text: "When yesterday did you feel most aligned?", category: 'reflection' },
            { text: "What does living from wholeness look like today?", category: 'intention' },
            { text: "What abundance did you notice in your life yesterday?", category: 'reflection' },
            { text: "How can you expand your capacity for joy today?", category: 'intention' },
            { text: "When yesterday did gratitude arise naturally?", category: 'reflection' },
            { text: "What quality will you radiate today?", category: 'intention' },
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
            { text: "How can you spread positivity today?", category: 'intention' },
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
            { text: "When yesterday did you feel most alive?", category: 'reflection' },
            { text: "What does savoring life look like today?", category: 'intention' },
            { text: "How has your capacity for gratitude expanded?", category: 'reflection' },
        ],
        2: [ // Month 2: Expansion & Joy (35+ prompts)
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
            { text: "When yesterday did you feel limitless?", category: 'reflection' },
            { text: "How can you expand your sense of what's possible today?", category: 'intention' },
            { text: "What unexpected joy did you encounter yesterday?", category: 'reflection' },
            { text: "What does thriving look like today?", category: 'intention' },
            { text: "How is your life becoming richer?", category: 'reflection' },
            { text: "What creative expression will you engage in today?", category: 'intention' },
            { text: "Yesterday, where did you feel most free?", category: 'reflection' },
            { text: "How can you spread joy today?", category: 'intention' },
            { text: "What is expanding in your life?", category: 'reflection' },
            { text: "What playful energy will you bring today?", category: 'intention' },
            { text: "When yesterday did you feel deeply content?", category: 'reflection' },
            { text: "How can you create space for spontaneity today?", category: 'intention' },
            { text: "What brings you alive?", category: 'reflection' },
            { text: "How will you say yes to life today?", category: 'intention' },
            { text: "Yesterday, what filled your cup?", category: 'reflection' },
        ],
        3: [ // Month 3: Full Embodiment & Radiance (35+ prompts)
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
            { text: "Yesterday, where did you overflow with positivity?", category: 'reflection' },
            { text: "What does mastery of self look like today?", category: 'intention' },
            { text: "How are you becoming a beacon for others?", category: 'reflection' },
            { text: "What legacy are you creating today?", category: 'intention' },
            { text: "When yesterday did you feel your purpose?", category: 'reflection' },
            { text: "How can you embody love today?", category: 'intention' },
            { text: "What transformation are you most proud of?", category: 'reflection' },
            { text: "How will you celebrate your radiance today?", category: 'intention' },
            { text: "Yesterday, what did you give freely?", category: 'reflection' },
            { text: "What does alignment with your purpose feel like today?", category: 'intention' },
            { text: "How has your light grown?", category: 'reflection' },
            { text: "What will you create from this place of wholeness today?", category: 'intention' },
            { text: "When yesterday did you feel your full power?", category: 'reflection' },
            { text: "How can you maintain this state of being?", category: 'intention' },
            { text: "What has this journey taught you about yourself?", category: 'reflection' },
            { text: "How will you integrate all you've become as this journey ends?", category: 'intention' },
            { text: "What does living as your healed, radiant self mean going forward?", category: 'reflection' },
            { text: "How will you continue to shine?", category: 'intention' },
            { text: "What are you ready to create from this new beginning?", category: 'reflection' },
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

    // Special milestone prompts (these are unique and only shown once)
    if (dayIndex === 45 && intentions) {
        const milestonePrompt = `You've reached the halfway point of your journey. Your intention was:\n\n"${intentions}"\n\nTake a moment to reflect on this. How do you feel in relation to this intention today? Are you closer, further, or has the intention itself shifted?`;
        addToPromptsHistory(milestonePrompt);
        return milestonePrompt;
    }

    if (dayIndex === 90 && intentions) {
        const finalPrompt = `You've arrived at your final daily reflection. Your journey began with the intention:\n\n"${intentions}"\n\nLooking back over the past 90 days, what significance has this journey had on your life and your relationship with this intention, regardless of whether you feel you've "achieved" it?`;
        addToPromptsHistory(finalPrompt);
        return finalPrompt;
    }

    // Collect ALL used prompts from multiple sources:
    // 1. From permanent history (localStorage)
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
        const otherArcs: Arc[] = (['healing', 'unstuck', 'healed'] as Arc[]).filter(a => a !== arc);
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
                addToPromptsHistory(dynPrompt);
                return dynPrompt;
            }
        }

        // Absolute last resort
        const lastResort = `Day ${dayIndex}: Take a moment to breathe and check in with yourself. What arises?`;
        addToPromptsHistory(lastResort);
        return lastResort;
    }

    // Save to permanent history
    addToPromptsHistory(selectedPrompt.text);

    return selectedPrompt.text;
}
