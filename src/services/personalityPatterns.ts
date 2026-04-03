/**
 * Personality Patterns Knowledge Base
 *
 * Static reference data for MBTI (16 types) and Enneagram (9 types).
 * Used exclusively by the pattern recognition engine to adjust the
 * interpretation and tone of insights — NEVER to drive detection.
 *
 * Sources: MBTI Manual (Myers et al. 1998), Type Talk (Kroeger & Thuesen 1988),
 * The Wisdom of the Enneagram (Riso & Hudson 1999), and
 * Renew90 Personality Research Foundation v1.0.
 */

import type { PersonalityContext } from '../../types';

// ---------------------------------------------------------------------------
// Data shape
// ---------------------------------------------------------------------------

interface MBTIProfile {
  typeCode: string;
  typeName: string;
  processingStyle: 'internal' | 'external';
  emotionalWeight: 'low' | 'moderate' | 'high';
  /** Phrases that appear in journal text when this type is under stress */
  languageCues: string[];
  /** Documented blind spots — not surfaced to user, used to calibrate confidence */
  blindSpots: string[];
  /** How to orient the Flip Journal reframe for this type */
  flipReframeHint: string;
}

interface EnneagramProfile {
  typeCode: string;
  typeName: string;
  coreFear: string;
  /** The type this one disintegrates toward under stress */
  disintegrationDirection: string;
  /** Language patterns typical of this type under stress */
  languageCues: string[];
  /** Phrases specific to disintegration (stress shift signal) */
  disintegrationCues: string[];
  flipReframeHint: string;
}

// ---------------------------------------------------------------------------
// MBTI profiles — 16 types
// ---------------------------------------------------------------------------

