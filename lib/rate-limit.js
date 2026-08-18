import { NextResponse } from "next/server";
import Redis from "ioredis";

// Rate limiter punya 2 backend:
//  - REDIS_URL diisi (mis. Redis internal Railway) -> pakai SETNX+EXPIRE, sliding-ish window
//    yang survive restart/multi-instance.
//  - REDIS_URL kosong -> fallback in-memory (Map di globalThis) seperti sebelumnya, cukup
//    untuk local/VPS single-instance dan otomatis reset kalau dev server di-restart.
const limits = globalThis.__miniUpstashRateLimits || (globalThis.__miniUpstashRateLimits = new Map());

let _rlRedis;
function getRateLimitRedis() {
  if (!process.env.REDIS_URL) return null;
  if (!_rlRedis) {
    _rlRedis = globalThis.__miniUpstashRateLimitRedis;
    if (!_rlRedis) {
      _rlRedis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 2000, lazyConnect: false });
      _rlRedis.on("error", () => {}); // jangan crash proses kalau Redis rate-limit lagi mati
      globalThis.__miniUpstashRateLimitRedis = _rlRedis;
    }
  }
  return _rlRedis;
}

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

// Aturan sesuai request: maksimal 2x untuk aksi berat.
// per: "user" -> key dibatasi per userId saja. "user+id" -> per userId + id resource spesifik.
const RULES = {
  "redis:create": { max: 2, windowMs: HOUR, label: "Create Redis", per: "user" },
  "vector:create": { max: 2, windowMs: HOUR, label: "Create Vector", per: "user" },
  "redis:restart": { max: 2, windowMs: 10 * MIN, label: "Restart Redis", per: "user+id" },
  "vector:restart": { max: 2, windowMs: 10 * MIN, label: "Restart Vector", per: "user+id" },
  "redis:delete": { max: 2, windowMs: 10 * MIN, label: "Delete Redis", per: "user" },
  "vector:delete": { max: 2, windowMs: 10 * MIN, label: "Delete Vector", per: "user" },
  "redis:flush": { max: 2, windowMs: 10 * MIN, label: "Flush Redis", per: "user+id" },
  "vector:flush": { max: 2, windowMs: 10 * MIN, label: "Flush Vector", per: "user+id" },
};

function windowLabel(ms) {
  if (ms % HOUR === 0) return `${ms / HOUR} jam`;
  return `${Math.round(ms / MIN)} menit`;
}

function limitExceededResponse(rule, retryAfterMs) {
  const retryMinutes = Math.max(1, Math.ceil(retryAfterMs / MIN));
  return {
    allowed: false,
    retryAfterMs,
    response: NextResponse.json(
      {
        error: `Rate limit: Modul ${rule.label} hanya boleh ${rule.max}x per ${windowLabel(
          rule.windowMs
        )}. Coba lagi dalam ${retryMinutes} menit.`,
      },
      { status: 429 }
    ),
  };
}

// module: salah satu key di RULES. userId: session.user.id. id: opsional, resource id (buat rule "user+id").
export async function checkRateLimit(module, userId, id = null) {
  const rule = RULES[module];
  if (!rule) return { allowed: true };

  const key = rule.per === "user+id" ? `${userId}:${module}:${id}` : `${userId}:${module}`;
  const redis = getRateLimitRedis();

  if (redis) {
    // Backend Redis (dipakai kalau REDIS_URL diisi, khas Railway): counter fixed-window
    // pakai SETNX+EXPIRE — persist lintas restart & lintas instance app.
    try {
      const redisKey = `ratelimit:${key}`;
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.expire(redisKey, Math.ceil(rule.windowMs / 1000));
      }
      if (count > rule.max) {
        const ttlMs = (await redis.pttl(redisKey)) || rule.windowMs;
        return limitExceededResponse(rule, ttlMs);
      }
      return { allowed: true };
    } catch (err) {
      console.error("Rate-limit Redis error, fallback ke in-memory:", err.message);
      // jatuh ke in-memory di bawah kalau Redis lagi bermasalah
    }
  }

  const now = Date.now();
  const arr = (limits.get(key) || []).filter((ts) => now - ts < rule.windowMs);

  if (arr.length >= rule.max) {
    const oldest = arr[0];
    return limitExceededResponse(rule, rule.windowMs - (now - oldest));
  }

  arr.push(now);
  limits.set(key, arr);
  return { allowed: true };
}

// Bersihin entry basi biar Map gak terus membesar selama dev server hidup lama.
if (!globalThis.__miniUpstashRateLimitSweeper) {
  globalThis.__miniUpstashRateLimitSweeper = setInterval(() => {
    const now = Date.now();
    for (const [key, arr] of limits.entries()) {
      const kept = arr.filter((ts) => now - ts < HOUR);
      if (kept.length === 0) limits.delete(key);
      else limits.set(key, kept);
    }
  }, 5 * MIN);
  globalThis.__miniUpstashRateLimitSweeper.unref?.();
}
