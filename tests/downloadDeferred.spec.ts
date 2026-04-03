/**
 * downloadDeferred.spec.ts
 *
 * Regression tests for the download-URL lifecycle in all three download paths.
 *
 * Bug: URL.revokeObjectURL was called synchronously immediately after
 * link.click(). On mobile/Capacitor the click dispatch is asynchronous, so
 * the blob URL was freed before the browser could fetch it, causing a silent
 * no-download. Fixed by wrapping revokeObjectURL in a 10-second setTimeout.
 *
 * Affected files (all fixed):
 *   services/moodSummaryImageService.ts  — downloadImage()
 *   src/services/dataExportService.ts    — downloadJSON()
 *   components/MFASetupModal.tsx         — inline download handler
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadImage } from '../services/moodSummaryImageService';
import { downloadJSON } from '../src/services/dataExportService';

// ─── Browser API stubs ───────────────────────────────────────────────────────

const FAKE_URL = 'blob:fake-url-12345';
let revokeObjectURL: ReturnType<typeof vi.fn>;
let createObjectURL: ReturnType<typeof vi.fn>;
let linkClick: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();

  revokeObjectURL = vi.fn();
  createObjectURL = vi.fn(() => FAKE_URL);
  linkClick = vi.fn();

  // Add browser-only static methods to Node's URL without replacing the constructor.
  (URL as any).createObjectURL = createObjectURL;
  (URL as any).revokeObjectURL = revokeObjectURL;

  vi.stubGlobal('document', {
    createElement: () => ({ href: '', download: '', click: linkClick }),
    body: { appendChild: vi.fn(), removeChild: vi.fn() },
  });
});

afterEach(() => {
  delete (URL as any).createObjectURL;
  delete (URL as any).revokeObjectURL;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// ─── downloadImage ───────────────────────────────────────────────────────────

describe('downloadImage — deferred URL revocation', () => {
  test('does NOT revoke the URL synchronously after click', () => {
    const blob = new Blob(['img'], { type: 'image/png' });

    downloadImage(blob, 'test.png');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(linkClick).toHaveBeenCalled();
    expect(revokeObjectURL).not.toHaveBeenCalled(); // must NOT be immediate
  });

  test('revokes the URL after the timeout fires', () => {
    const blob = new Blob(['img'], { type: 'image/png' });

    downloadImage(blob, 'test.png');
    vi.runAllTimers();

    expect(revokeObjectURL).toHaveBeenCalledWith(FAKE_URL);
  });

  test('uses the correct blob URL when revoking', () => {
    const blob = new Blob(['img'], { type: 'image/png' });

    downloadImage(blob, 'summary.png');
    vi.runAllTimers();

    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith(FAKE_URL);
  });
});

// ─── downloadJSON (dataExportService) ────────────────────────────────────────

describe('downloadJSON — deferred URL revocation', () => {
  test('does NOT revoke the URL synchronously', () => {
    downloadJSON('{"test":1}', 'backup.json');

    expect(createObjectURL).toHaveBeenCalled();
    expect(linkClick).toHaveBeenCalled();
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });

  test('revokes the URL after the timeout fires', () => {
    downloadJSON('{"test":1}', 'backup.json');
    vi.runAllTimers();

    expect(revokeObjectURL).toHaveBeenCalledWith(FAKE_URL);
  });
});
