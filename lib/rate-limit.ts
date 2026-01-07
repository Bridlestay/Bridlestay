/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or Upstash
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (clears on server restart)
const store = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  maxRequests: number; // Max requests per window
  windowMs: number; // Window in milliseconds
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given identifier
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;

  let entry = store.get(key);

  // If no entry or window has passed, create new entry
  if (!entry || now > entry.resetAt) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    };
  }

  entry.count++;
  store.set(key, entry);

  const remaining = Math.max(0, config.maxRequests - entry.count);
  const success = entry.count <= config.maxRequests;

  return {
    success,
    limit: config.maxRequests,
    remaining,
    resetAt: entry.resetAt,
  };
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Auth endpoints (stricter)
  auth: {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },

  // Password reset (very strict)
  passwordReset: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },

  // General API
  api: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },

  // Booking creation
  booking: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
  },

  // Message sending
  messages: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
  },

  // File uploads
  upload: {
    maxRequests: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
  },

  // Search
  search: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
  },

  // Referral code generation
  referral: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
};

/**
 * Get identifier from request (IP or user ID)
 */
export function getIdentifier(request: Request, userId?: string): string {
  // Prefer user ID if available (more accurate)
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `ip:${ip}`;
}

/**
 * Create rate limit response headers
 */
export function rateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();
  headers.set("X-RateLimit-Limit", result.limit.toString());
  headers.set("X-RateLimit-Remaining", result.remaining.toString());
  headers.set("X-RateLimit-Reset", result.resetAt.toString());
  return headers;
}

/**
 * Rate limit error response
 */
export function rateLimitError(result: RateLimitResult): Response {
  const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      error: "Too many requests",
      message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": retryAfter.toString(),
        ...Object.fromEntries(rateLimitHeaders(result)),
      },
    }
  );
}

// Cleanup old entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

