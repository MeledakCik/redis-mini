// lib/quota.js — Task 3: limit per akun free tier = 1 Redis + 1 Vector + 500MB storage total.
// Payment gateway: limit sekarang plan-aware (free vs pro), lihat lib/plan-store.js.
import { readInstancesForUser } from "@/lib/store";
import { readVectorInstancesForUser } from "@/lib/vector-store";
import { getProviderForInstance } from "@/lib/infra";
import { getPlan } from "@/lib/plan-store";

// Tetap diekspor sebagai default FREE tier (dipakai di tempat yang belum plan-aware,
// dan sebagai fallback kalau user gak punya email/plan).
export const MAX_REDIS_PER_USER = 1;
export const MAX_VECTOR_PER_USER = 1;
export const MAX_STORAGE_BYTES = 500 * 1024 * 1024; // 500MB

// Pro plan cap — "unlimited" di marketing copy (app/billing/page.js) tapi tetap dikasih
// batas atas praktis biar gak ada cara buat provisioning tanpa batas di 1 VPS shared.
export const PRO_MAX_REDIS_PER_USER = 20;
export const PRO_MAX_VECTOR_PER_USER = 20;
export const PRO_MAX_STORAGE_BYTES = 10 * 1024 * 1024 * 1024; // 10GB

export function getLimitsForPlan(plan) {
  if (plan === "pro") {
    return { maxRedis: PRO_MAX_REDIS_PER_USER, maxVector: PRO_MAX_VECTOR_PER_USER, maxStorage: PRO_MAX_STORAGE_BYTES };
  }
  return { maxRedis: MAX_REDIS_PER_USER, maxVector: MAX_VECTOR_PER_USER, maxStorage: MAX_STORAGE_BYTES };
}

// Ambil status plan sekaligus limit numeriknya buat 1 user — dipakai app/api/quota,
// canCreateInstance, dan assertStorageAvailable biar konsisten satu sumber.
export function getPlanAndLimits(email) {
  const { plan, expiresAt } = getPlan(email);
  return { plan, expiresAt, ...getLimitsForPlan(plan) };
}

// Approx bytes per vector float (4 bytes) + ~15% overhead untuk payload/index Qdrant,
// dipakai juga oleh app/api/vector/[id]/stats/route.js supaya angkanya konsisten.
export function approxVectorBytes(pointsCount, dimension) {
  return Math.round(pointsCount * (dimension || 0) * 4 * 1.15);
}

export function canCreateInstance(userId, type, email) {
  const { maxRedis, maxVector } = getPlanAndLimits(email);
  const redisCount = readInstancesForUser(userId).length;
  const vectorCount = readVectorInstancesForUser(userId).length;

  if (type === "redis" && redisCount >= maxRedis) {
    return { allowed: false, reason: "redis_limit", count: redisCount, limit: maxRedis };
  }
  if (type === "vector" && vectorCount >= maxVector) {
    return { allowed: false, reason: "vector_limit", count: vectorCount, limit: maxVector };
  }
  return { allowed: true };
}

function limitResponse(reason, extra = {}) {
  const messages = {
    redis_limit: "Free plan limit: 1 Redis database per account. Upgrade to create more.",
    vector_limit: "Free plan limit: 1 Vector database per account. Upgrade to create more.",
    storage_limit: "Storage limit 500MB reached. Delete data or upgrade.",
  };
  return {
    error: reason === "storage_limit" ? "STORAGE_LIMIT" : "LIMIT_REACHED",
    message: messages[reason] || "Free plan limit reached.",
    limit: reason === "storage_limit" ? MAX_STORAGE_BYTES : 1,
    upgradeUrl: "/billing",
    ...extra,
  };
}
export { limitResponse };

// Storage = sum bytes semua vector collection milik user (dihitung dari points_count x dimension)
// + approx memory Redis milik user (dari INFO memory / container stats, tergantung provider).
export async function getStorageUsage(userId) {
  let vectorBytes = 0;
  let redisBytes = 0;

  const { getCollectionInfo, isQdrantReachable } = await import("@/lib/qdrant");
  const vectorInstances = readVectorInstancesForUser(userId);
  if (vectorInstances.length && (await isQdrantReachable())) {
    for (const inst of vectorInstances) {
      try {
        const info = await getCollectionInfo(inst.name);
        const pointsCount = info?.result?.points_count ?? 0;
        vectorBytes += approxVectorBytes(pointsCount, inst.dimension);
      } catch {
        // collection belum ada / gak reachable, dianggap 0 dulu
      }
    }
  }

  const redisInstances = readInstancesForUser(userId);
  for (const inst of redisInstances) {
    try {
      // Task refactor: tiap instance dicek lewat provider yang benar-benar dipakai waktu
      // dibuat (acl/external/docker bisa campur untuk akun yang sama kalau ada data lama).
      const { memoryUsageBytes } = await getProviderForInstance(inst).getRedisLiveStatus(inst);
      if (memoryUsageBytes) redisBytes += memoryUsageBytes;
    } catch {}
  }

  return { total: vectorBytes + redisBytes, vectorBytes, redisBytes };
}

export async function assertStorageAvailable(userId, email) {
  const { maxStorage } = getPlanAndLimits(email);
  const usage = await getStorageUsage(userId);
  if (usage.total >= maxStorage) {
    return { allowed: false, usage: usage.total, response: limitResponse("storage_limit", { usage: usage.total, limit: maxStorage }) };
  }
  return { allowed: true, usage: usage.total };
}