const MBTI_PROFILES: Record<string, MBTIProfile> = {
  INFJ: {
    typeCode: 'INFJ', typeName: 'The Advocate',
    processingStyle: 'internal', emotionalWeight: 'high',
    languageCues: [
      "i feel like no one really understands me",
      "i give so much and receive so little",
      "i just need everyone to leave me alone",
      "i don't see the point anymore",
      "feeling invisible", "feeling unheard", "feeling like a burden",
      "no one gets it", "always giving", "completely drained",
    ],
    blindSpots: [
      'Difficulty identifying own needs separate from others',
      'Stays in unsatisfying situations hoping they improve',
      'Anger appears as passive withdrawal rather than direct expression',
    ],
    flipReframeHint: 'Orient toward: what would you tell a close friend in this situation? What do you actually need right now — separate from what everyone else needs?',
  },
  INFP: {
    typeCode: 'INFP', typeName: 'The Mediator',
    processingStyle: 'internal', emotionalWeight: 'high',
    languageCues: [
      "i don't know who i am anymore",
      "nothing i do is ever good enough",
      "i feel completely alone even when surrounded by people",
      "i'm not living up to who i want to be",
      "nothing feels authentic", "lost", "emptiness inside",
    ],
    blindSpots: [
      'Harsh inner critic becomes contemptuous under stress',
      'Paralysis and inability to make decisions',
      'Idealises the past or distant possibilities',
    ],
    flipReframeHint: 'Orient toward: what is one small thing that would feel true to who you are today? Bridge from feeling to doing.',
  },
  ENFJ: {
    typeCode: 'ENFJ', typeName: 'The Protagonist',
    processingStyle: 'external', emotionalWeight: 'high',
    languageCues: [
      "i do everything for everyone and no one sees it",
      "i just need everyone to be okay",
      "why can't i just fix this",
      "i feel unappreciated",
      "everyone relies on me", "i can't say no",
    ],
    blindSpots: [
      'Subtle manipulation to manage others emotions and avoid conflict',
      'Martyrdom language with underlying resentment',
      'Identity crisis when caretaking role is removed',
    ],
    flipReframeHint: 'Orient toward: what do you need right now that has nothing to do with anyone else?',
  },
  ENFP: {
    typeCode: 'ENFP', typeName: 'The Campaigner',
    processingStyle: 'external', emotionalWeight: 'moderate',
    languageCues: [
      "i feel so stuck i could scream",
      "i have so many ideas but can't finish anything",
      "why does everything feel so meaningless lately",
      "i feel trapped", "bored with everything", "what's the point",
    ],
    blindSpots: [
      'Starts many things, completes few',
      'Avoids difficult conversations through charm',
      'Overcommits to exciting new ideas to avoid present pain',
    ],
    flipReframeHint: 'Orient toward: what would finishing one thing feel like? What is holding you back from following through?',
  },
  INTJ: {
    typeCode: 'INTJ', typeName: 'The Architect',
    processingStyle: 'internal', emotionalWeight: 'low',
    languageCues: [
      "everyone around me is incompetent",
      "i have planned for every scenario and it still went wrong",
      "this is completely irrational",
      "nothing is working as it should", "wasted effort",
    ],
    blindSpots: [
      'Catastrophic thinking dressed as rational analysis',
      'Withdrawal into work to avoid emotional processing',
      'Hypercriticism of self and others',
    ],
    flipReframeHint: 'Orient toward: if you set aside what should have happened, what are you actually feeling right now?',
  },
  INTP: {
    typeCode: 'INTP', typeName: 'The Logician',
    processingStyle: 'internal', emotionalWeight: 'low',
    languageCues: [
      "theoretically speaking i suppose i might feel",
      "i can't figure out why i'm like this",
      "i keep going in circles",
      "analysis paralysis", "can't decide", "intellectually i know but",
    ],
    blindSpots: [
      'Intellectualising emotions instead of experiencing them',
      'Social overwhelm leading to complete withdrawal',
      'Self-deprecating humour masking genuine distress',
    ],
    flipReframeHint: 'Orient toward: what would it feel like to stop analysing and simply name what is happening inside you right now?',
  },
  ENTJ: {
    typeCode: 'ENTJ', typeName: 'The Commander',
    processingStyle: 'external', emotionalWeight: 'low',
    languageCues: [
      "i'm failing to meet my own standards",
      "nothing is getting done properly",
      "everything i worked for feels pointless",
      "incompetence everywhere", "losing control",
    ],
    blindSpots: [
      'Achievement feels suddenly meaningless after a goal is reached',
      'Vulnerability expressed as impatience or contempt',
    ],
    flipReframeHint: 'Orient toward: beneath the frustration, what is it that you care about most deeply here?',
  },
  ENTP: {
    typeCode: 'ENTP', typeName: 'The Debater',
    processingStyle: 'external', emotionalWeight: 'low',
    languageCues: [
      "i'm bored out of my mind",
      "i'm arguing against my own progress",
      "i keep starting over",
      "nothing holds my attention", "restless",
    ],
    blindSpots: [
      'Devil\'s advocate behaviour turned inward',
      'Commitment anxiety — distress when options narrow',
    ],
    flipReframeHint: 'Orient toward: what would it look like to go deep with something rather than starting fresh?',
  },
  ISTJ: {
    typeCode: 'ISTJ', typeName: 'The Logistician',
    processingStyle: 'internal', emotionalWeight: 'low',
    languageCues: [
      "this isn't how things are supposed to work",
      "i feel wrong for needing help",
      "everything is out of order",
      "routine is broken", "nothing is reliable anymore",
    ],
    blindSpots: [
      'Rigid catastrophising when routines are disrupted',
      'Shame around needing emotional support',
    ],
    flipReframeHint: 'Orient toward: what would it feel like to allow things to be a little uncertain right now, without trying to fix them?',
  },
  ISFJ: {
    typeCode: 'ISFJ', typeName: 'The Defender',
    processingStyle: 'internal', emotionalWeight: 'high',
    languageCues: [
      "i blame myself for everything",
      "i just want everyone to be okay",
      "i've been working so hard and no one notices",
      "i never ask for anything", "exhausted from caring",
    ],
    blindSpots: [
      'Conflict avoidance leading to accumulated resentment',
      'Overwork as a coping mechanism',
    ],
    flipReframeHint: 'Orient toward: what would you allow yourself to receive right now, without having to earn it first?',
  },
  ESTJ: {
    typeCode: 'ESTJ', typeName: 'The Executive',
    processingStyle: 'external', emotionalWeight: 'low',
    languageCues: [
      "no one is following through",
      "i have to do everything myself",
      "this is completely out of control",
      "things should be done properly", "no structure",
    ],
    blindSpots: [
      'Vulnerability disguised as anger or contempt',
      'Rigid thinking disguised as principle',
    ],
    flipReframeHint: 'Orient toward: if you allowed yourself to be wrong about something today, what might you discover?',
  },
  ESFJ: {
    typeCode: 'ESFJ', typeName: 'The Consul',
    processingStyle: 'external', emotionalWeight: 'high',
    languageCues: [
      "i should have done more",
      "i'm letting everyone down",
      "i need people to be happy with me",
      "i feel guilty", "i should", "what will people think",
    ],
    blindSpots: [
      'Guilt as a primary driver — entries saturated with should language',
      'People-pleasing to the point of total self-erasure',
    ],
    flipReframeHint: 'Orient toward: what would you choose if no one\'s approval was involved?',
  },
  ISTP: {
    typeCode: 'ISTP', typeName: 'The Virtuoso',
    processingStyle: 'internal', emotionalWeight: 'low',
    languageCues: [
      "i just need to figure this out",
      "everyone wants too much from me",
      "i want to be left alone to deal with this",
      "it doesn't make sense", "broken system",
    ],
    blindSpots: [
      'Journalling absence during stress — disengagement is the primary signal',
      'Hyper-analytical entries with no emotional content',
    ],
    flipReframeHint: 'Orient toward: beneath the practical problem, what is actually bothering you?',
  },
  ISFP: {
    typeCode: 'ISFP', typeName: 'The Adventurer',
    processingStyle: 'internal', emotionalWeight: 'high',
    languageCues: [
      "i'm being forced to be someone i'm not",
      "i feel deeply hurt but can't explain it",
      "something feels wrong but i can't name it",
      "being authentic feels impossible right now",
    ],
    blindSpots: [
      'Deep suffering with minimal external expression',
      'Self-doubt masked as aesthetic criticism',
    ],
    flipReframeHint: 'Orient toward: what would feel most true to you in this moment, if you let yourself act from that place?',
  },
  ESTP: {
    typeCode: 'ESTP', typeName: 'The Entrepreneur',
    processingStyle: 'external', emotionalWeight: 'low',
    languageCues: [
      "i'm so bored",
      "i can't stand this",
      "everything is restricted",
      "this is pointless", "nothing is happening",
    ],
    blindSpots: [
      'Rare journalling — entries tend to be action-oriented',
      'Deflection through humour masking genuine distress',
    ],
    flipReframeHint: 'Orient toward: what is the real thing underneath the restlessness?',
  },
  ESFP: {
    typeCode: 'ESFP', typeName: 'The Entertainer',
    processingStyle: 'external', emotionalWeight: 'moderate',
    languageCues: [
      "i feel like no one wants me around",
      "i was rejected",
      "i'm invisible to everyone",
      "everything was fine and then suddenly everything wasn't",
    ],
    blindSpots: [
      'Avoidance of deeper reflection — surface-level emotional processing',
      'Entries swing between high energy and sudden flatness',
    ],
    flipReframeHint: 'Orient toward: what is underneath the need to keep everything light right now?',
  },
};

