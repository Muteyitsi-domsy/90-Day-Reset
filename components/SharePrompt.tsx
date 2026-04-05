/**
 * SharePrompt Component
 *
 * Day milestones (day7/day30/day60/day90):
 *   Animated metamorphosis SVG illustration that draws itself stroke-by-stroke,
 *   followed by milestone-specific copy and a share CTA. Each stage has its own
 *   creature, colour palette, and language reflecting the user's transformation arc.
 *
 * Streak milestones (streak7/streak30):
 *   Simpler fire-themed celebration card — separate from the metamorphosis journey.
 */

import { useState, useEffect } from 'react';

interface SharePromptProps {
  isOpen: boolean;
  onClose: () => void;
  milestone: 'day7' | 'day30' | 'day60' | 'day90' | 'streak7' | 'streak30';
}

type DayMilestone = 'day7' | 'day30' | 'day60' | 'day90';

// ── Per-milestone configuration ──────────────────────────────────────────────

const DAY_CONFIG: Record<DayMilestone, {
  bg: string; text: string;
  headline: string; subtext: string; quote: string;
  shareText: string; primaryBtn: string; secondaryBtn: string;
  hint: string; progress: 1 | 2 | 3 | 4;
}> = {
  day7: {
    bg: '#3a5a3a', text: '#e8f0e8',
    headline: 'Seven days. You showed up.',
    subtext: "The caterpillar doesn't know it's becoming. It just keeps moving.",
    quote: 'Seven days of meeting yourself on the page. That is not nothing — that is everything starting.',
    shareText: "7 days into my 90-Day Identity Reset! 🌱\n\nTaking time each day to reflect and reconnect with myself. The consistency is already making a difference.\n\nIf you've been thinking about doing deeper work, this is your sign. ✨",
    primaryBtn: 'Share my 7-day milestone ↗',
    secondaryBtn: 'Continue my journey',
    hint: 'Share your progress · inspire someone to begin',
    progress: 1,
  },
  day30: {
    bg: '#0F6E56', text: '#e1f5ee',
    headline: 'Thirty days. Something is forming.',
    subtext: "You can't see it yet. But it's happening. The work is working.",
    quote: "Thirty days of reflection is thirty days of choosing to understand yourself. The chrysalis doesn't rush.",
    shareText: "30 days of self-reflection complete! ✨\n\nA whole month of showing up for myself through the 90-Day Identity Reset. The shifts are real.\n\nIf you're looking to reconnect with yourself, highly recommend this journey. 💫",
    primaryBtn: 'Share my 30-day milestone ↗',
    secondaryBtn: 'Continue my arc',
    hint: 'Share your progress · inspire someone to begin',
    progress: 2,
  },
  day60: {
    bg: '#854F0B', text: '#faeeda',
    headline: 'Sixty days. Light breaking through.',
    subtext: 'The cocoon is cracking. Not breaking — opening. There is a difference.',
    quote: 'Sixty days in, you have already changed. The next thirty are where you find out how much.',
    shareText: "60 days into my 90-Day Identity Reset! 🌟\n\n2 months of daily reflection and I can feel the transformation happening. The final 30 days are going to be powerful.\n\nThis journey is no joke. If you're ready to do the work, check it out. 🦋",
    primaryBtn: 'Share my 60-day milestone ↗',
    secondaryBtn: 'Finish what I started',
    hint: 'Share your progress · inspire someone to begin',
    progress: 3,
  },
  day90: {
    bg: '#3C3489', text: '#eeedfe',
    headline: 'Ninety days. You became you.',
    subtext: 'The version you scripted on day one. Always on the way.',
    quote: 'Ninety days ago you set an intention. Today you are the proof that it was always possible.',
    shareText: "90 days. Complete. 🦋\n\nI just finished my 90-Day Identity Reset journey and I'm genuinely not the same person I was when I started.\n\nIf you've been thinking about doing deeper inner work, this is your sign. The transformation is real. ✨",
    primaryBtn: 'Share my transformation ↗',
    secondaryBtn: 'Download my keepsake',
    hint: "Share your progress · let someone know it's possible",
    progress: 4,
  },
};

// ── Progress dots ─────────────────────────────────────────────────────────────

