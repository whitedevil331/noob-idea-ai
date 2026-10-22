import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TokenBucketRateLimiter,
  LRUCache,
  hashIdeaPrompt,
  scrubSensitivePII,
} from '../src/lib/security/rateLimiter';
import {
  IdeaInputSchema,
  TargetMarketEnum,
  safeParseValidationReport,
  extractJsonFromText,
} from '../src/lib/schemas/validationSchema';

describe('Algorithmic Security & TokenBucketRateLimiter', () => {
  let limiter: TokenBucketRateLimiter;

  beforeEach(() => {
    // 3 tokens capacity, refills 1 token per second
    limiter = new TokenBucketRateLimiter(3, 1);
  });

  it('allows requests within burst capacity and tracks remaining tokens', () => {
    const res1 = limiter.consume('user_123');
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = limiter.consume('user_123');
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = limiter.consume('user_123');
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);

    // 4th request exceeds capacity
    const res4 = limiter.consume('user_123');
    expect(res4.allowed).toBe(false);
    expect(res4.remaining).toBe(0);
    expect(res4.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it('maintains strict isolation between different users', () => {
    limiter.consume('user_alice');
    limiter.consume('user_alice');
    limiter.consume('user_alice');
    const aliceBlocked = limiter.consume('user_alice');
    expect(aliceBlocked.allowed).toBe(false);

    // user_bob should have a full bucket
    const bobFirst = limiter.consume('user_bob');
    expect(bobFirst.allowed).toBe(true);
    expect(bobFirst.remaining).toBe(2);
  });

  it('mathematically refills tokens over time', async () => {
    // Consume all 3 tokens
    limiter.consume('user_timer');
    limiter.consume('user_timer');
    limiter.consume('user_timer');
    expect(limiter.consume('user_timer').allowed).toBe(false);

    // Advance time by 1100ms
    vi.useFakeTimers();
    vi.advanceTimersByTime(1100);

    const refillCheck = limiter.consume('user_timer');
    expect(refillCheck.allowed).toBe(true);

    vi.useRealTimers();
  });
});

describe('LRUCache & Prompt Hashing', () => {
  it('stores and retrieves cached entries', () => {
    const cache = new LRUCache<string, string>(3);
    cache.set('k1', 'val1');
    cache.set('k2', 'val2');

    expect(cache.get('k1')).toBe('val1');
    expect(cache.has('k2')).toBe(true);
    expect(cache.get('k3')).toBeUndefined();
  });

  it('evicts least recently used items when capacity is reached', () => {
    const cache = new LRUCache<string, string>(2);
    cache.set('k1', 'val1');
    cache.set('k2', 'val2');

    // Access k1 so k2 becomes the oldest
    cache.get('k1');

    // Insert 3rd item, k2 should be evicted
    cache.set('k3', 'val3');

    expect(cache.get('k1')).toBe('val1');
    expect(cache.get('k3')).toBe('val3');
    expect(cache.get('k2')).toBeUndefined();
  });

  it('generates identical hash keys for semantically identical prompts regardless of casing and spacing', () => {
    const h1 = hashIdeaPrompt('Micro SaaS Analytics', 'Real-time telemetry for Stripe', 'B2B_SAAS');
    const h2 = hashIdeaPrompt(' micro saas analytics ', 'Real-time   telemetry  for Stripe ', 'B2B_SAAS');
    expect(h1).toBe(h2);

    const hDifferent = hashIdeaPrompt('Micro SaaS Analytics', 'Real-time telemetry for Stripe', 'DEV_TOOLS');
    expect(h1).not.toBe(hDifferent);
  });
});

describe('PII Redaction Middleware', () => {
  it('deterministically redacts email addresses', () => {
    const text = 'Contact founder at alex.developer@hypergrowth.ai or support@acme.co for access.';
    const scrubbed = scrubSensitivePII(text);
    expect(scrubbed).not.toContain('alex.developer@hypergrowth.ai');
    expect(scrubbed).not.toContain('support@acme.co');
    expect(scrubbed).toBe('Contact founder at [REDACTED_EMAIL] or [REDACTED_EMAIL] for access.');
  });

  it('deterministically redacts phone numbers', () => {
    const text = 'Call us at +1 (555) 234-5678 or 415-555-9012 for the demo.';
    const scrubbed = scrubSensitivePII(text);
    expect(scrubbed).not.toContain('555-234-5678');
    expect(scrubbed).not.toContain('415-555-9012');
    expect(scrubbed).toContain('[REDACTED_PHONE]');
  });

  it('leaves clean technical problem statements untouched', () => {
    const text = 'Distributed consensus layer for robotic fleets running on WebAssembly.';
    expect(scrubSensitivePII(text)).toBe(text);
  });
});

describe('Zod Schema Contracts & Parsing', () => {
  it('validates correct IdeaInputSchema payloads', () => {
    const valid = {
      title: 'Vector Mesh',
      problemStatement: 'Engineers cannot query high-dimensional embeddings across edge devices with sub-10ms latency.',
      targetMarket: 'DEV_TOOLS' as const,
      monthlyBudgetUsd: 1200,
    };
    const parsed = IdeaInputSchema.parse(valid);
    expect(parsed.title).toBe('Vector Mesh');
    expect(parsed.monthlyBudgetUsd).toBe(1200);
  });

  it('rejects titles that are too short', () => {
    const invalid = {
      title: 'Ai',
      problemStatement: 'Engineers cannot query high-dimensional embeddings across edge devices with sub-10ms latency.',
      targetMarket: 'DEV_TOOLS',
    };
    expect(() => IdeaInputSchema.parse(invalid)).toThrow();
  });

  it('rejects problem statements that are too brief for architectural audit', () => {
    const invalid = {
      title: 'Valid Title',
      problemStatement: 'Too short',
      targetMarket: 'B2B_SAAS',
    };
    expect(() => IdeaInputSchema.parse(invalid)).toThrow();
  });

  it('extracts JSON from raw LLM output wrapped in markdown code fences', () => {
    const rawWithMarkdown = '```json\n{\n  "status": "success",\n  "code": 200\n}\n```';
    const extracted = extractJsonFromText(rawWithMarkdown) as any;
    expect(extracted.status).toBe('success');
    expect(extracted.code).toBe(200);
  });
});