// ---------------------------------------------------------------------------
// Enneagram profiles — 9 types
// ---------------------------------------------------------------------------

const ENNEAGRAM_PROFILES: Record<string, EnneagramProfile> = {
  '1': {
    typeCode: '1', typeName: 'The Reformer',
    coreFear: 'Being corrupt, defective, or evil',
    disintegrationDirection: '4',
    languageCues: [
      "i should have done better", "it must be perfect",
      "this is wrong", "i'm not good enough",
      "i keep making the same mistakes", "i'm so angry at myself",
    ],
    disintegrationCues: [
      "i'm falling apart", "nothing makes sense", "i feel so dramatic",
      "i'm irrational today", "everything feels hopeless",
    ],
    flipReframeHint: 'Orient toward: where might self-compassion create more space than self-correction?',
  },
  '2': {
    typeCode: '2', typeName: 'The Helper',
    coreFear: 'Being unwanted or unloved',
    disintegrationDirection: '8',
    languageCues: [
      "i do so much for everyone",
      "no one seems to need me",
      "i just want to feel appreciated",
      "i give and give and get nothing back",
    ],
    disintegrationCues: [
      "i'm so angry", "i've had enough", "i'm done helping",
      "i'm going to take control", "i don't care anymore",
    ],
    flipReframeHint: 'Orient toward: what do you need right now that you haven\'t named yet?',
  },
  '3': {
    typeCode: '3', typeName: 'The Achiever',
    coreFear: 'Being worthless or a failure',
    disintegrationDirection: '9',
    languageCues: [
      "i should feel good about this but",
      "i'm worried about how this looks",
      "i'm constantly doing but not feeling",
      "i need to be seen as successful",
    ],
    disintegrationCues: [
      "i don't care about any of it", "i'm so checked out",
      "nothing matters", "what's the point",
    ],
    flipReframeHint: 'Orient toward: what would matter to you if no one was watching?',
  },
  '4': {
    typeCode: '4', typeName: 'The Individualist',
    coreFear: 'Having no identity or significance',
    disintegrationDirection: '2',
    languageCues: [
      "i feel fundamentally different from everyone else",
      "i long for something i can't quite name",
      "i always miss what isn't there",
      "i feel more like myself in the past",
    ],
    disintegrationCues: [
      "i need reassurance", "i can't be alone right now",
      "i keep reaching out but it doesn't help",
      "i'm too dependent on how people respond to me",
    ],
    flipReframeHint: 'Orient toward: what is present and real right now, within reach, that has value even if it isn\'t perfect?',
  },
  '5': {
    typeCode: '5', typeName: 'The Investigator',
    coreFear: 'Being helpless or overwhelmed',
    disintegrationDirection: '7',
    languageCues: [
      "i need more time to process this alone",
      "i feel overwhelmed by everyone's expectations",
      "i'm watching my own life from a distance",
      "i don't have the energy to give",
    ],
    disintegrationCues: [
      "i can't focus on anything", "i'm jumping from thing to thing",
      "i'm avoiding everything", "i need distraction",
    ],
    flipReframeHint: 'Orient toward: what would it mean to participate in your own life rather than observe it?',
  },
  '6': {
    typeCode: '6', typeName: 'The Loyalist',
    coreFear: 'Being without support or guidance',
    disintegrationDirection: '3',
    languageCues: [
      "what if the worst happens",
      "i can't trust this",
      "something feels off and i can't shake it",
      "i keep going back and forth",
    ],
    disintegrationCues: [
      "i need people to see how capable i am",
      "i'm focused on how i appear",
      "i'm hiding what i'm really feeling to look strong",
    ],
    flipReframeHint: 'Orient toward: what does the steadiest, most grounded part of you already know about this situation?',
  },
  '7': {
    typeCode: '7', typeName: 'The Enthusiast',
    coreFear: 'Being trapped in pain or deprivation',
    disintegrationDirection: '1',
    languageCues: [
      "i reframed it and now i feel better",
      "i have so many plans",
      "i can't settle into one thing",
      "i turn everything into an adventure to avoid the harder feeling",
    ],
    disintegrationCues: [
      "i'm being too hard on myself", "nothing i do is right",
      "i'm judging everything", "i feel rigid and critical",
    ],
    flipReframeHint: 'Orient toward: what would it be like to stay with this difficult feeling a little longer, instead of moving away from it?',
  },
  '8': {
    typeCode: '8', typeName: 'The Challenger',
    coreFear: 'Being controlled or betrayed',
    disintegrationDirection: '5',
    languageCues: [
      "i will not allow this",
      "no one can make me",
      "i'm angry and i'm not apologising for it",
      "i protect the people i care about",
    ],
    disintegrationCues: [
      "i'm withdrawing", "i need to be alone",
      "i'm keeping everything to myself",
      "i don't want to need anyone",
    ],
    flipReframeHint: 'Orient toward: underneath the strength, what is the vulnerable thing you are protecting right now?',
  },
  '9': {
    typeCode: '9', typeName: 'The Peacemaker',
    coreFear: 'Conflict and disconnection',
    disintegrationDirection: '6',
    languageCues: [
      "i don't want to rock the boat",
      "it's not a big deal",
      "i'll go along with whatever",
      "i keep forgetting what i actually want",
    ],
    disintegrationCues: [
      "i'm so anxious about this",
      "what if everything falls apart",
      "i can't trust anyone",
      "i keep assuming the worst",
    ],
    flipReframeHint: 'Orient toward: if your presence and perspective genuinely mattered here, what would you say?',
  },
};