function ProgressDots({ active }: { active: 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex justify-center gap-2 mb-5">
      {([1, 2, 3, 4] as const).map(i => (
        <div
          key={i}
          style={{
            width: i <= active ? 24 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i <= active ? '#9b8ec4' : '#e5e7eb',
            transition: 'all 0.3s',
          }}
        />
      ))}
    </div>
  );
}

// ── SVG Illustrations ─────────────────────────────────────────────────────────
// Each creature draws itself stroke-by-stroke using CSS stroke-dashoffset animation.
// Filled areas fade in slightly after the outline completes.

function CaterpillarSVG() {
  return (
    <svg viewBox="0 0 200 155" width="200" height="155" aria-hidden="true">
      <defs>
        <style>{`
          .d7-leaf{stroke-dasharray:300;stroke-dashoffset:300;fill-opacity:0;
            animation:sd7 .35s 0s ease-out forwards,fi7 .3s .2s ease-out forwards}
          .d7-s1{stroke-dasharray:82;stroke-dashoffset:82;fill-opacity:0;
            animation:sd7 .22s .2s ease-out forwards,fi7 .18s .35s ease-out forwards}
          .d7-s2{stroke-dasharray:82;stroke-dashoffset:82;fill-opacity:0;
            animation:sd7 .22s .32s ease-out forwards,fi7 .18s .47s ease-out forwards}
          .d7-s3{stroke-dasharray:82;stroke-dashoffset:82;fill-opacity:0;
            animation:sd7 .22s .42s ease-out forwards,fi7 .18s .57s ease-out forwards}
          .d7-s4{stroke-dasharray:82;stroke-dashoffset:82;fill-opacity:0;
            animation:sd7 .22s .52s ease-out forwards,fi7 .18s .67s ease-out forwards}
          .d7-s5{stroke-dasharray:75;stroke-dashoffset:75;fill-opacity:0;
            animation:sd7 .22s .62s ease-out forwards,fi7 .18s .77s ease-out forwards}
          .d7-s6{stroke-dasharray:69;stroke-dashoffset:69;fill-opacity:0;
            animation:sd7 .22s .70s ease-out forwards,fi7 .18s .85s ease-out forwards}
          .d7-head{stroke-dasharray:75;stroke-dashoffset:75;fill-opacity:0;
            animation:sd7 .2s .75s ease-out forwards,fi7 .18s .90s ease-out forwards}
          .d7-eye{opacity:0;animation:fi7 .15s .95s ease-out forwards}
          .d7-stripe{stroke-dasharray:28;stroke-dashoffset:28;
            animation:sd7 .15s .90s ease-out forwards}
          .d7-leg1{stroke-dasharray:12;stroke-dashoffset:12;animation:sd7 .1s 1.05s ease-out forwards}
          .d7-leg2{stroke-dasharray:12;stroke-dashoffset:12;animation:sd7 .1s 1.10s ease-out forwards}
          .d7-leg3{stroke-dasharray:12;stroke-dashoffset:12;animation:sd7 .1s 1.15s ease-out forwards}
          .d7-leg4{stroke-dasharray:12;stroke-dashoffset:12;animation:sd7 .1s 1.20s ease-out forwards}
          .d7-leg5{stroke-dasharray:12;stroke-dashoffset:12;animation:sd7 .1s 1.25s ease-out forwards}
          .d7-leg6{stroke-dasharray:12;stroke-dashoffset:12;animation:sd7 .1s 1.30s ease-out forwards}
          .d7-ant1{stroke-dasharray:22;stroke-dashoffset:22;animation:sd7 .2s 1.30s ease-out forwards}
          .d7-ant2{stroke-dasharray:22;stroke-dashoffset:22;animation:sd7 .2s 1.42s ease-out forwards}
          .d7-atip{opacity:0;animation:fi7 .12s 1.55s ease-out forwards}
          @keyframes sd7{to{stroke-dashoffset:0}}
          @keyframes fi7{to{opacity:1;fill-opacity:1}}
        `}</style>
      </defs>

      {/* Leaf */}
      <ellipse cx="100" cy="140" rx="65" ry="14"
        fill="#2d4a20" stroke="#1e3514" strokeWidth="1.5" className="d7-leaf" />

      {/* Body segments L → R */}
      <circle cx="56" cy="118" r="13" fill="#4e7e30" stroke="#3a6020" strokeWidth="1.5" className="d7-s1" />
      <circle cx="71" cy="116" r="13" fill="#5a8a3a" stroke="#3a6020" strokeWidth="1.5" className="d7-s2" />
      <circle cx="86" cy="114" r="13" fill="#4e7e30" stroke="#3a6020" strokeWidth="1.5" className="d7-s3" />
      <circle cx="101" cy="114" r="13" fill="#5a8a3a" stroke="#3a6020" strokeWidth="1.5" className="d7-s4" />
      <circle cx="115" cy="115" r="12" fill="#4e7e30" stroke="#3a6020" strokeWidth="1.5" className="d7-s5" />
      <circle cx="128" cy="117" r="11" fill="#5a8a3a" stroke="#3a6020" strokeWidth="1.5" className="d7-s6" />

      {/* Head */}
      <circle cx="142" cy="114" r="12" fill="#5a8a3a" stroke="#3a6020" strokeWidth="1.5" className="d7-head" />
      <circle cx="147" cy="110" r="2.5" fill="#1a3010" className="d7-eye" />

      {/* Segment stripes */}
      <line x1="56" y1="105" x2="56" y2="131" stroke="#3a6020" strokeWidth="1" className="d7-stripe" />
      <line x1="86" y1="101" x2="86" y2="127" stroke="#3a6020" strokeWidth="1" className="d7-stripe" />
      <line x1="115" y1="103" x2="115" y2="127" stroke="#3a6020" strokeWidth="1" className="d7-stripe" />

      {/* Legs */}
      <line x1="60" y1="130" x2="54" y2="138" stroke="#2d4a20" strokeWidth="1.5" strokeLinecap="round" className="d7-leg1" />
      <line x1="74" y1="128" x2="69" y2="138" stroke="#2d4a20" strokeWidth="1.5" strokeLinecap="round" className="d7-leg2" />
      <line x1="88" y1="126" x2="84" y2="138" stroke="#2d4a20" strokeWidth="1.5" strokeLinecap="round" className="d7-leg3" />
      <line x1="102" y1="126" x2="99" y2="138" stroke="#2d4a20" strokeWidth="1.5" strokeLinecap="round" className="d7-leg4" />
      <line x1="115" y1="127" x2="113" y2="138" stroke="#2d4a20" strokeWidth="1.5" strokeLinecap="round" className="d7-leg5" />
      <line x1="128" y1="128" x2="128" y2="138" stroke="#2d4a20" strokeWidth="1.5" strokeLinecap="round" className="d7-leg6" />

      {/* Antennae */}
      <line x1="142" y1="102" x2="134" y2="84" stroke="#3a6020" strokeWidth="1.5" strokeLinecap="round" className="d7-ant1" />
      <circle cx="133" cy="82" r="2.5" fill="#3a6020" className="d7-atip" />
      <line x1="147" y1="102" x2="156" y2="84" stroke="#3a6020" strokeWidth="1.5" strokeLinecap="round" className="d7-ant2" />
      <circle cx="157" cy="82" r="2.5" fill="#3a6020" className="d7-atip" />
    </svg>
  );
}

