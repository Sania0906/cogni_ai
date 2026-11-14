import { Request, Response, NextFunction, RequestHandler } from "express";

export interface RateLimiterOptions {
  /** Logical limiter identifier included in bucket keys and error diagnostics. */
  name: string;
  /** Time window in milliseconds before hit counts reset. */
  windowMs: number;
  /** Maximum requests allowed within the time window per key. */
  maxRequests: number;
  /** Optional custom key extractor (defaults to normalized client IP). */
  keyGenerator?: (req: Request) => string;
  /** Optional 429 JSON error message. */
  message?: string;
}

interface RateBucket {
  count: number;
  resetAt: number;
}

export interface ManagedRateLimiter extends RequestHandler {
  reset: () => void;
}

const activeLimiters: ManagedRateLimiter[] = [];
const TRUTHY_PROXY_FLAGS = new Set(["true", "1", "yes"]);

/**
 * Validates and resolves Express's `trust proxy` hop count from `TRUST_PROXY_HOPS`.
 * Defaults to 1 when running on Render's single reverse-proxy topology, and 0 when directly exposed.
 */
export function resolveTrustProxyHops(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.TRUST_PROXY_HOPS;
  if (raw !== undefined) {
    const trimmed = raw.trim();
    if (trimmed !== "") {
      if (!/^\d+$/.test(trimmed)) {
        throw new Error(
          `Invalid TRUST_PROXY_HOPS value '${raw}': must be a non-negative integer.`
        );
      }
      return Number.parseInt(trimmed, 10);
    }
  }

  const renderFlag = (env.RENDER || "").trim().toLowerCase();
  return TRUTHY_PROXY_FLAGS.has(renderFlag) ? 1 : 0;
}

/**
 * Resolves the client IP using Express's proxy-validated `req.ip`, then the socket address.
 * Never parses untrusted left-most X-Forwarded-For header entries directly.
 */
export function resolveClientIp(req: Request): string {
  const trustedIp = typeof req.ip === "string" ? req.ip.trim() : "";
  if (trustedIp) return trustedIp;

  const socketIp =
    typeof req.socket?.remoteAddress === "string" ? req.socket.remoteAddress.trim() : "";
  if (socketIp) return socketIp;

  return "unknown";
}

/**
 * Creates a lightweight, zero-dependency fixed-window HTTP rate limiter middleware
 * returning RFC-style rate-limit headers and HTTP 429 on threshold excess.
 */
export function createRateLimiter(options: RateLimiterOptions): ManagedRateLimiter {
  const buckets = new Map<string, RateBucket>();

  // Periodically evict expired buckets without keeping Node's event loop alive.
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (now >= bucket.resetAt) {
        buckets.delete(key);
      }
    }
  }, Math.max(options.windowMs, 60_000));
  cleanupTimer.unref?.();

  const handler = ((req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const rawKey = options.keyGenerator ? options.keyGenerator(req) : resolveClientIp(req);
    const bucketKey = `${options.name}:${rawKey}`;

    let bucket = buckets.get(bucketKey);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + options.windowMs };
      buckets.set(bucketKey, bucket);
    }

    bucket.count += 1;

    const remaining = Math.max(0, options.maxRequests - bucket.count);
    const resetEpochSeconds = Math.ceil(bucket.resetAt / 1000);
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

    res.setHeader("X-RateLimit-Limit", String(options.maxRequests));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(resetEpochSeconds));

    if (bucket.count > options.maxRequests) {
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        message: options.message || "Too many requests. Please wait before trying again.",
        retryAfterSeconds,
      });
    }

    return next();
  }) as ManagedRateLimiter;

  handler.reset = () => {
    buckets.clear();
  };

  activeLimiters.push(handler);
  return handler;
}

/**
 * Clears all registered rate-limiter buckets (primarily for test isolation).
 */
export function resetAllRateLimiters(): void {
  for (const limiter of activeLimiters) {
    limiter.reset();
  }
}

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

export const signupRateLimiter = createRateLimiter({
  name: "auth-signup",
  windowMs: FIFTEEN_MINUTES_MS,
  maxRequests: 10,
  message: "Too many signup attempts from this client. Please try again later.",
});

export const loginRateLimiter = createRateLimiter({
  name: "auth-login",
  windowMs: FIFTEEN_MINUTES_MS,
  maxRequests: 15,
  message: "Too many login attempts from this client. Please try again later.",
});

export const verifyOtpRateLimiter = createRateLimiter({
  name: "auth-verify-otp",
  windowMs: FIFTEEN_MINUTES_MS,
  maxRequests: 10,
  message: "Too many OTP verification attempts. Please request a new code or try again later.",
});

export const forgotPasswordRateLimiter = createRateLimiter({
  name: "auth-forgot-password",
  windowMs: FIFTEEN_MINUTES_MS,
  maxRequests: 5,
  message: "Too many password reset requests. Please try again later.",
});

export const resetPasswordRateLimiter = createRateLimiter({
  name: "auth-reset-password",
  windowMs: FIFTEEN_MINUTES_MS,
  maxRequests: 10,
  message: "Too many password reset attempts. Please try again later.",
});