// ---------------------------------------------------------------------------
// Key combination profiles (MBTI + Enneagram pairings)
// From the research doc: high-signal combinations common in Renew90 user base
// ---------------------------------------------------------------------------

const COMBO_SIGNAL_MAP: Record<string, string> = {
  'INFJ+4': 'deep emotional sensitivity, longing, and the feeling of being fundamentally different — an isolation spiral is a known risk',
  'INFP+4': 'identity instability combined with idealism and a harsh inner critic',
  'ENFJ+2': 'over-giving to the point of self-erasure — martyr pattern, exhaustion masked as contentment',
  'INFJ+9': 'conflict avoidance combined with deep feeling — accumulates emotional weight silently',
  'ENFP+7': 'enthusiasm cycling with pain avoidance — many starts, little completion',
  'INTJ+1': 'perfectionism and self-criticism at maximum intensity — very high standards with very little self-compassion',
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a PersonalityContext object for use in pattern enrichment.
 * expressionLevel is set based on pattern intensity (high-intensity patterns = high expression).
 */
export function buildPersonalityContext(
  mbtiType: string | undefined,
  enneagramType: string | undefined,
  intensityIsHigh: boolean,
): import('../../types').PersonalityContext | undefined {
  if (!mbtiType && !enneagramType) return undefined;

  const mbti = mbtiType ? MBTI_PROFILES[mbtiType.toUpperCase()] : undefined;
  const enn = enneagramType ? ENNEAGRAM_PROFILES[enneagramType] : undefined;

  // Processing style: MBTI I/E axis, fall back to enneagram tendency
  let processingStyle: 'internal' | 'external' = 'internal';
  if (mbti) {
    processingStyle = mbti.processingStyle;
  } else if (enn) {
    // Types 2, 3, 7, 8 tend toward external; others internal
    processingStyle = ['2', '3', '7', '8'].includes(enn.typeCode) ? 'external' : 'internal';
  }

  // Emotional weight: MBTI F/J dimension, fall back to enneagram
  let emotionalWeight: 'low' | 'moderate' | 'high' = 'moderate';
  if (mbti) {
    emotionalWeight = mbti.emotionalWeight;
  } else if (enn) {
    emotionalWeight = ['2', '4', '6', '9'].includes(enn.typeCode) ? 'high' :
                      ['5', '1', '3'].includes(enn.typeCode) ? 'low' : 'moderate';
  }

  // Reframe hint: prefer combo signal if both types are present, else MBTI, else Enneagram
  let flipReframeHint: string | undefined;
  const comboKey = `${mbtiType?.toUpperCase()}+${enneagramType}`;
  if (mbtiType && enneagramType && COMBO_SIGNAL_MAP[comboKey]) {
    // Combo key exists — combine the hints from both profiles
    flipReframeHint = mbti?.flipReframeHint ?? enn?.flipReframeHint;
  } else {
    flipReframeHint = mbti?.flipReframeHint ?? enn?.flipReframeHint;
  }

  return {
    mbtiType: mbtiType?.toUpperCase(),
    enneagramType,
    processingStyle,
    expressionLevel: intensityIsHigh ? 'high' : 'low',
    emotionalWeight,
    flipReframeHint,
  };
}

/**
 * Returns language cues for the given personality types.
 * Used to scan entry text for pattern confidence boosting.
 */
export function getLanguageCues(mbtiType?: string, enneagramType?: string): string[] {
  const cues: string[] = [];
  if (mbtiType) {
    const profile = MBTI_PROFILES[mbtiType.toUpperCase()];
    if (profile) cues.push(...profile.languageCues);
  }
  if (enneagramType) {
    const profile = ENNEAGRAM_PROFILES[enneagramType];
    if (profile) {
      cues.push(...profile.languageCues);
      cues.push(...profile.disintegrationCues);
    }
  }
  return cues;
}

/**
 * Scans journal text for personality-specific language cues.
 * Returns matched cue strings (lowercased for safe display).
 */
export function matchLanguageCues(text: string, cues: string[]): string[] {
  const lower = text.toLowerCase();
  return cues.filter(cue => lower.includes(cue.toLowerCase()));
}

/**
 * Returns the disintegration direction type code for an Enneagram type.
 * Used to flag when entry tone shifts toward the disintegration type's patterns.
 */
export function getDisintegrationCues(enneagramType: string): string[] {
  return ENNEAGRAM_PROFILES[enneagramType]?.disintegrationCues ?? [];
}

/**
 * Returns the combo signal description if both types are a known high-signal pair.
 */
export function getComboSignal(mbtiType?: string, enneagramType?: string): string | undefined {
  if (!mbtiType || !enneagramType) return undefined;
  return COMBO_SIGNAL_MAP[`${mbtiType.toUpperCase()}+${enneagramType}`];
}