function ChrysalisSVG() {
  return (
    <svg viewBox="0 0 200 165" width="200" height="165" aria-hidden="true">
      <defs>
        <style>{`
          .d30-branch{stroke-dasharray:110;stroke-dashoffset:110;
            animation:sd30 .35s 0s ease-out forwards}
          .d30-t1{stroke-dasharray:38;stroke-dashoffset:38;
            animation:sd30 .2s .25s ease-out forwards}
          .d30-t2{stroke-dasharray:32;stroke-dashoffset:32;
            animation:sd30 .2s .35s ease-out forwards}
          .d30-t3{stroke-dasharray:38;stroke-dashoffset:38;
            animation:sd30 .2s .43s ease-out forwards}
          .d30-body{stroke-dasharray:260;stroke-dashoffset:260;fill-opacity:0;
            animation:sd30 .45s .4s ease-out forwards,fi30 .35s .65s ease-out forwards}
          .d30-inner{fill-opacity:0;animation:fi30 .3s .70s ease-out forwards}
          .d30-seg1{fill-opacity:0;animation:fi30 .2s .90s ease-out forwards}
          .d30-seg2{fill-opacity:0;animation:fi30 .2s 1.0s ease-out forwards}
          .d30-seg3{fill-opacity:0;animation:fi30 .2s 1.1s ease-out forwards}
          .d30-silk1{stroke-dasharray:100;stroke-dashoffset:100;
            animation:sd30 .2s .85s ease-out forwards}
          .d30-silk2{stroke-dasharray:110;stroke-dashoffset:110;
            animation:sd30 .2s .98s ease-out forwards}
          .d30-silk3{stroke-dasharray:90;stroke-dashoffset:90;
            animation:sd30 .2s 1.1s ease-out forwards}
          .d30-silk4{stroke-dasharray:105;stroke-dashoffset:105;
            animation:sd30 .2s 1.2s ease-out forwards}
          .d30-head{stroke-dasharray:63;stroke-dashoffset:63;fill-opacity:0;
            animation:sd30 .2s 1.30s ease-out forwards,fi30 .15s 1.45s ease-out forwards}
          .d30-sheen{stroke-dasharray:70;stroke-dashoffset:70;opacity:0;
            animation:sd30 .2s 1.50s ease-out forwards,fi30 .15s 1.55s ease-out forwards}
          @keyframes sd30{to{stroke-dashoffset:0}}
          @keyframes fi30{to{opacity:1;fill-opacity:1}}
        `}</style>
      </defs>

      {/* Branch */}
      <line x1="40" y1="28" x2="160" y2="28"
        stroke="#6b4a2a" strokeWidth="5" strokeLinecap="round" className="d30-branch" />

      {/* Silk threads */}
      <line x1="90" y1="28" x2="93" y2="62" stroke="#a8d4b8" strokeWidth="1" className="d30-t1" />
      <line x1="100" y1="28" x2="100" y2="58" stroke="#a8d4b8" strokeWidth="1.5" className="d30-t2" />
      <line x1="110" y1="28" x2="107" y2="62" stroke="#a8d4b8" strokeWidth="1" className="d30-t3" />

      {/* Chrysalis outline — partial wrap, head still visible */}
      <path d="M100 60 C120 60 130 76 130 100 C130 122 118 140 100 144 C82 140 70 122 70 100 C70 76 80 60 100 60Z"
        fill="none" stroke="#7ab890" strokeWidth="2" className="d30-body" />

      {/* Chrysalis inner fill */}
      <path d="M100 63 C118 63 127 78 127 100 C127 120 116 138 100 142 C84 138 73 120 73 100 C73 78 82 63 100 63Z"
        fill="#5a9a70" className="d30-inner" style={{ fillOpacity: 0 }} />

      {/* Caterpillar segments visible through the forming wrap */}
      <circle cx="100" cy="83" r="10" fill="#4e7e30" className="d30-seg1" style={{ fillOpacity: 0 }} />
      <circle cx="100" cy="99" r="10" fill="#5a8a3a" className="d30-seg2" style={{ fillOpacity: 0 }} />
      <circle cx="100" cy="114" r="10" fill="#4e7e30" className="d30-seg3" style={{ fillOpacity: 0 }} />

      {/* Silk thread lines criss-crossing the cocoon */}
      <path d="M72 80 Q100 70 128 80" fill="none" stroke="#a8d4b8" strokeWidth="1" className="d30-silk1" />
      <path d="M70 97 Q100 88 130 97" fill="none" stroke="#a8d4b8" strokeWidth="1" className="d30-silk2" />
      <path d="M72 113 Q100 104 128 113" fill="none" stroke="#a8d4b8" strokeWidth="1" className="d30-silk3" />
      <path d="M76 127 Q100 118 124 127" fill="none" stroke="#a8d4b8" strokeWidth="1" className="d30-silk4" />

      {/* Head still just visible at the top */}
      <circle cx="100" cy="65" r="10"
        fill="#5a8a3a" stroke="#3a6020" strokeWidth="1.5" className="d30-head" style={{ fillOpacity: 0 }} />

      {/* Sheen highlight */}
      <path d="M84 76 Q80 96 82 116" fill="none"
        stroke="#c8ecd8" strokeWidth="1.5" strokeLinecap="round" className="d30-sheen" />
    </svg>
  );
}

