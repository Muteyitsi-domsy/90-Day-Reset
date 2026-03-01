#!/usr/bin/env node
/**
 * Increments CURRENT_PROJECT_VERSION in the Xcode project file.
 * Runs automatically as part of `npm run release`.
 *
 * Updates both Debug and Release build configurations.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pbxprojPath = resolve(
  __dirname,
  '../ios/App/App.xcodeproj/project.pbxproj'
);

const content = readFileSync(pbxprojPath, 'utf8');

// Find all CURRENT_PROJECT_VERSION values and extract the current number
const match = content.match(/CURRENT_PROJECT_VERSION = (\d+);/);
if (!match) {
  console.error('❌  Could not find CURRENT_PROJECT_VERSION in project.pbxproj');
  process.exit(1);
}

const current = parseInt(match[1], 10);
const next = current + 1;

// Replace ALL occurrences (Debug + Release configs)
const updated = content.replaceAll(
  `CURRENT_PROJECT_VERSION = ${current};`,
  `CURRENT_PROJECT_VERSION = ${next};`
);

writeFileSync(pbxprojPath, updated, 'utf8');

console.log(`✅  Build number: ${current} → ${next}`);
