import type { DefaultEmotion, MoodContext, MoodIntensity } from '../types';

// Default emotion to emoji mapping
export const DEFAULT_EMOTION_EMOJIS: Record<DefaultEmotion, string> = {
  joyful: '😊',
  calm: '🧘',
  energized: '⚡',
  anxious: '😰',
  sad: '😢',
  angry: '😠',
  overwhelmed: '🤯',
  grateful: '🙏',
};

// Context display names
export const CONTEXT_LABELS: Record<MoodContext, string> = {
  career: 'Career',
  family: 'Family',
  romantic: 'Romance',
  friendships: 'Friendships',
  physical_health: 'Physical Health',
  mental_health: 'Mental Health',
  spirituality: 'Spirituality',
};

// Intensity modifiers for prompts
const INTENSITY_PREFIXES: Record<MoodIntensity, string> = {
  low: 'You\'re feeling a subtle sense of',
  medium: 'You\'re experiencing',
  high: 'You\'re deeply feeling',
};

// Mood prompts database: emotion -> context -> array of prompts
type MoodPromptsDatabase = Record<DefaultEmotion, Record<MoodContext, string[]>>;

const MOOD_PROMPTS: MoodPromptsDatabase = {
  joyful: {
    career: [
      'What recent win at work is making you smile today?',
      'Describe a moment this week when you felt proud of your professional growth.',
      'What aspect of your work is bringing you the most satisfaction right now?',
      'Who at work has contributed to this positive feeling, and how?',
    ],
    family: [
      'What moment with family recently filled your heart with warmth?',
      'Describe a family memory you\'re grateful for today.',
      'What quality in your family relationships is bringing you joy right now?',
      'How has your family supported you in feeling this way?',
    ],
    romantic: [
      'What moment with your partner recently made you feel especially connected?',
      'Describe something your partner did that brought you happiness.',
      'What do you appreciate most about your relationship right now?',
      'How does this joyful feeling show up in your romantic connection?',
    ],
    friendships: [
      'What recent interaction with a friend brought you genuine joy?',
      'Describe a friendship that\'s been a source of light for you lately.',
      'What makes you feel grateful for your friends today?',
      'How have your friendships enhanced your life recently?',
    ],
    physical_health: [
      'What physical sensation or achievement is bringing you joy today?',
      'How does your body feel when you\'re in this joyful state?',
      'What healthy habit or activity has been contributing to this positive feeling?',
      'Describe a moment when you felt grateful for what your body can do.',
    ],
    mental_health: [
      'What mental shift or realization has brought you peace recently?',
      'Describe what emotional wellness feels like for you in this moment.',
      'What practice or mindset is contributing to this sense of joy?',
      'How are you nurturing your mental well-being today?',
    ],
    spirituality: [
      'What spiritual practice or moment has brought you joy lately?',
      'Describe a sense of connection or meaning you\'ve experienced recently.',
      'What are you feeling grateful for in your spiritual journey?',
      'How does this joyful feeling connect to your sense of purpose?',
    ],
  },
  calm: {
    career: [
      'What about your work situation allows you to feel peaceful right now?',
      'Describe a moment at work when you felt centered and in control.',
      'What boundary or decision has contributed to this sense of calm?',
      'How are you maintaining balance in your professional life?',
    ],
    family: [
      'What family dynamic is allowing you to feel at peace today?',
      'Describe a quiet moment with family that brought you calm.',
      'How have you created space for tranquility in your family life?',
      'What aspect of your family relationships feels balanced right now?',
    ],
    romantic: [
      'What about your relationship feels steady and peaceful right now?',
      'Describe a calm moment of connection with your partner.',
      'How does this relationship contribute to your sense of inner peace?',
      'What feels secure and grounding in your romantic life?',
    ],
    friendships: [
      'Which friendship brings you a sense of ease and acceptance?',
      'Describe a peaceful moment you\'ve shared with a friend recently.',
      'What makes certain friendships feel like a safe haven for you?',
      'How do your friends contribute to your sense of calm?',
    ],
    physical_health: [
      'What physical practice helps you feel grounded in your body?',
      'Describe how your body feels in this state of calm.',
      'What healthy routine is contributing to this sense of peace?',
      'How are you honoring your body\'s need for rest and balance?',
    ],
    mental_health: [
      'What mental state or practice is bringing you peace today?',
      'Describe what inner calm feels like for you right now.',
      'How have you created mental space for tranquility?',
      'What thought patterns are you grateful for in this moment?',
    ],
    spirituality: [
      'What spiritual practice brings you the deepest sense of calm?',
      'Describe a moment of spiritual peace you\'ve experienced recently.',
      'How does your spiritual practice help you feel grounded?',
      'What gives you a sense of trust or surrender today?',
    ],
  },
  energized: {
    career: [
      'What work project or opportunity is exciting you right now?',
      'Describe what\'s fueling your professional motivation today.',
      'What new possibility in your career is giving you energy?',
      'How are you channeling this energized feeling into your work?',
    ],
    family: [
      'What family activity or plan is filling you with enthusiasm?',
      'Describe what\'s bringing vitality to your family connections.',
      'How is your energy showing up in your family dynamics?',
      'What makes you excited about your family life right now?',
    ],
    romantic: [
      'What aspect of your relationship is exciting you today?',
      'Describe how this energized feeling shows up with your partner.',
      'What new adventure or chapter feels possible in your relationship?',
      'How are you bringing this energy into your romantic connection?',
    ],
    friendships: [
      'What social activity or connection is energizing you?',
      'Describe a friendship that\'s been invigorating lately.',
      'What are you excited to do or share with friends?',
      'How is your social life fueling your sense of vitality?',
    ],
    physical_health: [
      'What physical activity is giving you the most energy right now?',
      'Describe how your body feels strong and capable today.',
      'What healthy habit is boosting your vitality?',
      'How are you celebrating what your body can do?',
    ],
    mental_health: [
      'What mental breakthrough or clarity is energizing you?',
      'Describe what motivation feels like for you right now.',
      'What\'s giving you a sense of possibility and momentum?',
      'How are you channeling this mental energy productively?',
    ],
    spirituality: [
      'What spiritual insight or practice is filling you with life?',
      'Describe a sense of purpose or calling you\'re feeling.',
      'What feels aligned and vibrant in your spiritual journey?',
      'How is your spiritual energy showing up in your daily life?',
    ],
  },
  anxious: {
    career: [
      'What work situation is weighing on your mind right now?',
      'Describe what you\'re worried might happen in your professional life.',
      'What aspect of your career feels uncertain or stressful?',
      'What do you need to feel more secure at work?',
    ],
    family: [
      'What family situation is causing you worry today?',
      'Describe the source of tension in your family relationships.',
      'What are you anxious about when it comes to your family?',
      'What would help you feel more at ease in your family dynamics?',
    ],
    romantic: [
      'What\'s making you feel uncertain in your relationship right now?',
      'Describe what you\'re worried about with your partner.',
      'What feels unsettled or tense in your romantic life?',
      'What reassurance or clarity do you need in this relationship?',
    ],
    friendships: [
      'What social situation is causing you anxiety today?',
      'Describe a friendship worry that\'s on your mind.',
      'What feels uncomfortable or uncertain in your social connections?',
      'What would help you feel more secure in your friendships?',
    ],
    physical_health: [
      'What physical symptom or health concern is worrying you?',
      'Describe how anxiety shows up in your body right now.',
      'What health-related fear is on your mind today?',
      'What do you need to feel more at ease in your body?',
    ],
    mental_health: [
      'What thoughts are creating the most anxiety for you today?',
      'Describe the mental loop or worry you can\'t seem to shake.',
      'What feels overwhelming or out of control in your mind?',
      'What would bring you a sense of mental relief right now?',
    ],
    spirituality: [
      'What spiritual doubt or question is unsettling you?',
      'Describe what feels uncertain in your sense of meaning or purpose.',
      'What are you anxious about in your spiritual journey?',
      'What spiritual grounding do you need in this moment?',
    ],
  },
  sad: {
    career: [
      'What disappointment at work is affecting you today?',
      'Describe what feels discouraging in your professional life.',
      'What loss or setback in your career are you processing?',
      'What do you wish was different about your work situation?',
    ],
    family: [
      'What family situation is making your heart heavy today?',
      'Describe a loss or distance you\'re feeling in family relationships.',
      'What are you grieving when it comes to your family?',
      'What family connection do you wish you had right now?',
    ],
    romantic: [
      'What\'s making you feel sad in your relationship today?',
      'Describe a disconnect or loss you\'re experiencing with your partner.',
      'What do you wish was different in your romantic life?',
      'What unmet need is contributing to this sadness?',
    ],
    friendships: [
      'What friendship loss or distance is affecting you?',
      'Describe what feels lonely or disconnected in your social life.',
      'What do you miss about a friendship or social connection?',
      'What kind of connection are you longing for right now?',
    ],
    physical_health: [
      'What physical limitation or pain is making you feel down?',
      'Describe how sadness manifests in your body today.',
      'What are you grieving about your physical health or body?',
      'What physical comfort or healing do you need?',
    ],
    mental_health: [
      'What emotional weight are you carrying today?',
      'Describe the sadness you\'re experiencing without judgment.',
      'What loss or disappointment is affecting your mental state?',
      'What do you need to process this feeling of sadness?',
    ],
    spirituality: [
      'What spiritual disconnection or loss are you feeling?',
      'Describe what feels empty or meaningless right now.',
      'What are you grieving in your spiritual journey?',
      'What sense of purpose or connection are you longing for?',
    ],
  },
  angry: {
    career: [
      'What work situation feels unjust or frustrating right now?',
      'Describe what boundaries were crossed in your professional life.',
      'What are you angry about when it comes to your career?',
      'What change or accountability do you need at work?',
    ],
    family: [
      'What family dynamic is triggering your anger today?',
      'Describe what feels unfair or disrespectful in your family.',
      'What boundary was violated that\'s making you angry?',
      'What do you need to express or change in your family relationships?',
    ],
    romantic: [
      'What happened in your relationship that upset you?',
      'Describe what feels unfair or hurtful with your partner.',
      'What boundary or need wasn\'t honored in your relationship?',
      'What do you need to communicate about this anger?',
    ],
    friendships: [
      'What friendship situation has left you feeling angry or hurt?',
      'Describe what felt like a betrayal or disappointment.',
      'What boundary was crossed in a friendship?',
      'What resolution or conversation do you need?',
    ],
    physical_health: [
      'What about your physical health situation feels unfair?',
      'Describe the frustration you\'re experiencing with your body.',
      'What limitation or pain is triggering your anger?',
      'What do you need to honor your body\'s worth and dignity?',
    ],
    mental_health: [
      'What injustice or frustration is fueling your anger today?',
      'Describe what you\'re angry about without holding back.',
      'What boundary of yours was violated?',
      'What needs to change for you to feel respected?',
    ],
    spirituality: [
      'What spiritual disappointment or betrayal are you angry about?',
      'Describe what feels unjust in your spiritual experience.',
      'What belief or expectation was violated?',
      'What truth or change are you demanding right now?',
    ],
  },
  overwhelmed: {
    career: [
      'What work responsibilities feel like too much right now?',
      'Describe what\'s making you feel stretched too thin professionally.',
      'What needs to be removed from your plate at work?',
      'What support or boundary would help you feel less overwhelmed?',
    ],
    family: [
      'What family demands are exhausting you today?',
      'Describe what feels like too much to handle in family life.',
      'What family responsibility is draining your energy?',
      'What support or change would lighten your load?',
    ],
    romantic: [
      'What relationship demand feels like too much right now?',
      'Describe what\'s making your relationship feel heavy.',
      'What expectation or conflict is overwhelming you?',
      'What space or support do you need from your partner?',
    ],
    friendships: [
      'What social obligation or drama feels overwhelming?',
      'Describe what\'s making your friendships feel draining.',
      'What friendship dynamic is taking too much energy?',
      'What boundary would help you feel less overwhelmed?',
    ],
    physical_health: [
      'What physical symptoms or demands feel like too much?',
      'Describe how overwhelm shows up in your body today.',
      'What health challenge is exhausting your resources?',
      'What rest or simplification does your body need?',
    ],
    mental_health: [
      'What thoughts or worries are flooding your mind right now?',
      'Describe what feels too complex or heavy to process.',
      'What mental burden needs to be released or simplified?',
      'What would help you feel mentally clearer and lighter?',
    ],
    spirituality: [
      'What spiritual questions or demands feel too heavy today?',
      'Describe what\'s making your spiritual path feel overwhelming.',
      'What expectation or confusion is weighing you down?',
      'What simplicity or clarity do you need spiritually?',
    ],
  },
  grateful: {
    career: [
      'What professional blessing are you thankful for today?',
      'Describe an opportunity or support you received at work.',
      'What career growth or win deserves your gratitude?',
      'Who or what has made your professional life better?',
    ],
    family: [
      'What family blessing fills your heart with gratitude today?',
      'Describe a family member or moment you\'re thankful for.',
      'What family support or love are you grateful for?',
      'How has your family enriched your life recently?',
    ],
    romantic: [
      'What aspect of your relationship are you most grateful for?',
      'Describe something your partner did that touched your heart.',
      'What quality in your relationship deserves appreciation?',
      'How has your partner shown up for you lately?',
    ],
    friendships: [
      'What friendship are you feeling especially grateful for today?',
      'Describe a friend who has been a gift in your life.',
      'What support or joy has a friend brought you recently?',
      'How have your friendships blessed you?',
    ],
    physical_health: [
      'What physical ability or wellness are you grateful for?',
      'Describe something amazing your body can do or has overcome.',
      'What health blessing are you thankful for today?',
      'How has taking care of yourself paid off recently?',
    ],
    mental_health: [
      'What mental clarity or growth are you grateful for?',
      'Describe an emotional healing or insight you\'ve experienced.',
      'What mental health practice or support deserves your thanks?',
      'How has your emotional well-being improved recently?',
    ],
    spirituality: [
      'What spiritual blessing or grace are you thankful for?',
      'Describe a moment of spiritual connection or peace.',
      'What has deepened your sense of meaning or purpose?',
      'How has your spiritual practice enriched your life?',
    ],
  },
};