function CrackingCocoonSVG() {
  return (
    <svg viewBox="0 0 200 175" width="200" height="175" aria-hidden="true">
      <defs>
        <style>{`
          .d60-branch{stroke-dasharray:110;stroke-dashoffset:110;
            animation:sd60 .35s 0s ease-out forwards}
          .d60-t1{stroke-dasharray:58;stroke-dashoffset:58;
            animation:sd60 .25s .25s ease-out forwards}
          .d60-t2{stroke-dasharray:58;stroke-dashoffset:58;
            animation:sd60 .25s .35s ease-out forwards}
          .d60-body{stroke-dasharray:290;stroke-dashoffset:290;fill-opacity:0;
            animation:sd60 .5s .4s ease-out forwards,fi60 .35s .65s ease-out forwards}
          .d60-silk1{stroke-dasharray:100;stroke-dashoffset:100;
            animation:sd60 .2s .75s ease-out forwards}
          .d60-silk2{stroke-dasharray:110;stroke-dashoffset:110;
            animation:sd60 .2s .90s ease-out forwards}
          .d60-silk3{stroke-dasharray:95;stroke-dashoffset:95;
            animation:sd60 .2s 1.0s ease-out forwards}
          .d60-crack{stroke-dasharray:60;stroke-dashoffset:60;
            animation:sd60 .2s 1.05s ease-out forwards}
          .d60-ray1{stroke-dasharray:28;stroke-dashoffset:28;
            animation:sd60 .15s 1.18s ease-out forwards}
          .d60-ray2{stroke-dasharray:24;stroke-dashoffset:24;
            animation:sd60 .15s 1.24s ease-out forwards}
          .d60-ray3{stroke-dasharray:30;stroke-dashoffset:30;
            animation:sd60 .15s 1.28s ease-out forwards}
          .d60-ray4{stroke-dasharray:26;stroke-dashoffset:26;
            animation:sd60 .15s 1.32s ease-out forwards}
          .d60-ray5{stroke-dasharray:24;stroke-dashoffset:24;
            animation:sd60 .15s 1.35s ease-out forwards}
          .d60-ray6{stroke-dasharray:20;stroke-dashoffset:20;
            animation:sd60 .12s 1.38s ease-out forwards}
          .d60-ray7{stroke-dasharray:20;stroke-dashoffset:20;
            animation:sd60 .12s 1.40s ease-out forwards}
          .d60-wing1{stroke-dasharray:80;stroke-dashoffset:80;fill-opacity:0;
            animation:sd60 .25s 1.45s ease-out forwards,fi60 .2s 1.60s ease-out forwards}
          .d60-wing2{stroke-dasharray:80;stroke-dashoffset:80;fill-opacity:0;
            animation:sd60 .25s 1.50s ease-out forwards,fi60 .2s 1.65s ease-out forwards}
          @keyframes sd60{to{stroke-dashoffset:0}}
          @keyframes fi60{to{opacity:1;fill-opacity:1}}
        `}</style>
      </defs>

      {/* Branch */}
      <line x1="40" y1="25" x2="160" y2="25"
        stroke="#6b4a2a" strokeWidth="5" strokeLinecap="round" className="d60-branch" />

      {/* Hanging threads */}
      <line x1="92" y1="25" x2="95" y2="60" stroke="#c8a070" strokeWidth="1.5" className="d60-t1" />
      <line x1="108" y1="25" x2="105" y2="60" stroke="#c8a070" strokeWidth="1.5" className="d60-t2" />

      {/* Sealed cocoon body */}
      <path d="M100 58 C122 58 136 76 136 104 C136 130 120 152 100 157 C80 152 64 130 64 104 C64 76 78 58 100 58Z"
        fill="none" stroke="#c8a070" strokeWidth="2.5" className="d60-body" />
      <path d="M100 61 C120 61 132 78 132 104 C132 128 118 150 100 154 C82 150 68 128 68 104 C68 78 80 61 100 61Z"
        fill="#a07840" className="d60-body" style={{ fillOpacity: 0 }} />

      {/* Silk texture lines */}
      <path d="M67 88 Q100 78 133 88" fill="none" stroke="#e8c890" strokeWidth="0.8" className="d60-silk1" />
      <path d="M65 108 Q100 97 135 108" fill="none" stroke="#e8c890" strokeWidth="0.8" className="d60-silk2" />
      <path d="M69 127 Q100 116 131 127" fill="none" stroke="#e8c890" strokeWidth="0.8" className="d60-silk3" />

      {/* Crack from top — zigzag */}
      <path d="M100 58 L97 70 L103 81 L98 93"
        fill="none" stroke="#ffd080" strokeWidth="2" strokeLinecap="round" className="d60-crack" />

      {/* Light rays radiating from crack */}
      <line x1="100" y1="68" x2="82" y2="52" stroke="#ffd080" strokeWidth="1.5" strokeLinecap="round" className="d60-ray1" />
      <line x1="100" y1="68" x2="118" y2="52" stroke="#ffd080" strokeWidth="1.5" strokeLinecap="round" className="d60-ray2" />
      <line x1="100" y1="68" x2="72" y2="62" stroke="#ffeaaa" strokeWidth="1" strokeLinecap="round" className="d60-ray3" />
      <line x1="100" y1="68" x2="128" y2="62" stroke="#ffeaaa" strokeWidth="1" strokeLinecap="round" className="d60-ray4" />
      <line x1="100" y1="68" x2="100" y2="44" stroke="#ffd080" strokeWidth="2" strokeLinecap="round" className="d60-ray5" />
      <line x1="100" y1="68" x2="88" y2="46" stroke="#ffeaaa" strokeWidth="1" strokeLinecap="round" className="d60-ray6" />
      <line x1="100" y1="68" x2="112" y2="46" stroke="#ffeaaa" strokeWidth="1" strokeLinecap="round" className="d60-ray7" />

      {/* Wing hints barely visible at sides — suggested rather than fully formed */}
      <path d="M64 102 C50 90 42 97 44 108 C46 116 58 120 68 114"
        fill="#e8a840" stroke="#e8a840" strokeWidth="1.5"
        strokeOpacity="0.7" className="d60-wing1" style={{ fillOpacity: 0 }} />
      <path d="M136 102 C150 90 158 97 156 108 C154 116 142 120 132 114"
        fill="#e8a840" stroke="#e8a840" strokeWidth="1.5"
        strokeOpacity="0.7" className="d60-wing2" style={{ fillOpacity: 0 }} />
    </svg>
  );
}

