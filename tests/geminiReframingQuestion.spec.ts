/**
 * Tests for generateReframingQuestion — the Flip Journal AI step.
 *
 * Root cause of the production truncation bug (March 2026):
 *   Gemini 2.5 Flash has thinking enabled by default. The thinking tokens
 *   share the maxOutputTokens budget. With maxOutputTokens=256 the thinking
 *   phase consumed nearly all tokens, leaving only a sentence fragment as the
 *   actual answer (e.g. 'What if this "stuck" feeling is actually a').
 *
 * Fix applied: thinkingBudget=0 + maxOutputTokens=1024 on the Gemini SDK path.
 *
 * Architecture note: generateReframingQuestion() throws on AI failure.
 * The fallback to getRandomFallbackQuestion() is handled by the caller
 * (FlipInputModal.tsx), not inside this function.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// ─── Stub localStorage (not available in node test environment) ───────────────
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
});

// ─── Mock @google/genai before any import that resolves it ────────────────────
const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => {
  class GoogleGenAI {
    models = { generateContent: mockGenerateContent };
    constructor(_opts: unknown) {}
  }
  return { GoogleGenAI };
});

// Activate the direct Gemini SDK path (not Vertex AI)
vi.stubEnv('VITE_USE_VERTEX_AI', 'false');
vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');

// Import AFTER mocks and env stubs
const { generateReframingQuestion } = await import('../services/geminiService');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function stubResponse(text: string) {
  mockGenerateContent.mockResolvedValueOnce({ text });
}

beforeEach(() => vi.clearAllMocks());

// ─── Config guards ─────────────────────────────────────────────────────────────

describe('generateReframingQuestion — AI config guards', () => {

  test('calls Gemini SDK with thinkingBudget=0 to prevent thinking from consuming the token budget', async () => {
    stubResponse('What if this challenge is preparing you for something greater?');
    await generateReframingQuestion('I feel stuck at work.');
    const config = mockGenerateContent.mock.calls[0][0].config;
    expect(config).toMatchObject({ thinkingConfig: { thinkingBudget: 0 } });
  });

  test('calls Gemini SDK with maxOutputTokens >= 512', async () => {
    stubResponse('What strength have you been building through this difficulty?');
    await generateReframingQuestion('I keep failing at this.');
    const config = mockGenerateContent.mock.calls[0][0].config;
    expect(config.maxOutputTokens).toBeGreaterThanOrEqual(512);
  });

  test('uses gemini-2.5-flash model', async () => {
    stubResponse('What would your future self say about this moment?');
    await generateReframingQuestion('I feel overwhelmed.');
    expect(mockGenerateContent.mock.calls[0][0].model).toBe('gemini-2.5-flash');
  });

});

// ─── Response handling ─────────────────────────────────────────────────────────

describe('generateReframingQuestion — response handling', () => {

  test('returns the full question string from the API', async () => {
    const full = 'What if this "stuck" feeling is actually a catalyst pointing you toward your purpose?';
    stubResponse(full);
    expect(await generateReframingQuestion('I feel stuck.')).toBe(full);
  });

  test('trims leading/trailing whitespace from the response', async () => {
    stubResponse('  What are you learning from this?  \n');
    expect(await generateReframingQuestion('Hard week.')).toBe('What are you learning from this?');
  });

  test('throws on network failure so the caller can apply a fallback question', async () => {
    // generateReframingQuestion re-throws — FlipInputModal catches and calls
    // getRandomFallbackQuestion(). This test confirms the throw contract is intact.
    mockGenerateContent.mockRejectedValueOnce(new Error('Network error'));
    await expect(generateReframingQuestion('I am overwhelmed.')).rejects.toThrow();
  });

  test('throws on quota error so the caller can apply a fallback question', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('429 RESOURCE_EXHAUSTED'));
    await expect(generateReframingQuestion('Feeling stuck again.')).rejects.toThrow();
  });

});

// ─── Truncation regression guard ───────────────────────────────────────────────

describe('generateReframingQuestion — truncation regression (March 2026)', () => {

  test('returns a complete question that ends with a question mark', async () => {
    // The bug produced: 'What if this "stuck" feeling is actually a' — no question mark
    const full = 'What if this "stuck" feeling is actually a signal pointing you toward your next level?';
    stubResponse(full);
    const result = await generateReframingQuestion('I feel stuck in my career.');
    expect(result.trimEnd()).toMatch(/\?$/);
  });

  test('regression: maxOutputTokens was 256 — must now be > 256 or thinking truncates the answer', async () => {
    stubResponse('What hidden opportunity might this challenge be revealing to you?');
    await generateReframingQuestion('Everything feels hard.');
    const config = mockGenerateContent.mock.calls[0][0].config;
    expect(config.maxOutputTokens).toBeGreaterThan(256);
  });

});
