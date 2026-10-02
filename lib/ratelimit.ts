import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

type LimitResult = Awaited<ReturnType<Ratelimit["limit"]>>;

let loginRateLimit: Ratelimit | null | undefined;

function getLoginRateLimit(): Ratelimit | null {
  if (loginRateLimit !== undefined) return loginRateLimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    loginRateLimit = null;
    return null;
  }

  loginRateLimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    prefix: "ratelimit:login",
    analytics: true,
  });

  return loginRateLimit;
}

export async function limitLogin(identifier: string): Promise<LimitResult> {
  const limiter = getLoginRateLimit();

  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Rate limiting Redis non configurato.");
    }

    return {
      success: true,
      limit: 5,
      remaining: 5,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    };
  }

  return limiter.limit(identifier);
}
