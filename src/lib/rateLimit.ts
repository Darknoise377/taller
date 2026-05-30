/**
 * Rate limiter with two backends:
 *  - Upstash Redis (production): multi-instance safe, used when
 *    UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set.
 *  - In-memory Map (development fallback): single-instance only.
 *
 * To enable Upstash: set both env vars in .env.local / Vercel dashboard.
 */

import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

type RateLimitOptions = {
  keyPrefix: string;
  windowMs: number;
  max: number;
};

type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds?: number;
};

// ─── Upstash initialisation (lazy, only when env vars present) ───────────────

let upstashLimiterCache: Map<string, Ratelimit> | null = null;
let warnedMissingUpstash = false;

function isUpstashConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function warnMissingUpstashOnce(): void {
  if (warnedMissingUpstash || process.env.NODE_ENV !== 'production') return;
  if (isUpstashConfigured()) return;
  warnedMissingUpstash = true;
  console.error(
    '[rateLimit] CRITICAL: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production. ' +
      'Rate limits are per-instance only until Upstash is configured.',
  );
}

function getUpstashLimiter(options: RateLimitOptions): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  if (!upstashLimiterCache) {
    upstashLimiterCache = new Map();
  }

  const cacheKey = `${options.keyPrefix}:${options.max}:${options.windowMs}`;
  if (!upstashLimiterCache.has(cacheKey)) {
    const redis = new Redis({ url, token });
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(options.max, `${options.windowMs} ms`),
      prefix: options.keyPrefix,
    });
    upstashLimiterCache.set(cacheKey, limiter);
  }

  return upstashLimiterCache.get(cacheKey)!;
}

// ─── In-memory fallback ──────────────────────────────────────────────────────

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60 * 1000;

function cleanupExpiredBuckets() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) {
      buckets.delete(key);
    }
  }
}

function inMemoryRateLimit(ip: string, options: RateLimitOptions): RateLimitResult {
  cleanupExpiredBuckets();
  const now = Date.now();
  const key = `${options.keyPrefix}:${ip}`;

  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    const resetAt = now + options.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, limit: options.max, remaining: options.max - 1, resetAt };
  }

  if (existing.count >= options.max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { ok: false, limit: options.max, remaining: 0, resetAt: existing.resetAt, retryAfterSeconds };
  }

  existing.count += 1;
  buckets.set(key, existing);
  return { ok: true, limit: options.max, remaining: Math.max(0, options.max - existing.count), resetAt: existing.resetAt };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

export async function rateLimit(req: Request, options: RateLimitOptions): Promise<RateLimitResult> {
  const ip = getClientIp(req);
  const limiter = getUpstashLimiter(options);

  if (limiter) {
    const result = await limiter.limit(ip);
    const now = Date.now();
    return {
      ok: result.success,
      limit: result.limit,
      remaining: result.remaining,
      resetAt: result.reset,
      retryAfterSeconds: result.success
        ? undefined
        : Math.max(1, Math.ceil((result.reset - now) / 1000)),
    };
  }

  warnMissingUpstashOnce();

  // In production without Upstash, apply a stricter per-instance cap.
  const effectiveOptions =
    process.env.NODE_ENV === 'production'
      ? { ...options, max: Math.min(options.max, 5) }
      : options;

  return inMemoryRateLimit(ip, effectiveOptions);
}

