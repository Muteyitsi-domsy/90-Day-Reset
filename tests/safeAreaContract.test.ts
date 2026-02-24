/**
 * Structural regression test — Safe Area Layout Contract
 * Run: npx tsx tests/safeAreaContract.test.ts
 *
 * Verifies that the two foundational safe-area guarantees are present.
 * If either assertion fails, the iOS notch/Dynamic Island fix has been
 * accidentally removed and must be restored before shipping.
 *
 * Ref: docs/layout/safe-area-spec.md
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.error(`  FAIL  ${label}`);
    if (detail) console.error(`        → ${detail}`);
  }
}

function section(name: string) {
  console.log(`\n--- ${name} ---`);
}

const root = resolve(__dirname, '..');

const html   = readFileSync(resolve(root, 'index.html'), 'utf-8');
const css    = readFileSync(resolve(root, 'src/index.css'), 'utf-8');
const header = readFileSync(resolve(root, 'components/Header.tsx'), 'utf-8');

section('viewport meta');

assert(
  html.includes('viewport-fit=cover'),
  'index.html viewport meta includes viewport-fit=cover',
  'Add viewport-fit=cover to <meta name="viewport"> — without it env() is always 0 on iOS.'
);

section('CSS utility definition');

assert(
  css.includes('@utility safe-area-top'),
  'index.css defines @utility safe-area-top',
  'The @utility safe-area-top block is missing from src/index.css.'
);

assert(
  css.includes('env(safe-area-inset-top)'),
  'safe-area-top utility references env(safe-area-inset-top)',
  'The utility must use env(safe-area-inset-top), not a hardcoded pixel value.'
);

assert(
  css.includes('env(safe-area-inset-bottom)'),
  'body includes env(safe-area-inset-bottom)',
  'body padding-bottom must reference env(safe-area-inset-bottom).'
);

assert(
  css.includes('env(safe-area-inset-left)'),
  'body includes env(safe-area-inset-left)',
  'body padding-left must reference env(safe-area-inset-left).'
);

assert(
  css.includes('env(safe-area-inset-right)'),
  'body includes env(safe-area-inset-right)',
  'body padding-right must reference env(safe-area-inset-right).'
);

assert(
  !css.match(/padding-top:\s*\d+px/),
  'index.css does not hardcode a px value for padding-top',
  'A hardcoded pixel top-padding was found. Use max(1rem, env(safe-area-inset-top)) instead.'
);

section('Header applies safe-area-top');

assert(
  header.includes('safe-area-top'),
  'Header.tsx uses safe-area-top class',
  'Header sticky top-0 must have safe-area-top applied. Do not revert to plain p-4.'
);

assert(
  !header.includes('"p-4"') && !header.includes("'p-4'"),
  'Header.tsx does not use bare p-4 (removes top safe-area clearance)',
  'p-4 sets equal padding on all sides. Replace with px-4 pb-4 safe-area-top.'
);

section('max() preserves baseline spacing');

assert(
  css.includes('max(1rem, env(safe-area-inset-top))'),
  'safe-area-top utility uses max() to preserve 1rem on Android/desktop',
  'Wrap env() in max(1rem, env(safe-area-inset-top)) so Android layout is unchanged.'
);

// ─── Summary ──────────────────────────────────────────────────────────

console.log(`\n========================================`);
console.log(`  ${passed + failed} tests: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  console.error('Safe area regression detected. See FAILING tests above.');
  console.error('Ref: docs/layout/safe-area-spec.md\n');
}

process.exit(failed > 0 ? 1 : 0);
