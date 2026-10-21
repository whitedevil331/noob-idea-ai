import { FullIdeaValidationReport } from '../schemas/validationSchema';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

interface UserBucket {
  tokens: number;
  lastRefill: number; // timestamp in milliseconds
}

/**
 * Stateful Token Bucket Rate Limiter with continuous mathematical refill.
 */
export class TokenBucketRateLimiter {
  private capacity: number;
  private refillRatePerSecond: number;
  private buckets: Map<string, UserBucket> = new Map();

  constructor(capacity = 5, refillRatePerSecond = 0.2) {
    this.capacity = capacity;
    this.refillRatePerSecond = refillRatePerSecond;
  }

  public consume(userId: string, tokens = 1): RateLimitResult {
    const now = Date.now();
    let bucket = this.buckets.get(userId);

    if (!bucket) {
      bucket = {
        tokens: this.capacity,
        lastRefill: now,
      };
      this.buckets.set(userId, bucket);
    } else {
      // Calculate continuous refill based on elapsed time
      const elapsedSeconds = (now - bucket.lastRefill) / 1000;
      const refilledTokens = elapsedSeconds * this.refillRatePerSecond;
      bucket.tokens = Math.min(this.capacity, bucket.tokens + refilledTokens);
      bucket.lastRefill = now;
    }

    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      return {
        allowed: true,
        remaining: Math.max(0, Math.floor(bucket.tokens)),
        retryAfterSeconds: 0,
      };
    } else {
      const deficit = tokens - bucket.tokens;
      const retryAfterSeconds = Math.max(1, Math.ceil(deficit / this.refillRatePerSecond));
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
      };
    }
  }

  public reset(userId?: string): void {
    if (userId) {
      this.buckets.delete(userId);
    } else {
      this.buckets.clear();
    }
  }
}

/**
 * Deterministic Least Recently Used (LRU) Cache implementation using Map insertion ordering.
 */
export class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V> = new Map();

  constructor(capacity = 50) {
    this.capacity = capacity;
  }

  public get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }
    // Re-insert to refresh recency in Map
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  public set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Oldest item is the first entry in keys() iterator
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, value);
  }

  public has(key: K): boolean {
    return this.cache.has(key);
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}

/**
 * Generates a normalized hash key for an idea prompt.
 */
export function hashIdeaPrompt(title: string, problemStatement: string, targetMarket: string): string {
  const normalized = `${title.trim().toLowerCase()}:::${problemStatement.trim().toLowerCase().replace(/\s+/g, ' ')}:::${targetMarket.trim().toUpperCase()}`;
  
  // Fast 32-bit FNV-1a hash implementation
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `hash_${(hash >>> 0).toString(16)}`;
}

/**
 * Deterministically redacts sensitive PII (emails and phone numbers) from prompt text.
 */
export function scrubSensitivePII(input: string): string {
  if (!input) return '';

  // Redact emails
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  let scrubbed = input.replace(emailRegex, '[REDACTED_EMAIL]');

  // Redact phone numbers (international, US standard, dashed, parenthesized)
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g;
  scrubbed = scrubbed.replace(phoneRegex, (match) => {
    // Avoid redacting simple 4-digit numbers or short codes unless looking like a phone number
    const digitsOnly = match.replace(/\D/g, '');
    if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
      return '[REDACTED_PHONE]';
    }
    return match;
  });

  return scrubbed;
}

// Global singletons for runtime application lifecycle
export const globalRateLimiter = new TokenBucketRateLimiter(5, 0.2); // 5 tokens max, refills 1 token every 5s
export const globalValidationCache = new LRUCache<string, FullIdeaValidationReport>(50);