/**
 * Get a prompt based on emotion, context, and previously used prompts
 */
export function getMoodPrompt(
  emotion: DefaultEmotion,
  context: MoodContext,
  intensity: MoodIntensity,
  previousPrompts: string[] = []
): string {
  const prompts = MOOD_PROMPTS[emotion][context];

  // Filter out previously used prompts to avoid repetition
  const availablePrompts = prompts.filter((p) => !previousPrompts.includes(p));

  // If all prompts have been used, reset and use all prompts
  const promptPool = availablePrompts.length > 0 ? availablePrompts : prompts;

  // Select a random prompt
  const selectedPrompt = promptPool[Math.floor(Math.random() * promptPool.length)];

  // Add intensity context (optional enhancement)
  const intensityPrefix = INTENSITY_PREFIXES[intensity];
  const emotionLabel = emotion.replace('_', ' ');

  return `${intensityPrefix} ${emotionLabel} around ${CONTEXT_LABELS[context].toLowerCase()}.\n\n${selectedPrompt}`;
}

/**
 * Get emoji for emotion (default or custom)
 */
export function getEmotionEmoji(
  emotion: string,
  isCustom: boolean,
  customEmoji?: string
): string {
  if (isCustom && customEmoji) {
    return customEmoji;
  }
  return DEFAULT_EMOTION_EMOJIS[emotion as DefaultEmotion] || '💭';
}

/**
 * Get all available prompts for a mood+context combination (for preview/selection)
 */
export function getAllPromptsForMood(
  emotion: DefaultEmotion,
  context: MoodContext
): string[] {
  return MOOD_PROMPTS[emotion][context];
}