function ButterflySVG() {
  return (
    <svg viewBox="0 0 200 178" width="200" height="178" aria-hidden="true">
      <defs>
        <style>{`
          .d90-body{stroke-dasharray:130;stroke-dashoffset:130;fill-opacity:0;
            animation:sd90 .3s 0s ease-out forwards,fi90 .25s .20s ease-out forwards}
          .d90-uw-l{stroke-dasharray:260;stroke-dashoffset:260;fill-opacity:0;
            animation:sd90 .55s .20s ease-out forwards,fi90 .40s .50s ease-out forwards}
          .d90-uw-r{stroke-dasharray:260;stroke-dashoffset:260;fill-opacity:0;
            animation:sd90 .55s .28s ease-out forwards,fi90 .40s .58s ease-out forwards}
          .d90-lw-l{stroke-dasharray:180;stroke-dashoffset:180;fill-opacity:0;
            animation:sd90 .40s .72s ease-out forwards,fi90 .30s .95s ease-out forwards}
          .d90-lw-r{stroke-dasharray:180;stroke-dashoffset:180;fill-opacity:0;
            animation:sd90 .40s .78s ease-out forwards,fi90 .30s 1.01s ease-out forwards}
          .d90-inner-l{fill-opacity:0;animation:fi90 .25s 1.05s ease-out forwards}
          .d90-inner-r{fill-opacity:0;animation:fi90 .25s 1.10s ease-out forwards}
          .d90-sp1{opacity:0;animation:fi90 .15s 1.35s ease-out forwards}
          .d90-sp2{opacity:0;animation:fi90 .15s 1.42s ease-out forwards}
          .d90-sp3{opacity:0;animation:fi90 .15s 1.48s ease-out forwards}
          .d90-sp4{opacity:0;animation:fi90 .15s 1.54s ease-out forwards}
          .d90-ant1{stroke-dasharray:55;stroke-dashoffset:55;
            animation:sd90 .20s 1.55s ease-out forwards}
          .d90-ant2{stroke-dasharray:55;stroke-dashoffset:55;
            animation:sd90 .20s 1.65s ease-out forwards}
          .d90-atip{opacity:0;animation:fi90 .12s 1.80s ease-out forwards}
          @keyframes sd90{to{stroke-dashoffset:0}}
          @keyframes fi90{to{opacity:1;fill-opacity:1}}
        `}</style>
      </defs>

      {/* Body */}
      <ellipse cx="100" cy="105" rx="6" ry="30"
        fill="#26215C" stroke="#1a1840" strokeWidth="1" className="d90-body" />
      <circle cx="100" cy="71" r="6"
        fill="#26215C" stroke="#1a1840" strokeWidth="1" className="d90-body" />

      {/* Upper wings */}
      <path d="M100 82 C90 66 60 46 32 56 C14 63 18 90 30 102 C44 116 72 120 94 110Z"
        fill="#7F77DD" stroke="#4a44a0" strokeWidth="1.5" className="d90-uw-l" style={{ fillOpacity: 0 }} />
      <path d="M100 82 C110 66 140 46 168 56 C186 63 182 90 170 102 C156 116 128 120 106 110Z"
        fill="#7F77DD" stroke="#4a44a0" strokeWidth="1.5" className="d90-uw-r" style={{ fillOpacity: 0 }} />

      {/* Lower wings */}
      <path d="M96 112 C80 120 55 132 48 150 C42 164 58 170 72 162 C88 152 97 132 100 120Z"
        fill="#534AB7" stroke="#3a3490" strokeWidth="1.5" className="d90-lw-l" style={{ fillOpacity: 0 }} />
      <path d="M104 112 C120 120 145 132 152 150 C158 164 142 170 128 162 C112 152 103 132 100 120Z"
        fill="#534AB7" stroke="#3a3490" strokeWidth="1.5" className="d90-lw-r" style={{ fillOpacity: 0 }} />

      {/* Inner wing highlights */}
      <path d="M100 84 C92 71 68 53 45 63 C30 70 35 90 46 101 C58 112 82 116 96 108Z"
        fill="#AFA9EC" className="d90-inner-l" style={{ fillOpacity: 0 }} />
      <path d="M100 84 C108 71 132 53 155 63 C170 70 165 90 154 101 C142 112 118 116 104 108Z"
        fill="#AFA9EC" className="d90-inner-r" style={{ fillOpacity: 0 }} />

      {/* Spots near upper wing edges */}
      <circle cx="42" cy="73" r="5" fill="#EEEDFE" className="d90-sp1" />
      <circle cx="158" cy="73" r="5" fill="#EEEDFE" className="d90-sp2" />
      <circle cx="38" cy="89" r="3.5" fill="#EEEDFE" className="d90-sp3" />
      <circle cx="162" cy="89" r="3.5" fill="#EEEDFE" className="d90-sp4" />

      {/* Antennae */}
      <path d="M97 67 C90 54 78 43 70 33"
        fill="none" stroke="#534AB7" strokeWidth="1.5" strokeLinecap="round" className="d90-ant1" />
      <circle cx="69" cy="31" r="3" fill="#7F77DD" className="d90-atip" />
      <path d="M103 67 C110 54 122 43 130 33"
        fill="none" stroke="#534AB7" strokeWidth="1.5" strokeLinecap="round" className="d90-ant2" />
      <circle cx="131" cy="31" r="3" fill="#7F77DD" className="d90-atip" />
    </svg>
  );
}

// Switcher defined at module level — stable reference, no recreation on render.
function MilestoneIllustration({ milestone }: { milestone: DayMilestone }) {
  if (milestone === 'day7')  return <CaterpillarSVG />;
  if (milestone === 'day30') return <ChrysalisSVG />;
  if (milestone === 'day60') return <CrackingCocoonSVG />;
  return <ButterflySVG />;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function SharePrompt({ isOpen, onClose, milestone }: SharePromptProps) {
  const [shareSuccess, setShareSuccess] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShareSuccess(false);
      setContentVisible(false);
      return;
    }
    // Text fades in after illustration finishes drawing (~2s)
    const timer = setTimeout(() => setContentVisible(true), 2000);
    return () => clearTimeout(timer);
  }, [isOpen, milestone]);

  if (!isOpen) return null;

  const isDayMilestone = milestone in DAY_CONFIG;

  const handleShare = async (shareText: string) => {
    const appUrl = 'https://play.google.com/store/apps/details?id=app.renew90.journal';
    const fullMessage = `${shareText}\n\n${appUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Renew90 – 90-Day Identity Reset', text: shareText, url: appUrl });
        setShareSuccess(true);
        setTimeout(onClose, 1500);
      } catch {
        // User cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(fullMessage);
        setShareSuccess(true);
        setTimeout(onClose, 2000);
      } catch {
        alert(`Copy this message to share:\n\n${fullMessage}`);
      }
    }
  };

  // ── Day milestone: full metamorphosis modal ───────────────────────────────

  if (isDayMilestone) {
    const cfg = DAY_CONFIG[milestone as DayMilestone];

    return (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/60" />

        {/* Modal */}
        <div
          className="relative z-10 w-full sm:max-w-sm sm:mx-4 rounded-t-3xl sm:rounded-3xl overflow-hidden share-slide-up"
          onClick={e => e.stopPropagation()}
        >
          {/* Hero section */}
          <div style={{ backgroundColor: cfg.bg }} className="px-6 pt-8 pb-5 text-center">
            <div className="flex justify-center">
              <MilestoneIllustration milestone={milestone as DayMilestone} />
            </div>
            <h2
              className="text-2xl italic font-light mb-2 leading-snug mt-3"
              style={{ color: cfg.text, fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              {cfg.headline}
            </h2>
            <p
              className="text-sm font-light leading-relaxed"
              style={{ color: cfg.text, opacity: 0.85 }}
            >
              {cfg.subtext}
            </p>
          </div>

          {/* Body section */}
          <div className="bg-white dark:bg-gray-900 px-6 pt-5 pb-8">
            <ProgressDots active={cfg.progress} />

            {!shareSuccess ? (
              <div
                style={{ opacity: contentVisible ? 1 : 0, transition: 'opacity 0.5s ease' }}
              >
                {/* Quote */}
                <p
                  className="text-center italic text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  "{cfg.quote}"
                </p>

                {/* Primary CTA */}
                <button
                  onClick={() => handleShare(cfg.shareText)}
                  style={{ backgroundColor: cfg.bg, color: cfg.text }}
                  className="w-full py-3.5 rounded-xl font-medium text-sm mb-3 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  {cfg.primaryBtn}
                </button>

                {/* Secondary */}
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {cfg.secondaryBtn}
                </button>

                <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-4">
                  {cfg.hint}
                </p>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="inline-block p-4 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                  <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-[var(--text-primary)] mb-2">
                  {navigator.share ? 'Shared!' : 'Copied to clipboard!'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {navigator.share ? 'Thanks for sharing your journey ✨' : 'Paste anywhere to share your progress ✨'}
                </p>
              </div>
            )}
          </div>
        </div>

        <style>{`
          @keyframes shareSlideUp {
            from { opacity: 0; transform: translateY(32px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .share-slide-up {
            animation: shareSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}</style>
      </div>
    );
  }

  // ── Streak milestone: simpler celebration card ────────────────────────────

  const streakContent = milestone === 'streak7'
    ? {
        title: '7-Day Streak! 🔥',
        message: 'Seven days in a row. Consistency is transformation.',
        shareText: "7 days in a row of showing up for myself 🔥\n\nUsing the 90-Day Identity Reset for daily reflection and the consistency is everything. Small daily steps, real growth.\n\nIf you're looking for a structured way to reconnect with yourself, this is it. 🌱",
      }
    : {
        title: '30-Day Streak! 🔥',
        message: "Thirty consecutive days. You're unstoppable.",
        shareText: "30 days in a row 🔥\n\nShowing up for myself every single day through the 90-Day Identity Reset. The discipline is becoming second nature.\n\nConsistency > intensity. This journey proves it. 💪",
      };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      style={{ animation: 'shareFadeIn 0.2s ease-out' }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        style={{ animation: 'shareSlideUpSmall 0.3s ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-orange-400 to-red-500 p-8 text-center">
          <div className="text-6xl mb-4" style={{ animation: 'shareBounce 1s infinite' }}>🔥</div>
          <h2 className="text-2xl font-bold text-white mb-2">{streakContent.title}</h2>
          <p className="text-orange-100">{streakContent.message}</p>
        </div>
        <div className="p-6">
          {!shareSuccess ? (
            <>
              <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                Want to inspire others? Share your progress and help someone else start their journey.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => handleShare(streakContent.shareText)}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share My Streak
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="inline-block p-4 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-medium text-[var(--text-primary)] mb-2">
                {navigator.share ? 'Shared!' : 'Copied to clipboard!'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {navigator.share ? 'Thanks for sharing your journey ✨' : 'Paste anywhere to share your progress ✨'}
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shareFadeIn     { from{opacity:0} to{opacity:1} }
        @keyframes shareSlideUpSmall { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shareBounce     {
          0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)}
        }
      `}</style>
    </div>
  );
}
